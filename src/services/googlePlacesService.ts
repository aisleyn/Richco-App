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
 * Currently disabled due to API key configuration issues
 * TODO: Fix Supabase secrets and re-enable
 */
export async function getAddressPredictions(input: string): Promise<PlacePrediction[]> {
  // Temporarily disabled - return empty predictions to avoid blocking user input
  // This allows typing without interruptions while we fix the backend
  console.log('[GooglePlaces] Address autocomplete temporarily disabled')
  return []
}

/**
 * Get detailed information about a place (coordinates, formatted address)
 * Currently disabled due to API key configuration issues
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  // Temporarily disabled - return null to avoid errors
  console.log('[GooglePlaces] Place details API temporarily disabled')
  return null
}

/**
 * Check if Google Places API is available
 */
export function isGooglePlacesAvailable(): boolean {
  return !!SUPABASE_FUNCTION_URL
}
