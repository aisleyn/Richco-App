import { useState, useEffect } from 'react'

interface GeolocationData {
  lat: number
  lng: number
  address?: string
}

interface UseGeolocationReturn {
  location: GeolocationData | null
  error: string | null
  isLoading: boolean
  requestLocation: () => Promise<GeolocationData | null>
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getAddress = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      if (response.ok) {
        const data = await response.json()
        return data.address?.address || data.display_name
      }
    } catch (err) {
      console.warn('[Geolocation] Failed to fetch address:', err)
    }
    return undefined
  }

  const requestLocation = async (): Promise<GeolocationData | null> => {
    setIsLoading(true)
    setError(null)

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation not supported by this browser'
        setError(msg)
        setIsLoading(false)
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          const address = await getAddress(latitude, longitude)
          const loc: GeolocationData = {
            lat: latitude,
            lng: longitude,
            address,
          }
          setLocation(loc)
          setIsLoading(false)
          resolve(loc)
        },
        (err) => {
          let msg = 'Failed to get location'
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission denied. Please enable GPS in app settings.'
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location unavailable. Check GPS connection.'
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out'
          }
          setError(msg)
          console.error('[Geolocation] Error:', msg, err)
          setIsLoading(false)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  return { location, error, isLoading, requestLocation }
}
