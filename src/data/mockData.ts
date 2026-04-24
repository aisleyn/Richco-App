import type { User, JobSite, Shift, Alert, CrewMember, MessageThread, Message, Photo, Vehicle, WeatherData } from '../types'

export const currentUser: User = {
  id: 'admin-aisley',
  firstName: 'Aisley',
  lastName: 'Nolan',
  role: 'admin',
  phone: '',
  email: 'aisley@richcogroup.com',
  certifications: [],
}

export const jobSites: JobSite[] = [
  {
    id: 'office',
    name: 'Office',
    address: 'Richco International Office',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 50,
    status: 'active',
  },
  {
    id: 'mels-phase2',
    name: 'Mel\'s Service Yard - Phase 2 (Universal)',
    address: 'Universal',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 200,
    status: 'active',
  },
  {
    id: 'explosion-marvel',
    name: 'Explosion Zone - Marvel (Universal)',
    address: 'Universal',
    lat: 49.1876,
    lng: -122.7123,
    geofenceRadius: 300,
    status: 'active',
  },
  {
    id: 'camp-j-z1',
    name: 'Camp J - Zone 1 (Universal)',
    address: 'Universal',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'active',
  },
  {
    id: 'camp-j-z2',
    name: 'Camp J - Zone 2 (Universal)',
    address: 'Universal',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'upcoming',
  },
  {
    id: 'camp-j-z3',
    name: 'Camp J - Zone 3 (Universal)',
    address: 'Universal',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'upcoming',
  },
  {
    id: 'camp-j-z4',
    name: 'Camp J - Zone 4 (Universal)',
    address: 'Universal',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'upcoming',
  },
  {
    id: 'city-walk-walls',
    name: 'City Walk - Walls (Universal)',
    address: 'Universal',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 200,
    status: 'upcoming',
  },
  {
    id: 'stage-turf',
    name: 'Stage Area - Artificial Turf (Universal)',
    address: 'Universal',
    lat: 49.1876,
    lng: -122.7123,
    geofenceRadius: 300,
    status: 'upcoming',
  },
  {
    id: 'epic-905',
    name: 'Epic 905 - Maintenance (Universal)',
    address: 'Universal',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'upcoming',
  },
  {
    id: 'seuss',
    name: 'Seuss (Universal)',
    address: 'Universal',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 200,
    status: 'upcoming',
  },
  {
    id: 'meow-wolf',
    name: 'Meow Wolf - LA (Meow Wolf)',
    address: 'Meow Wolf',
    lat: 49.1876,
    lng: -122.7123,
    geofenceRadius: 300,
    status: 'upcoming',
  },
]

export const todayShifts: Shift[] = [
  {
    id: 'sh1',
    siteId: 'office',
    siteName: 'Office',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '17:00',
    status: 'scheduled',
  },
]

export const mockWeather: WeatherData = {
  temp: 72,
  feelsLike: 69,
  condition: 'Partly Cloudy',
  description: 'Partly cloudy with afternoon sun',
  humidity: 58,
  windSpeed: 14,
  uvIndex: 6,
  precipChance: 20,
  icon: 'partly-cloudy',
  hourly: [
    { time: '7 AM', temp: 64, condition: 'Cloudy', precipChance: 15, icon: 'cloudy' },
    { time: '9 AM', temp: 68, condition: 'Partly Cloudy', precipChance: 10, icon: 'partly-cloudy' },
    { time: '11 AM', temp: 71, condition: 'Sunny', precipChance: 5, icon: 'sunny' },
    { time: '1 PM', temp: 74, condition: 'Sunny', precipChance: 5, icon: 'sunny' },
    { time: '3 PM', temp: 73, condition: 'Partly Cloudy', precipChance: 20, icon: 'partly-cloudy' },
    { time: '5 PM', temp: 70, condition: 'Cloudy', precipChance: 30, icon: 'cloudy' },
    { time: '7 PM', temp: 66, condition: 'Cloudy', precipChance: 40, icon: 'cloudy' },
  ],
  daily: [
    { day: 'Today', high: 74, low: 58, condition: 'Partly Cloudy', precipChance: 20, icon: 'partly-cloudy' },
    { day: 'Thu', high: 69, low: 55, condition: 'Rainy', precipChance: 75, icon: 'rainy' },
    { day: 'Fri', high: 71, low: 56, condition: 'Partly Cloudy', precipChance: 30, icon: 'partly-cloudy' },
    { day: 'Sat', high: 78, low: 60, condition: 'Sunny', precipChance: 5, icon: 'sunny' },
    { day: 'Sun', high: 76, low: 59, condition: 'Sunny', precipChance: 10, icon: 'sunny' },
  ],
}

export const mockAlerts: Alert[] = []

export const mockCrew: CrewMember[] = [
  { id: 'u1', firstName: 'Jake', lastName: 'Morrison', role: 'supervisor', roleLabel: 'Site Supervisor', phone: '(604) 555-0182', email: 'j.morrison@richco.ca', status: 'onsite', currentSite: 'Grandview Heights Phase 3' },
  { id: 'u3', firstName: 'Marcus', lastName: 'Webb', role: 'field', roleLabel: 'Labourer', phone: '(604) 555-0317', email: 'm.webb@richco.ca', status: 'onsite', currentSite: 'Port Kells Industrial', clockedInAt: Date.now() - 1000 * 60 * 95 },
  { id: 'u4', firstName: 'Priya', lastName: 'Sharma', role: 'field', roleLabel: 'Electrician', phone: '(604) 555-0448', email: 'p.sharma@richco.ca', status: 'enroute', currentSite: 'Grandview Heights Phase 3' },
  { id: 'u5', firstName: 'Connor', lastName: 'Buell', role: 'field', roleLabel: 'Carpenter', phone: '(604) 555-0529', email: 'c.buell@richco.ca', status: 'available' },
  { id: 'u6', firstName: 'Sandra', lastName: 'Liu', role: 'admin', roleLabel: 'Office Admin', phone: '(604) 555-0634', email: 's.liu@richco.ca', status: 'available' },
  { id: 'u7', firstName: 'Dave', lastName: 'Richco', role: 'ceo', roleLabel: 'CEO', phone: '(604) 555-0001', email: 'd.richco@richco.ca', status: 'available' },
  { id: 'u8', firstName: 'Aaron', lastName: 'Trent', role: 'field', roleLabel: 'Equipment Operator', phone: '(604) 555-0712', email: 'a.trent@richco.ca', status: 'off' },
  { id: 'u9', firstName: 'Benny', lastName: 'Park', role: 'field', roleLabel: 'Labourer', phone: '(604) 555-0866', email: 'b.park@richco.ca', status: 'onsite', currentSite: 'Clayton Townhomes', clockedInAt: Date.now() - 1000 * 60 * 60 },
]

export const mockThreads: MessageThread[] = []

export const mockMessages: Record<string, Message[]> = {}

export const mockPhotos: Photo[] = [
  { id: 'p2', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=200', siteId: 'site1', siteName: 'Grandview Heights Phase 3', submittedBy: 'Jake Morrison', submittedById: 'u1', timestamp: Date.now() - 1000 * 60 * 120, category: 'Site Conditions', caption: 'Site overview morning', aiCategory: 'Site Conditions', aiConfidence: 0.91, aiFlags: ['PPE not visible on worker in background'] },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=200', siteId: 'site2', siteName: 'Port Kells Industrial', submittedBy: 'Marcus Webb', submittedById: 'u3', timestamp: Date.now() - 1000 * 60 * 60 * 3, category: 'Framing', aiCategory: 'Framing', aiConfidence: 0.88, aiFlags: [] },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=200', siteId: 'site2', siteName: 'Port Kells Industrial', submittedBy: 'Marcus Webb', submittedById: 'u3', timestamp: Date.now() - 1000 * 60 * 60 * 5, category: 'Electrical', aiCategory: 'Electrical', aiConfidence: 0.94, aiFlags: [] },
  { id: 'p5', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=200', siteId: 'site1', siteName: 'Grandview Heights Phase 3', submittedBy: 'Priya Sharma', submittedById: 'u4', timestamp: Date.now() - 1000 * 60 * 60 * 24, category: 'Framing', aiCategory: 'Framing', aiConfidence: 0.89, aiFlags: [] },
]

export const mockVehicles: Vehicle[] = [
  { id: 'v1', name: 'F-350 #1 – White', plate: 'BC 7842 XH' },
  { id: 'v2', name: 'F-350 #2 – Black', plate: 'BC 9124 KJ' },
  { id: 'v3', name: 'Ram 1500 – Silver', plate: 'BC 3317 MR' },
  { id: 'v4', name: 'Transit Van #1', plate: 'BC 5509 TZ' },
  { id: 'v5', name: 'Silverado – Red', plate: 'BC 6612 PW' },
]

export const aiTypingMessages = [
  'Searching company procedures...',
  'Reviewing OSHA guidelines...',
  'Checking safety manuals...',
  'Scanning training documents...',
  'Analyzing Richco policies...',
  'Cross-referencing regulations...',
  'Loading relevant procedures...',
]
