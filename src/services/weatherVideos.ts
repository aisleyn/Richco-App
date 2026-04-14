/**
 * Weather Video Service
 * Maps weather condition + time of day → video URL
 *
 * Videos can be:
 * - Stored in public/ folder (e.g., /videos/sunny-daytime.mp4)
 * - External URLs from Pexels, Pixabay, etc.
 *
 * To add your own videos:
 * 1. Save MP4 files to public/videos/
 * 2. Update the VIDEO_MAP below with file paths
 */

export type TimeOfDay = 'sunrise' | 'daytime' | 'sunset' | 'night'
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy'

export function getTimeOfDay(hour: number): TimeOfDay {
  // hour is 0-23
  if (hour >= 5 && hour < 7) return 'sunrise'
  if (hour >= 7 && hour < 18) return 'daytime'
  if (hour >= 18 && hour < 20) return 'sunset'
  return 'night'
}

export function getWeatherType(condition: string): WeatherType {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy'
  if (c.includes('snow')) return 'snowy'
  if (c.includes('storm') || c.includes('thunder')) return 'stormy'
  if (c.includes('cloud') || c.includes('overcast')) return 'cloudy'
  if (c.includes('fog') || c.includes('mist')) return 'foggy'
  return 'sunny'
}

// ─── Video Map ──────────────────────────────────────────────────────────────
// Format: `/videos/{weather}-{timeofday}.mp4`
//
// Free video sources (replace these URLs with your own):
// - Pexels: https://www.pexels.com/search/videos/
// - Pixabay: https://pixabay.com/videos/
// - Unsplash: https://unsplash.com/napi/videos/search
//
// Example public video URLs (replace with your own):
const VIDEO_MAP: Record<WeatherType, Record<TimeOfDay, string>> = {
  sunny: {
    sunrise: '/videos/sunny-sunrise.mp4', // sunrise over mountains
    daytime: '/videos/sunny-daytime.mp4', // bright sunny sky
    sunset: '/videos/sunny-sunset.mp4', // golden hour
    night: '/videos/sunny-night.mp4', // starry night
  },
  cloudy: {
    sunrise: '/videos/cloudy-sunrise.mp4',
    daytime: '/videos/cloudy-daytime.mp4',
    sunset: '/videos/cloudy-sunset.mp4',
    night: '/videos/cloudy-night.mp4',
  },
  rainy: {
    sunrise: '/videos/rainy-sunrise.mp4',
    daytime: '/videos/rainy-daytime.mp4',
    sunset: '/videos/rainy-sunset.mp4',
    night: '/videos/rainy-night.mp4',
  },
  stormy: {
    sunrise: '/videos/stormy-sunrise.mp4',
    daytime: '/videos/stormy-daytime.mp4',
    sunset: '/videos/stormy-sunset.mp4',
    night: '/videos/stormy-night.mp4',
  },
  snowy: {
    sunrise: '/videos/snowy-sunrise.mp4',
    daytime: '/videos/snowy-daytime.mp4',
    sunset: '/videos/snowy-sunset.mp4',
    night: '/videos/snowy-night.mp4',
  },
  foggy: {
    sunrise: '/videos/foggy-sunrise.mp4',
    daytime: '/videos/foggy-daytime.mp4',
    sunset: '/videos/foggy-sunset.mp4',
    night: '/videos/foggy-night.mp4',
  },
}

export function getWeatherVideo(condition: string, hour: number = new Date().getHours()): string {
  const weather = getWeatherType(condition)
  const timeOfDay = getTimeOfDay(hour)
  return VIDEO_MAP[weather][timeOfDay]
}

export function getWeatherLabel(condition: string, hour: number = new Date().getHours()): string {
  const timeLabel = {
    sunrise: '🌅 Sunrise',
    daytime: '☀️ Daytime',
    sunset: '🌅 Sunset',
    night: '🌙 Night',
  }
  const weatherLabel = {
    sunny: 'Sunny',
    cloudy: 'Cloudy',
    rainy: 'Rainy',
    stormy: 'Stormy',
    snowy: 'Snowy',
    foggy: 'Foggy',
  }
  const time = getTimeOfDay(hour)
  const weather = getWeatherType(condition)
  return `${timeLabel[time]} • ${weatherLabel[weather]}`
}
