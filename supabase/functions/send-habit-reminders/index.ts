// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple web push implementation using fetch
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // For web push we need to use the web-push library
  // Since it's complex to implement from scratch, we'll use a simpler approach
  // by calling an external service or implementing basic push
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload,
  })
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Push failed: ${response.status} - ${text}`)
  }
  
  return response
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      throw subError
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Import web-push dynamically to avoid type issues
    const webpush = await import('https://esm.sh/web-push@3.6.7?target=deno')
    
    // Configure web-push
    webpush.default.setVapidDetails(
      'mailto:notifications@us-better.lovable.app',
      vapidPublicKey,
      vapidPrivateKey
    )

    const results = []

    for (const sub of subscriptions) {
      try {
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

        if (incompleteHabits.length === 0) {
          continue // All habits completed
        }

        // Send push notification
        const pushSubscription = {
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

        await webpush.default.sendNotification(pushSubscription, payload)
        results.push({ userId: sub.user_id, status: 'sent', incompleteCount: incompleteHabits.length })

      } catch (err: any) {
        console.error(`Error processing subscription ${sub.id}:`, err)
        
        // If subscription is expired or invalid, delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          results.push({ userId: sub.user_id, status: 'deleted', reason: 'expired' })
        } else {
          results.push({ userId: sub.user_id, status: 'error', error: err.message })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-habit-reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})