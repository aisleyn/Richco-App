# Push Notifications Setup Guide

This guide explains how to set up push notifications for the Richco app using Web Push API and Supabase Edge Functions.

## Prerequisites

- Node.js installed locally
- Supabase CLI installed (`npm install -g supabase`)
- Web Push library: `npm install web-push`

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required to send push notifications.

Run this command locally:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

## Step 2: Add Environment Variables

### For the App (Client)
Add to `.env` or `.env.local`:

```env
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

### For Supabase Edge Functions (Server)
Add to Supabase project settings → Environment Variables:

```
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
```

## Step 3: Create Edge Function

Run locally:

```bash
supabase functions new send-push-notification
```

This creates `supabase/functions/send-push-notification/index.ts`.

Copy the implementation from `src/services/edgeFunctions/sendPushNotification.ts` into that file.

## Step 4: Deploy Edge Function

```bash
supabase functions deploy send-push-notification
```

## Step 5: Database Migration

Run the migration to create the `notification_subscriptions` table:

```bash
# Via Supabase Studio → SQL Editor
COPY the contents of migrations/032_create_notification_subscriptions.sql
```

## Step 6: Test Push Notifications

1. Open the app in a browser that supports push notifications (Chrome, Firefox, Edge)
2. Look for a notification permission prompt
3. Grant permission
4. Send a DM to yourself from another user
5. You should receive a push notification

## Notification Events

The system supports notifications for:

- **Direct Messages**: When you receive a DM
- **Group Chat Messages**: When new message in group
- **Mentions**: When someone mentions you with @
- **Shift Alerts**: 15 min before shift start, at shift end
- **Roster Changes**: When schedule is updated
- **Leave Request Answers**: When leave request approved/denied

## User Preferences

Each user can control which notifications they receive in Settings → Notifications.

## Troubleshooting

### Notifications not appearing

1. **Check browser support**: 
   - Chrome, Firefox, Edge: ✅ Supported
   - Safari: ❌ Not supported

2. **Check permission**: Browser → Settings → Site Permissions → Notifications

3. **Check service worker**: 
   - Open DevTools → Application → Service Workers
   - Should show "active and running"

4. **Check console**: 
   - DevTools → Console
   - Look for `[PushNotifications]` logs

### Edge Function not deploying

```bash
# Check function logs
supabase functions list
supabase functions download send-push-notification

# Redeploy
supabase functions deploy send-push-notification --no-verify-jwt
```

## References

- [Web Push API Spec](https://www.w3.org/TR/push-api/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [web-push Library](https://github.com/web-push-libs/web-push)
