import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader, X } from 'lucide-react'
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete'

interface Props {
  placeholder?: string
  onAddressSelected?: (address: string, lat: number, lng: number) => void
  onInputChange?: (input: string) => void
  defaultValue?: string
}

export function AddressAutocomplete({
  placeholder = 'Search address...',
  onAddressSelected,
  onInputChange,
  defaultValue = ''
}: Props) {
  const {
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
  } = useAddressAutocomplete()

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  // Handle address selection
  useEffect(() => {
    if (selectedAddress && selectedLat !== null && selectedLng !== null && onAddressSelected) {
      onAddressSelected(selectedAddress, selectedLat, selectedLng)
    }
  }, [selectedAddress, selectedLat, selectedLng, onAddressSelected])

  // Notify parent of input changes
  useEffect(() => {
    if (onInputChange) {
      onInputChange(input)
    }
  }, [input, onInputChange])

  // Set default value on mount
  useEffect(() => {
    if (defaultValue) {
      setInput(defaultValue)
    }
  }, [defaultValue, setInput])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <MapPin size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => input.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
          disabled={isLoading}
        />

        {input && (
          <button
            onClick={() => {
              clearSelection()
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            type="button"
            title="Clear"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {predictions.map((prediction, idx) => (
              <button
                key={prediction.place_id}
                onClick={() => selectPrediction(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors flex items-start gap-3 group"
              >
                <MapPin
                  size={16}
                  className="text-slate-400 group-hover:text-green-600 mt-1 shrink-0 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {prediction.main_text}
                  </p>
                  {prediction.secondary_text && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {prediction.secondary_text}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      {isOpen && !isLoading && input.trim() && predictions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 p-4 text-center"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">No addresses found</p>
        </motion.div>
      )}
    </div>
  )
}
