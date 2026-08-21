export type UserRole = 'site_employee' | 'office_staff' | 'leadership'

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
  status: 'active' | 'upcoming' | 'completed' | 'archived' | 'inactive'
  zone?: string
}

export interface Shift {
  id: string
  siteId: string
  siteName: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
}

export interface TimesheetEntry {
  id: string
  date: string
  siteName: string
  siteId: string
  projectId?: string
  projectName?: string
  clockInTime: number // unix ms
  clockOutTime?: number
  breakMinutes: number
  totalHours?: number
  overtimeHours?: number
  status: 'active' | 'complete' | 'flagged' | 'approved'
  gpsIn?: { lat: number; lng: number; address: string }
  gpsOut?: { lat: number; lng: number; address: string }
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
  type: 'urgent' | 'ceo' | 'weather' | 'general' | 'schedule' | 'vendor' | 'timesheet' | 'certification' | 'leave_request'
  title: string
  body: string
  timestamp: number
  read: boolean
  author?: string
  targetRoles?: UserRole[]
  leaveRequestId?: string
  employeeName?: string
  leaveType?: string
  startDate?: string
  endDate?: string
  totalDays?: number
  photos?: string[]  // Photo URLs for alerts (e.g., safety issues, incidents)
}

export interface CrewMember {
  id: string | number
  firstName: string
  lastName: string
  role: UserRole
  roleLabel: string
  phone: string
  email: string
  status: 'onsite' | 'enroute' | 'available' | 'off' | string
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
  attachmentUrl?: string
  attachmentName?: string
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
  projectId?: string
  projectName?: string
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
  isClockOut?: boolean // Marks photos uploaded during clock-out
}

export type PhotoCategory = 'Prep' | 'Application' | 'Cleanup' | 'Site Conditions' | 'Finish Work' | 'Other'

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

// Shift Roster & Daily Checklist Types
export interface ShiftRoster {
  id: string
  crew_member_id: number
  scheduled_date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  shift_type: 'day' | 'night'
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  notes?: string
  project_id?: string
  park_opening_hour?: string
  park_closing_hour?: string
  locations?: ShiftLocation[]
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ShiftLocation {
  id: string
  shift_id: string
  sequence_order: number
  location_name: string
  latitude?: number
  longitude?: number
  address?: string
  start_time?: string
  end_time?: string
  notes?: string
  created_at?: string
}

export interface DailyChecklist {
  id: string
  checklist_date: string // YYYY-MM-DD
  items?: ChecklistItem[]
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ChecklistItem {
  id: string
  daily_checklist_id: string
  title: string
  description?: string
  order_num: number
  created_at?: string
}

export interface ChecklistSubmission {
  id: string
  checklist_item_id: string
  crew_member_id: number
  checklist_date: string // YYYY-MM-DD
  is_complete: boolean
  reason_text?: string
  submitted_at?: string
  updated_at?: string
}
