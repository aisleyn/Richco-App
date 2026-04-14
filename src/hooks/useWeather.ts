import { useState, useEffect } from 'react'
import type { WeatherData } from '../types'
import { mockWeather } from '../data/mockData'

// Replace VITE_OPENWEATHER_KEY in .env with your OpenWeatherMap API key.
// Without a key, mock data is used automatically.
const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(mockWeather)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!API_KEY) return // use mock data

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${coords.latitude}&lon=${coords.longitude}&units=imperial&exclude=minutely&appid=${API_KEY}`
          )
          const data = await res.json()
          setWeather({
            temp: Math.round(data.current.temp),
            feelsLike: Math.round(data.current.feels_like),
            condition: data.current.weather[0].main,
            description: data.current.weather[0].description,
            humidity: data.current.humidity,
            windSpeed: Math.round(data.current.wind_speed),
            uvIndex: Math.round(data.current.uvi),
            precipChance: Math.round((data.hourly?.[0]?.pop ?? 0) * 100),
            icon: data.current.weather[0].icon,
            hourly: data.hourly?.slice(0, 7).map((h: any) => ({
              time: new Date(h.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
              temp: Math.round(h.temp),
              condition: h.weather[0].main,
              precipChance: Math.round(h.pop * 100),
              icon: h.weather[0].icon,
            })),
            daily: data.daily?.slice(0, 5).map((d: any, i: number) => ({
              day: i === 0 ? 'Today' : new Date(d.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
              high: Math.round(d.temp.max),
              low: Math.round(d.temp.min),
              condition: d.weather[0].main,
              precipChance: Math.round(d.pop * 100),
              icon: d.weather[0].icon,
            })),
          })
        } catch {
          setError('Weather unavailable')
        } finally {
          setLoading(false)
        }
      },
      () => { setLoading(false) }
    )
  }, [])

  const alerts: string[] = []
  if (weather.uvIndex > 7) alerts.push('UV Advisory: UV index ' + weather.uvIndex + '. Sunscreen and protective clothing required on site.')
  if (weather.temp > 90) alerts.push('Heat Advisory: ' + weather.temp + '°F. Cautionary hydration breaks every 20 minutes. Monitor crew for heat stress.')
  if (weather.precipChance > 60) alerts.push('Rain Warning: ' + weather.precipChance + '% precipitation chance. Review.')
  if (weather.windSpeed > 30) alerts.push('High Wind Warning: ' + weather.windSpeed + ' mph winds.')

  return { weather, loading, error, alerts }
}
