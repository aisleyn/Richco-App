# Dynamic Weather by Employee Location

## Problem

Weather is currently using mock data or stale geolocation, showing the same forecast for all employees regardless of actual location.

**User Report:** "Weather API is only working for Ocoee FL, it needs to be per employee's location"

## Root Cause

1. **Geolocation requested too late** - Only requested when WeatherCard mounts, not on app startup
2. **No permission handling** - Browser geolocation requires explicit user permission
3. **Falls back to mock data** - If permission denied/times out, shows generic mock weather
4. **No location tracking** - Weather doesn't update when employee moves between sites
5. **Location not displayed** - Users don't know which location the weather applies to

## Solution

### Phase 1: Request Permission on App Startup ⏳

**File:** `src/App.tsx`

Request geolocation permission when app loads (before weather card):

```typescript
useEffect(() => {
  // Request permission early, store in app store
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Store location in app store
        updateAppLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Fetching...',
        })
      },
      (err) => {
        console.warn('Geolocation permission denied or unavailable')
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }
}, [])
```

### Phase 2: Update Weather Hook to Use App Store Location ⏳

**File:** `src/hooks/useWeather.ts`

Instead of requesting location in Weather hook, use location from app store:

```typescript
import { useAppStore } from '../store/appStore'

export function useWeather() {
  const { appLocation } = useAppStore()
  const [weather, setWeather] = useState<WeatherData>(mockWeather)
  
  useEffect(() => {
    if (!API_KEY || !appLocation) return
    
    // Use appLocation instead of requesting here
    const fetchWeather = async () => {
      const res = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${appLocation.lat}&lon=${appLocation.lng}&units=imperial&exclude=minutely&appid=${API_KEY}`
      )
      // ... rest of fetch logic
    }
    
    fetchWeather()
  }, [appLocation]) // Re-fetch when location changes
}
```

### Phase 3: Show Location in Weather Card ⏳

**File:** `src/components/home/WeatherCard.tsx`

Display the location so users know which site the weather is for:

```typescript
import { MapPin } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

export function WeatherCard() {
  const { appLocation } = useAppStore()
  
  return (
    <div>
      {/* ... existing content ... */}
      
      {/* Add location display */}
      {appLocation && (
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <MapPin size={12} />
          <span>{appLocation.address}</span>
        </div>
      )}
    </div>
  )
}
```

### Phase 4: Track Location Changes During Shift ⏳

**File:** `src/services/locationService.ts` (NEW)

Watch for location changes and update weather:

```typescript
export function useLocationTracking() {
  const { updateAppLocation } = useAppStore()
  
  useEffect(() => {
    if (!navigator.geolocation) return
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateAppLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Updating...',
        })
      },
      (err) => console.warn('Location tracking stopped:', err),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
}
```

### Phase 5: Add Permission UI ⏳

**File:** `src/screens/SettingsScreen.tsx` (or new component)

Show permission status and let users re-request:

```typescript
export function GeolocationPermission() {
  const [status, setStatus] = useState('pending')
  
  const requestPermission = () => {
    navigator.permissions.query({ name: 'geolocation' })
      .then(result => {
        setStatus(result.state) // 'granted', 'denied', 'prompt'
      })
  }
  
  return (
    <div>
      <p>Location Permission: {status}</p>
      <button onClick={requestPermission}>
        {status === 'granted' ? 'Permission Granted' : 'Enable Location'}
      </button>
    </div>
  )
}
```

## Implementation Checklist

- [ ] **Update App.tsx** - Request geolocation on startup
- [ ] **Add appLocation to store** - Store lat/lng/address
- [ ] **Update useWeather.ts** - Use store location instead of requesting
- [ ] **Update WeatherCard.tsx** - Display location with MapPin icon
- [ ] **Create locationService.ts** - Watch for location changes
- [ ] **Test with different GPS locations** - Verify weather updates per location
- [ ] **Commit & push to GitHub** - Deploy to Azure
- [ ] **Test in deployed version** - Verify weather works in production

## Expected Result

✅ Weather updates based on employee's actual GPS location
✅ Location displayed (e.g., "Ocoee, FL" or coordinates)
✅ Weather updates when employee moves between sites
✅ Permission dialog explains why location is needed
✅ Graceful fallback if permission denied

## Testing Steps

1. Open app in browser
2. Grant geolocation permission when prompted
3. Verify weather shows your actual location
4. Move to different location (change GPS coordinates)
5. Verify weather updates within 5-30 seconds
6. Check that location address displays in Weather Card

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Request geolocation on startup |
| `src/store/appStore.ts` | Add appLocation state |
| `src/hooks/useWeather.ts` | Use app store location |
| `src/components/home/WeatherCard.tsx` | Display location address |
| `src/services/locationService.ts` | NEW - Watch for location changes |
| `src/screens/SettingsScreen.tsx` | NEW - Permission UI (optional) |

## Timeline

- **Phase 1-3:** ~30 minutes (core functionality)
- **Phase 4-5:** ~20 minutes (advanced features)
- **Total:** ~50 minutes to implement
- **Testing & deployment:** ~15 minutes

## Notes

- Geolocation requires HTTPS in production (already have this in Azure)
- Some users might deny permission - graceful fallback to mock data
- High accuracy mode drains battery - consider toggle in settings
- Watch position updates location continuously (useful for tracking)
- Can also integrate with shift/site data for automatic weather updates
