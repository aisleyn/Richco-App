// Google Places Autocomplete Service
// Provides address suggestions as user types

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

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
  if (!input.trim() || !GOOGLE_PLACES_API_KEY) {
    return []
  }

  try {
    console.log('[GooglePlaces] Fetching predictions for:', input)

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      `input=${encodeURIComponent(input)}` +
      `&key=${GOOGLE_PLACES_API_KEY}` +
      `&components=country:us` // Limit to US, modify as needed
    )

    if (!response.ok) {
      console.error('[GooglePlaces] API error:', response.status)
      return []
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[GooglePlaces] Error:', data.status, data.error_message)
      return []
    }

    const predictions: PlacePrediction[] = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text
    }))

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
  if (!placeId || !GOOGLE_PLACES_API_KEY) {
    return null
  }

  try {
    console.log('[GooglePlaces] Fetching details for place:', placeId)

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(placeId)}` +
      `&fields=formatted_address,geometry` +
      `&key=${GOOGLE_PLACES_API_KEY}`
    )

    if (!response.ok) {
      console.error('[GooglePlaces] Details API error:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('[GooglePlaces] Details error:', data.status)
      return null
    }

    const result = data.result
    const details: PlaceDetails = {
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng
    }

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
  return !!GOOGLE_PLACES_API_KEY
}
