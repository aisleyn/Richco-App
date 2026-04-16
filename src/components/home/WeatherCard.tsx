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
              <p key={i} className="text-red-400 text-xs leading-relaxed">{a}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main card with video background */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-card relative">
        {/* Background video */}
        <div className="absolute inset-0 w-full h-64">
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            className="w-full h-full object-cover"
          />
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 p-4 h-64 flex flex-col justify-between">
          {/* Top: Time of day label */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-medium uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full">
              {timeLabel}
            </span>
          </div>

          {/* Bottom: Temperature and condition */}
          <div>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-6xl font-light text-white drop-shadow-lg">{weather.temp}°</span>
              <div>
                <p className="text-white font-semibold drop-shadow-lg">{weather.condition}</p>
                <p className="text-white/80 text-sm drop-shadow-lg">Feels like {weather.feelsLike}°F</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip below video */}
        <div className="bg-gradient-to-b from-black/20 to-bg-surface px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
              { icon: Wind, label: 'Wind', value: `${weather.windSpeed} mph` },
              { icon: Sun, label: 'UV Index', value: String(weather.uvIndex), warn: weather.uvIndex > 7 },
              { icon: Droplets, label: 'Precip', value: `${weather.precipChance}%`, warn: weather.precipChance > 60 },
            ].map(({ icon: Icon, label, value, warn }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon size={13} className={warn ? 'text-amber-400' : 'text-slate-400'} />
                <span className={`text-xs font-semibold ${warn ? 'text-amber-400' : 'text-slate-800'}`}>{value}</span>
                <span className="text-slate-500 text-[9px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-slate-200 text-slate-400 text-xs hover:text-slate-200 active:bg-white/5 transition-colors bg-bg-surface"
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
              className="overflow-hidden bg-bg-surface"
            >
              {/* Hourly */}
              <div className="px-4 pb-2 pt-4">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">Hourly</p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {weather.hourly?.map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 bg-white/5 rounded-xl px-3 py-2.5">
                      <span className="text-slate-400 text-[11px]">{h.time}</span>
                      <span className="text-base">{h.condition.toLowerCase().includes('rain') ? '🌧️' : h.condition.toLowerCase().includes('cloud') ? '☁️' : '☀️'}</span>
                      <span className="text-slate-800 text-sm font-medium">{h.temp}°</span>
                      {h.precipChance > 20 && <span className="text-blue-400 text-[10px]">{h.precipChance}%</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily */}
              <div className="px-4 pb-4">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">5-Day</p>
                <div className="space-y-2">
                  {weather.daily?.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                      <span className="text-slate-300 text-sm w-14">{d.day}</span>
                      <span className="text-lg">{d.condition.toLowerCase().includes('rain') ? '🌧️' : d.condition.toLowerCase().includes('cloud') ? '☁️' : '☀️'}</span>
                      <div className="flex items-center gap-2">
                        {d.precipChance > 20 && <span className="text-blue-400 text-xs">{d.precipChance}%</span>}
                        <span className="text-slate-500 text-sm">{d.low}°</span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-orange-400"
                            style={{ width: `${Math.round(((d.high - d.low) / 40) * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-800 text-sm font-medium w-6 text-right">{d.high}°</span>
                      </div>
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
