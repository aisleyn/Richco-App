// Supabase Edge Function to proxy Google Places API requests
// This avoids CORS issues by making requests server-side

// Note: VITE_GOOGLE_PLACES_API_KEY needs to be set as a Supabase secret
// Set it via: supabase secrets set GOOGLE_PLACES_API_KEY=<your-key>
const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'autocomplete' or 'details'
    const input = url.searchParams.get('input')
    const placeId = url.searchParams.get('place_id')

    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (type === 'autocomplete') {
      if (!input) {
        return new Response(
          JSON.stringify({ error: 'Missing input parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      // Call Google Places Autocomplete API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(input)}` +
        `&key=${GOOGLE_PLACES_API_KEY}` +
        `&components=country:us`
      )

      const data = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('[GooglePlaces] Error:', data.status, data.error_message)
        return new Response(
          JSON.stringify({ predictions: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      const predictions: PlacePrediction[] = (data.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text,
      }))

      console.log('[GooglePlacesProxy] ✅ Returned', predictions.length, 'predictions')
      return new Response(
        JSON.stringify({ predictions }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    } else if (type === 'details') {
      if (!placeId) {
        return new Response(
          JSON.stringify({ error: 'Missing place_id parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      // Call Google Places Details API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${encodeURIComponent(placeId)}` +
        `&fields=formatted_address,geometry` +
        `&key=${GOOGLE_PLACES_API_KEY}`
      )

      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('[GooglePlaces] Details error:', data.status)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch place details' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      const result = data.result
      const details: PlaceDetails = {
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      }

      console.log('[GooglePlacesProxy] ✅ Returned details:', details.address)
      return new Response(
        JSON.stringify(details),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid type parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }
  } catch (err) {
    console.error('[GooglePlacesProxy] Exception:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
