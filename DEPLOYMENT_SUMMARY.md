# Richco App Deployment Summary

## What's Done ✅

### Code Changes
1. **`.env`** — Added Azure AD and Dataverse environment variables
2. **`src/services/dataverse.ts`** — Added `fetchSites()` to fetch active job sites
3. **`src/screens/HomeScreen.tsx`** — Added site picker modal before clock-in
4. **`src/store/appStore.ts`** — Wired Dataverse API calls into all clock actions:
   - `clockIn` → creates entry in Dataverse
   - `startBreak` → records break start time
   - `endBreak` → records break end + duration
   - `clockOut` → calculates and saves final hours (raw, paid, overtime)
   - Fixed bug: break events now use `currentUserAadId` from store instead of mock user

5. **`src/services/powerAutomate.ts`** — Fixed TypeScript type casting for all payload types

### Configuration & Documentation
6. **`staticwebapp.config.json`** — SPA routing config for Azure Static Web Apps
7. **`POWERAUTOMATE.md`** — Complete guide for Wednesday/Friday report flows
8. **`AZURE_DEPLOYMENT.md`** — Step-by-step deployment instructions for Azure Static Web Apps
9. **Built `dist/` folder** — Production-ready app ready to deploy

---

## What the App Does Now

### Field Guys (Workers)
1. ✅ **Login** with Microsoft AD account (OAuth)
2. ✅ **Clock In:**
   - Select job site from dropdown (fetched from Dataverse)
   - GPS location automatically captured
   - Entry created in Dataverse `richco_timeentries` table
3. ✅ **Take Breaks:**
   - Tap "Break" while clocked in
   - Break start/end times recorded in Dataverse
4. ✅ **Clock Out:**
   - Select vehicle, enter shift summary and concerns
   - Hours calculated:
     - **Raw hours** = elapsed time - actual breaks
     - **Paid hours** = raw hours - 1h mandatory OSHA break (0.5h for overnights)
     - **Overtime** = hours beyond 8
   - Entry finalized in Dataverse

### Supervisors (Power Automate Reports)
- **Wednesday 7am:** Email with current week hours (Sat–Wed) + previous week totals
- **Friday 5pm:** Email with final week summary (Sat–Fri)
- Both reports: group by employee, show raw hours, paid hours, breaks

### Mobile/PWA
- ✅ Responsive design already built
- ✅ PWA manifest configured (app name, theme color, offline support)
- ✅ Service worker handles offline caching
- ✅ Installable as app on Android and iOS ("Add to Home Screen")

---

## How to Deploy (2-Day Window)

### Today (Before EOD)
1. **Read** `AZURE_DEPLOYMENT.md` in the project root
2. **Create Azure Static Web App** (5 min in portal)
3. **Deploy `dist/` folder** using Azure CLI (command in guide)
4. **Update Azure AD** with production URL in app registration
5. **Set env vars** in Azure Static Web Apps → Configuration
6. **Test in browser** — login, clock in/out, check Dataverse entries

### Tomorrow
- Test PWA install on phone
- Set up Power Automate Wed/Fri flows (documented in `POWERAUTOMATE.md`)
- Verify Dataverse entries appear correctly

---

## Data Flow

```
Field Guy Phone App
        ↓
[Login with Azure AD]
        ↓
[Clock In] → Dataverse richco_timeentries (richco_clockintime, richco_projectid, GPS)
        ↓
[Break Start] → Dataverse update (richco_breakstart)
        ↓
[Break End] → Dataverse update (richco_breakend, richco_breakduration)
        ↓
[Clock Out] → Dataverse update (richco_clockouttime, hours, overtime, vehicle, notes)
        ↓
[Wed/Fri] → Power Automate → Query Dataverse → Group by employee → Email report
```

---

## Environment Variables (Already in `.env`)

```
VITE_AZURE_CLIENT_ID=e9b090d5-e7a1-43c2-abe3-761a64c828f9
VITE_AZURE_TENANT_ID=59114aa8-a5cf-4ff9-9edd-affc40d640a9
VITE_DATAVERSE_ORG=richcogroup
VITE_OPENWEATHER_KEY=fb0a84cc155d4e887a75225ed1c43542
```

These same values **must be added to Azure Static Web Apps → Configuration → Application settings** for production.

---

## Files Modified/Created

### Modified
- `.env` — env vars
- `src/services/dataverse.ts` — fetchSites()
- `src/services/powerAutomate.ts` — type casting fixes
- `src/store/appStore.ts` — Dataverse sync, break event fix
- `src/screens/HomeScreen.tsx` — site picker UI

### Created
- `staticwebapp.config.json` — Azure SPA routing
- `POWERAUTOMATE.md` — report flow guidance
- `AZURE_DEPLOYMENT.md` — deployment steps
- `dist/` folder — production bundle (ready to deploy)

---

## Next Steps for You

1. **Follow `AZURE_DEPLOYMENT.md`** to get the app live
2. **Test login and time tracking** to verify Dataverse integration
3. **Set up Power Automate flows** using the queries in `POWERAUTOMATE.md`
4. **Share the production URL** with field guys (they'll see PWA install prompt on mobile)

Good luck! 🚀
