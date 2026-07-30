import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wind, Droplets, Sun, AlertTriangle, ChevronDown } from 'lucide-react'
import { useWeather } from '../../hooks/useWeather'
import { getWeatherVideo, getWeatherLabel } from '../../services/weatherVideos'

export function WeatherCard() {
  const { weather, alerts } = useWeather()
  const [expanded, setExpanded] = useState(false)
  const videoUrl = getWeatherVideo(weather.condition)
  const timeLabel = getWeatherLabel(weather.condition)

  return (
    <div className="space-y-2">
      {/* Alert bar */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600/20 border border-red-600/40 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            {alerts.map((a, i) => (
              <p key={i} className="text-red-400 text-base leading-relaxed">{a}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main card with gradient background */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-card relative">
        {/* Background gradient */}
        <div className="absolute inset-0 w-full h-48 md:h-64 bg-gradient-to-br" style={{ background: 'linear-gradient(160deg, #5A8DEE 0%, #7FA6F0 45%, #B9CDF2 100%)' }}>
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 p-4 h-48 md:h-64 flex flex-col justify-between">
          {/* Top: Time of day label */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-medium uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 shrink-0">
              {timeLabel}
            </span>
          </div>

          {/* Bottom: Temperature and condition */}
          <div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-4xl md:text-6xl font-light text-white drop-shadow-lg">{weather.temp}°</span>
              <div>
                <p className="text-white font-semibold drop-shadow-lg">{weather.condition}</p>
                <p className="text-white/80 text-sm drop-shadow-lg">Feels like {weather.feelsLike}°F</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip below gradient */}
        <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
              { icon: Wind, label: 'Wind', value: `${weather.windSpeed} mph` },
              { icon: Sun, label: 'UV Index', value: String(weather.uvIndex), warn: weather.uvIndex > 7 },
              { icon: Droplets, label: 'Precip', value: `${weather.precipChance}%`, warn: weather.precipChance > 60 },
            ].map(({ icon: Icon, label, value, warn }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon size={13} className="text-slate-400" />
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">{value}</span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100 dark:active:bg-slate-700 transition-colors bg-white dark:bg-slate-800"
        >
          {expanded ? 'Hide' : 'Show'} Forecast
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {/* Expanded forecast */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden bg-white dark:bg-slate-800"
            >
              {/* Hourly */}
              <div className="px-4 pb-2 pt-4">
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Hourly</p>
                {weather.hourly && weather.hourly.length > 0 ? (
                  <div className={`flex ${weather.hourly.length <= 6 ? 'justify-between' : 'gap-3 overflow-x-auto pb-2 scrollbar-hide'}`}>
                    {weather.hourly?.map((h, i) => (
                      <div key={i} className={`flex flex-col items-center gap-1.5 ${weather.hourly && weather.hourly.length <= 6 ? 'flex-1' : 'shrink-0'} bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2.5`}>
                        <span className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold">{h.time}</span>
                        <span className="text-base">{h.condition.toLowerCase().includes('rain') ? '🌧️' : h.condition.toLowerCase().includes('cloud') ? '☁️' : '☀️'}</span>
                        <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{h.temp}°</span>
                        <span className="text-accent-blue text-[10px] h-4 flex items-center font-bold">{h.precipChance > 20 ? `${h.precipChance}%` : '–'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-xs">No hourly forecast available</p>
                )}
              </div>

              {/* Daily */}
              <div className="px-4 pb-4">
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">5-Day</p>
                <div className="space-y-2">
                  {weather.daily?.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2.5">
                      <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold w-14">{d.day}</span>
                      <span className="text-accent-blue text-xs font-bold w-8 text-center">{d.precipChance > 20 ? `${d.precipChance}%` : '–'}</span>
                      <span className="text-slate-600 dark:text-slate-400 text-sm">{d.low}°</span>
                      <div className="w-14 h-2 rounded-md bg-slate-300 dark:bg-slate-600 overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-md bg-gradient-to-r from-accent-blue to-warning-base"
                          style={{ width: `${Math.round(((d.high - d.low) / 40) * 100)}%` }}
                        />
                      </div>
                      <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold w-7 text-right">{d.high}°</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
