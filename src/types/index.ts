export type UserRole = 'field' | 'supervisor' | 'admin' | 'ceo'

export interface User {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  avatar?: string
  phone: string
  email: string
  certifications: Certification[]
}

export interface Certification {
  name: string
  expiryDate: string
}

export interface JobSite {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  geofenceRadius: number // meters
  status: 'active' | 'upcoming' | 'completed'
  zone?: string
}

export interface Shift {
  id: string
  siteId: string
  siteName: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'active' | 'completed'
}

export interface TimesheetEntry {
  id: string
  date: string
  siteName: string
  siteId: string
  clockInTime: number // unix ms
  clockOutTime?: number
  breakMinutes: number
  totalHours?: number
  overtimeHours?: number
  status: 'active' | 'complete' | 'flagged' | 'approved'
  gpsIn?: { lat: number; lng: number; address: string }
  vehicleUsed?: string
  breakTaken?: boolean
  shiftSummary?: string
  concerns?: string
  photos?: string[]
  geofenceFlag?: boolean
}

export interface WeatherData {
  temp: number
  feelsLike: number
  condition: string
  description: string
  humidity: number
  windSpeed: number
  uvIndex: number
  precipChance: number
  icon: string
  hourly?: HourlyForecast[]
  daily?: DailyForecast[]
}

export interface HourlyForecast {
  time: string
  temp: number
  condition: string
  precipChance: number
  icon: string
}

export interface DailyForecast {
  day: string
  high: number
  low: number
  condition: string
  precipChance: number
  icon: string
}

export interface Alert {
  id: string
  type: 'urgent' | 'ceo' | 'weather' | 'general' | 'schedule' | 'vendor' | 'timesheet' | 'certification'
  title: string
  body: string
  timestamp: number
  read: boolean
  author?: string
  targetRoles?: UserRole[]
}

export interface CrewMember {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  roleLabel: string
  phone: string
  email: string
  status: 'onsite' | 'enroute' | 'available' | 'off'
  currentSite?: string
  clockedInAt?: number
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  senderName: string
  body: string
  timestamp: number
  read: boolean
  readBy?: string[]
}

export interface MessageThread {
  id: string
  participants: string[]
  participantNames: string[]
  lastMessage: string
  lastTimestamp: number
  unreadCount: number
  isGroup: boolean
  groupName?: string
}

export interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  siteId: string
  siteName: string
  submittedBy: string
  submittedById: string
  timestamp: number
  category: PhotoCategory
  caption?: string
  aiFlags?: string[]
  aiCategory?: PhotoCategory
  aiConfidence?: number
  gps?: { lat: number; lng: number }
  sharepointUrl?: string
}

export type PhotoCategory = 'Foundation' | 'Framing' | 'Electrical' | 'Site Conditions' | 'Finish Work' | 'Other'

export interface Vehicle {
  id: string
  name: string
  plate: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  sources?: string[]
  videoCard?: { title: string; duration: string; thumbnail: string }
  loading?: boolean
}
