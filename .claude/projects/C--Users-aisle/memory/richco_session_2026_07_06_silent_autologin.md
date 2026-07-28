---
name: session_2026_07_06_silent_autologin
description: Silent auto-login with device crew memory — login once per device, never again
metadata:
  type: project
---

## Silent Auto-Login with Device Crew Memory

**Status**: ✅ COMPLETE  
**Commit**: 6a03872d  
**Date**: 2026-07-06

### How It Works

1. **First login**: Crew member enters email/password
   - Supabase creates auth session token → stored in localStorage
   - Zustand store persists user data (email, name, ID) → stored in localStorage

2. **On subsequent visits**: App loads → checks localStorage for session
   - If valid session found → silently restores user (no login screen)
   - If no session → shows login screen

3. **Device memory**: Each device remembers its crew member
   - Works on Azure URLs (localStorage is domain-based, not hosting-based)
   - Token persists until manually logged out

### Switch Crew Member

If multiple people use the same device:
- Settings menu (bottom nav, last button labeled "Menu")
- Shows currently logged-in email
- "Switch Crew Member" button → logs out → allows different crew to login

### Why It Works

- **Supabase session persistence**: JS client uses localStorage by default for web
- **Zustand persist middleware**: Stores user data in localStorage automatically
- **App.tsx auto-check**: `checkUser()` runs on mount, silently restores session if found
- **No login flicker**: Loading spinner shows briefly, then silently logs in

### Implementation Notes

- Session check happens before any UI renders (line 76 in App.tsx)
- Token expiration: Supabase handles refresh automatically
- Device-specific: Works per-browser, per-device (not shared across devices)
- All data persisted locally: No cloud-based device binding needed
