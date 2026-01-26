import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotification, type PushSubscription } from '../_shared/webpush.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get current hour in IST (UTC+5:30)
function getCurrentISTHour(): string {
  const now = new Date()
  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000
  const istTime = new Date(now.getTime() + istOffset)
  const hours = istTime.getUTCHours().toString().padStart(2, '0')
  return `${hours}:00`
}

// Check if current time matches any reminder time (with 30 min tolerance)
function shouldSendReminder(reminderTimes: string[], currentHour: string): boolean {
  const currentHourNum = parseInt(currentHour.split(':')[0])
  
  return reminderTimes.some(time => {
    const reminderHour = parseInt(time.split(':')[0])
    // Match if within the same hour
    return reminderHour === currentHourNum
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()!

    // Check if this is a test request
    let isTest = false
    try {
      const body = await req.json()
      isTest = body?.test === true
    } catch {
      // No body or invalid JSON, not a test
    }

    const currentHour = getCurrentISTHour()
    console.log('Starting push notification job...', isTest ? '(TEST MODE)' : '')
    console.log('Current IST hour:', currentHour)
    console.log('VAPID keys configured:', !!vapidPublicKey && !!vapidPrivateKey)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    console.log('Today:', today)

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    console.log('Found subscriptions:', subscriptions?.length || 0)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TEST MODE: Send a test notification to all subscriptions
    if (isTest) {
      console.log('Test mode: sending test notification to all subscriptions')
      const results = []
      
      for (const sub of subscriptions) {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        }

        const payload = JSON.stringify({
          title: '🧪 Test Notification',
          body: 'Push notifications are working! You\'ll receive reminders based on your habit settings.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: {
            url: '/',
          },
        })

        console.log(`Sending test push to endpoint: ${sub.endpoint.substring(0, 50)}...`)
        
        const result = await sendPushNotification(
          pushSubscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )

        console.log(`Test push result:`, result)
        
        if (result.success) {
          results.push({ userId: sub.user_id, status: 'sent', statusCode: result.statusCode })
        } else {
          results.push({ 
            userId: sub.user_id, 
            status: 'error', 
            error: result.error,
            statusCode: result.statusCode
          })
        }
      }

      return new Response(
        JSON.stringify({ success: true, test: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const sub of subscriptions) {
      try {
        console.log(`Processing subscription for user ${sub.user_id}`)

        // Get user's habits that are active today AND have reminders enabled
        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('id, title, reminder_enabled, reminder_frequency, reminder_times')
          .eq('user_id', sub.user_id)
          .eq('reminder_enabled', true)
          .lte('start_date', today)
          .gte('end_date', today)

        if (habitsError) {
          console.error(`Error fetching habits for user ${sub.user_id}:`, habitsError)
          continue
        }

        console.log(`Found ${habits?.length || 0} habits with reminders for user ${sub.user_id}`)

        if (!habits || habits.length === 0) {
          continue // No habits with reminders for this user
        }

        // Filter habits that should be reminded at current hour
        const habitsToRemind = habits.filter(habit => {
          const times = habit.reminder_times || ['19:00']
          return shouldSendReminder(times, currentHour)
        })

        console.log(`Habits to remind at ${currentHour}: ${habitsToRemind.length}`)

        if (habitsToRemind.length === 0) {
          results.push({ userId: sub.user_id, status: 'skipped', reason: 'no_matching_time' })
          continue
        }

        // Get today's check-ins for habits that need reminding
        const habitIds = habitsToRemind.map(h => h.id)
        const { data: checkIns, error: checkInsError } = await supabase
          .from('daily_check_ins')
          .select('habit_id')
          .in('habit_id', habitIds)
          .eq('check_in_date', today)

        if (checkInsError) {
          console.error(`Error fetching check-ins for user ${sub.user_id}:`, checkInsError)
          continue
        }

        // Find incomplete habits
        const completedHabitIds = new Set(checkIns?.map(c => c.habit_id) || [])
        const incompleteHabits = habitsToRemind.filter(h => !completedHabitIds.has(h.id))

        console.log(`Incomplete habits: ${incompleteHabits.length}`)

        if (incompleteHabits.length === 0) {
          results.push({ userId: sub.user_id, status: 'skipped', reason: 'all_complete' })
          continue
        }

        // Send push notification
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        }

        // Create personalized message
        const habitTitles = incompleteHabits.slice(0, 2).map(h => h.title).join(', ')
        const moreCount = incompleteHabits.length > 2 ? ` +${incompleteHabits.length - 2} more` : ''

        const payload = JSON.stringify({
          title: '🌱 Habit Reminder',
          body: incompleteHabits.length === 1 
            ? `Don't forget: ${incompleteHabits[0].title}`
            : `${habitTitles}${moreCount} - Keep your streak going!`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: {
            url: '/',
          },
        })

        console.log(`Sending push to endpoint: ${sub.endpoint.substring(0, 50)}...`)
        
        const result = await sendPushNotification(
          pushSubscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )

        console.log(`Push result:`, result)

        if (result.success) {
          results.push({ 
            userId: sub.user_id, 
            status: 'sent', 
            incompleteCount: incompleteHabits.length,
            statusCode: result.statusCode
          })
        } else {
          // If subscription is expired or invalid, delete it
          if (result.statusCode === 410 || result.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            results.push({ userId: sub.user_id, status: 'deleted', reason: 'expired' })
          } else {
            results.push({ 
              userId: sub.user_id, 
              status: 'error', 
              error: result.error,
              statusCode: result.statusCode
            })
          }
        }

      } catch (err: unknown) {
        console.error(`Error processing subscription ${sub.id}:`, err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        results.push({ userId: sub.user_id, status: 'error', error: errorMessage })
      }
    }

    console.log('Push notification job completed. Results:', results)

    return new Response(
      JSON.stringify({ success: true, currentHour, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in send-habit-reminders:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
