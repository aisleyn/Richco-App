# 🔔 Push Notifications Setup Guide

## ✅ Completed Steps

### 1. VAPID Keys Generated ✓
- **Public Key**: `BKYvDgEEdPuCmPu9wCuFD9yJRve85w1WMaCAKMcM1r60kHt8wngih1auxsudY81QMedpN-wSwMwH6HuEf-89qa8`
- **Private Key**: `ceq00gzj_LBtbyT14i29Ui_sNgtyJtRhnhRQlU3YWKs` ← **Keep this secret!**
- **Subject**: `mailto:nolanaisley@gmail.com`

### 2. Local Environment Updated ✓
- `.env` now includes VAPID public key
- `.env.example` updated with instructions
- GitHub workflow (deploy.yml) updated to pass VAPID public key

### 3. Supabase Function Updated ✓
- `supabase/functions/send-push-notification/index.ts` now sends actual push notifications
- Implements VAPID header generation
- Ready for deployment

## 📝 Next Steps (Manual)

### Step 1: Add Private Key to GitHub Secrets
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. **Name**: `VITE_VAPID_PRIVATE_KEY`
4. **Value**: `ceq00gzj_LBtbyT14i29Ui_sNgtyJtRhnhRQlU3YWKs`
5. Click "Add secret"

### Step 2: Set up Supabase Edge Function Environment Variables
The Supabase function needs these env vars to send push notifications:

```bash
# Run from richco-app directory:
supabase secrets set VAPID_PRIVATE_KEY=ceq00gzj_LBtbyT14i29Ui_sNgtyJtRhnhRQlU3YWKs
supabase secrets set VAPID_SUBJECT=mailto:nolanaisley@gmail.com
```

### Step 3: Deploy Updated Supabase Function
```bash
supabase functions deploy send-push-notification
```

### Step 4: Test the Setup
1. Push a commit to trigger the GitHub Actions deploy
2. Once deployed, open the app at https://richco-app-azure-url.com
3. You should see a browser notification permission prompt
4. Grant permission to enable push notifications

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│ Browser App                             │
│ - Requests notification permission      │
│ - Registers service worker              │
│ - Subscribes with VAPID public key      │
│ - Stores subscription in DB             │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴───────────────────┐
        │ Supabase DB              │
        │ notification_subscriptions│
        │ (endpoint, keys)         │
        └──────────────────────────┘
               │
        ┌──────┴─────────────────────────────┐
        │ Supabase Edge Function              │
        │ send-push-notification              │
        │ - Uses VAPID private key to sign    │
        │ - Sends to push service             │
        │ - Respects user preferences        │
        └──────────────┬─────────────────────┘
                       │
        ┌──────────────┴─────────────────────┐
        │ Browser Push Service                │
        │ (FCM, APNs, etc)                    │
        │ - Delivers to user devices          │
        └─────────────────────────────────────┘
```

## 🧪 Testing Checklist

- [ ] GitHub secret `VITE_VAPID_PRIVATE_KEY` added
- [ ] Supabase secrets set (VAPID_PRIVATE_KEY, VAPID_SUBJECT)
- [ ] `supabase functions deploy send-push-notification` completed
- [ ] Code pushed to main branch (triggers deploy)
- [ ] App deploys successfully to Azure
- [ ] Browser asks for notification permission
- [ ] Test message creates notification in browser
- [ ] Clicking notification navigates to correct screen

## ⚠️ Debugging

### "Push notifications not supported" message
- Check that VITE_VAPID_PUBLIC_KEY is in environment
- Verify service worker is registered
- Check browser supports Push API (Chrome, Firefox, Edge, etc.)

### Notifications not arriving
- Check Supabase function logs: `supabase functions logs send-push-notification`
- Verify subscription record exists in `notification_subscriptions` table
- Check browser console for errors
- Ensure private key is correctly set in Supabase secrets

### "Missing VAPID environment variables" in function logs
- Run `supabase secrets set` commands above
- Wait a few seconds for secrets to propagate
- Redeploy function: `supabase functions deploy send-push-notification`

## 📚 References

- [Web Push Protocol (RFC 8188)](https://tools.ietf.org/html/draft-thomson-webpush-protocol)
- [VAPID for Web Push](https://tools.ietf.org/html/rfc8292)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
