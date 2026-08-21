// Google Places Autocomplete Service
// Provides address suggestions as user types
// Uses Supabase Edge Function proxy to avoid CORS issues

const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL

interface PlacePrediction {
  place_id: string
  description: string
  main_text: string
  secondary_text?: string
}

interface PlaceDetails {
  address: string
  lat: number
  lng: number
}

/**
 * Get address predictions as user types
 */
export async function getAddressPredictions(input: string): Promise<PlacePrediction[]> {
  if (!input.trim() || !SUPABASE_FUNCTION_URL) {
    return []
  }

  try {
    console.log('[GooglePlaces] Fetching predictions for:', input)

    const response = await fetch(
      `${SUPABASE_FUNCTION_URL}/google-places-proxy?` +
      `type=autocomplete&` +
      `input=${encodeURIComponent(input)}`
    )

    if (!response.ok) {
      console.error('[GooglePlaces] API error:', response.status)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.error('[GooglePlaces] Error:', data.error)
      return []
    }

    const predictions: PlacePrediction[] = (data.predictions || [])

    console.log('[GooglePlaces] ✅ Got', predictions.length, 'predictions')
    return predictions
  } catch (err) {
    console.error('[GooglePlaces] Exception fetching predictions:', err)
    return []
  }
}

/**
 * Get detailed information about a place (coordinates, formatted address)
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!placeId || !SUPABASE_FUNCTION_URL) {
    return null
  }

  try {
    console.log('[GooglePlaces] Fetching details for place:', placeId)

    const response = await fetch(
      `${SUPABASE_FUNCTION_URL}/google-places-proxy?` +
      `type=details&` +
      `place_id=${encodeURIComponent(placeId)}`
    )

    if (!response.ok) {
      console.error('[GooglePlaces] Details API error:', response.status)
      return null
    }

    const data = await response.json()

    if (data.error) {
      console.error('[GooglePlaces] Details error:', data.error)
      return null
    }

    const details: PlaceDetails = data

    console.log('[GooglePlaces] ✅ Got details:', details.address)
    return details
  } catch (err) {
    console.error('[GooglePlaces] Exception fetching details:', err)
    return null
  }
}

/**
 * Check if Google Places API is available
 */
export function isGooglePlacesAvailable(): boolean {
  return !!SUPABASE_FUNCTION_URL
}
