// Supabase Edge Function to send push notifications
// Deploy with: supabase functions deploy send-push-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PushPayload {
  to_email: string // Recipient email
  title: string
  body: string
  icon?: string
  tag?: string
  screen?: string // Screen to navigate to on click
  id?: string // ID of item (message thread, shift, etc.)
}

// Initialize Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')

if (!VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  throw new Error('Missing VAPID environment variables')
}

/**
 * Send push notification to a user via all their subscribed devices
 */
Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const payload: PushPayload = await req.json()

    console.log('[PushNotification] Sending to:', payload.to_email)

    // Get all subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('email', payload.to_email)

    if (subError) {
      console.error('[PushNotification] Error fetching subscriptions:', subError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[PushNotification] No subscriptions found for:', payload.to_email)
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check notification preference
    let preference: string | null = null
    if (payload.tag === 'message') {
      preference = 'notify_messages'
    } else if (payload.tag === 'mention') {
      preference = 'notify_mentions'
    } else if (payload.tag === 'shift') {
      preference = 'notify_shifts'
    } else if (payload.tag === 'roster') {
      preference = 'notify_roster'
    } else if (payload.tag === 'leave_request') {
      preference = 'notify_leave_requests'
    }

    // Send to each subscription
    let sentCount = 0
    const errors: string[] = []

    for (const sub of subscriptions) {
      // Check preference
      if (preference && !sub[preference]) {
        console.log(`[PushNotification] User opted out of ${preference}`)
        continue
      }

      try {
        await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth_key,
              p256dh: sub.p256dh_key,
            },
          },
          payload
        )
        sentCount++
        console.log('[PushNotification] ✅ Sent to subscription:', sub.id)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[PushNotification] ❌ Error sending to subscription:', errMsg)
        errors.push(errMsg)
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (err) {
    console.error('[PushNotification] Exception:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})

/**
 * Send Web Push notification using Web Push Protocol
 */
async function sendWebPush(
  subscription: {
    endpoint: string
    keys: {
      auth: string
      p256dh: string
    }
  },
  payload: PushPayload
) {
  // Build notification data
  const notificationData = {
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'notification',
    data: {
      url: payload.id ? `/?screen=${payload.screen}&id=${payload.id}` : undefined,
      screen: payload.screen,
      id: payload.id,
    },
  }

  const message = JSON.stringify(notificationData)

  // Sign the request using VAPID
  const vapidHeaders = generateVAPIDHeaders(
    subscription.endpoint,
    VAPID_SUBJECT,
    VAPID_PRIVATE_KEY
  )

  console.log('[PushNotification] Sending to endpoint:', subscription.endpoint)

  // Send encrypted push to the push service
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Urgency': 'high',
      ...vapidHeaders,
    },
    body: encryptMessage(message, subscription.keys.p256dh, subscription.keys.auth),
  })

  if (!response.ok) {
    throw new Error(
      `Push service error: ${response.status} ${response.statusText}`
    )
  }

  return response
}

/**
 * Generate VAPID headers for push authentication
 */
function generateVAPIDHeaders(endpoint: string, subject: string, privateKey: string): Record<string, string> {
  // For now, implement basic VAPID signing
  // In a production environment, you'd use a proper JWT library
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // Valid for 1 hour

  // This is a simplified version - in production, use proper JWT signing
  const vapidToken = encodeURIComponent(
    btoa(JSON.stringify({
      aud: endpoint.split('/').slice(0, 3).join('/'),
      exp,
      sub: subject,
    }))
  )

  return {
    'Authorization': `vapid t=${vapidToken}, k=${privateKey}`,
  }
}

/**
 * Simple message encryption (placeholder - use proper encryption in production)
 */
function encryptMessage(message: string, p256dh: string, auth: string): Uint8Array {
  // For this implementation, we'll send the message unencrypted as a placeholder
  // In production, implement proper AES-128-GCM encryption with the subscriber's public keys
  const encoder = new TextEncoder()
  return encoder.encode(message)
}
