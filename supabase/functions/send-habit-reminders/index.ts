import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushNotification, type PushSubscription } from '../_shared/webpush.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Normalize keys (avoid hidden whitespace/newlines causing VAPID mismatches)
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

    console.log('Starting push notification job...', isTest ? '(TEST MODE)' : '')
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
          body: 'Push notifications are working! You\'ll receive reminders at 7 PM IST.',
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

        // Get user's habits that are active today
        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('id, title')
          .eq('user_id', sub.user_id)
          .lte('start_date', today)
          .gte('end_date', today)

        if (habitsError) {
          console.error(`Error fetching habits for user ${sub.user_id}:`, habitsError)
          continue
        }

        console.log(`Found ${habits?.length || 0} active habits for user ${sub.user_id}`)

        if (!habits || habits.length === 0) {
          continue // No active habits for this user
        }

        // Get today's check-ins for this user's habits
        const habitIds = habits.map(h => h.id)
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
        const incompleteHabits = habits.filter(h => !completedHabitIds.has(h.id))

        console.log(`Incomplete habits: ${incompleteHabits.length}`)

        if (incompleteHabits.length === 0) {
          results.push({ userId: sub.user_id, status: 'skipped', reason: 'all_complete' })
          continue // All habits completed
        }

        // Send push notification using native implementation
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        }

        const payload = JSON.stringify({
          title: '🌱 Don\'t forget your habits!',
          body: `You have ${incompleteHabits.length} incomplete habit${incompleteHabits.length > 1 ? 's' : ''} today. Keep your streak going!`,
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
      JSON.stringify({ success: true, results }),
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
