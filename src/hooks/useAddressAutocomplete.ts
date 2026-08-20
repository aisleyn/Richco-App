import { useState, useCallback, useRef, useEffect } from 'react'
import { getAddressPredictions, getPlaceDetails } from '../services/googlePlacesService'

interface Prediction {
  place_id: string
  description: string
  main_text: string
  secondary_text?: string
}

interface UseAddressAutocompleteReturn {
  input: string
  setInput: (value: string) => void
  predictions: Prediction[]
  isLoading: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectPrediction: (prediction: Prediction) => Promise<void>
  selectedAddress: string
  selectedLat: number | null
  selectedLng: number | null
  clearSelection: () => void
}

/**
 * Hook for address autocomplete with Google Places
 */
export function useAddressAutocomplete(): UseAddressAutocompleteReturn {
  const [input, setInput] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [selectedLat, setSelectedLat] = useState<number | null>(null)
  const [selectedLng, setSelectedLng] = useState<number | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch predictions with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (!input.trim()) {
      setPredictions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    debounceTimer.current = setTimeout(async () => {
      const results = await getAddressPredictions(input)
      setPredictions(results)
      setIsOpen(results.length > 0)
      setIsLoading(false)
    }, 300) // Debounce 300ms

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [input])

  const selectPrediction = useCallback(async (prediction: Prediction) => {
    console.log('[AddressAutocomplete] Selected:', prediction.description)

    // Set the input to the full description
    setInput(prediction.description)
    setSelectedAddress(prediction.description)
    setPredictions([])
    setIsOpen(false)

    // Fetch coordinates
    const details = await getPlaceDetails(prediction.place_id)
    if (details) {
      setSelectedLat(details.lat)
      setSelectedLng(details.lng)
      console.log('[AddressAutocomplete] ✅ Got coordinates:', { lat: details.lat, lng: details.lng })
    }
  }, [])

  const clearSelection = useCallback(() => {
    setInput('')
    setSelectedAddress('')
    setSelectedLat(null)
    setSelectedLng(null)
    setPredictions([])
    setIsOpen(false)
  }, [])

  return {
    input,
    setInput,
    predictions,
    isLoading,
    isOpen,
    setIsOpen,
    selectPrediction,
    selectedAddress,
    selectedLat,
    selectedLng,
    clearSelection
  }
}
