import type { User, JobSite, Shift, Alert, CrewMember, MessageThread, Message, Photo, Vehicle, WeatherData } from '../types'

export const currentUser: User = {
  id: 'u1',
  firstName: 'Jake',
  lastName: 'Morrison',
  role: 'supervisor',
  phone: '(604) 555-0182',
  email: 'j.morrison@richcoconstruction.ca',
  certifications: [
    { name: 'First Aid Level 2', expiryDate: '2026-06-15' },
    { name: 'WHMIS 2018', expiryDate: '2026-11-30' },
    { name: 'Working at Heights', expiryDate: '2025-12-01' },
  ],
}

export const jobSites: JobSite[] = [
  {
    id: 'site1',
    name: 'Grandview Heights Phase 3',
    address: '18955 Fraser Hwy, Surrey, BC',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 200,
    status: 'active',
    zone: 'Zone A – Foundation',
  },
  {
    id: 'site2',
    name: 'Port Kells Industrial',
    address: '19555 96 Ave, Surrey, BC',
    lat: 49.1876,
    lng: -122.7123,
    geofenceRadius: 300,
    status: 'active',
    zone: 'Zone B – Steel Frame',
  },
  {
    id: 'site3',
    name: 'Clayton Townhomes',
    address: '7155 188 St, Surrey, BC',
    lat: 49.1654,
    lng: -122.7432,
    geofenceRadius: 150,
    status: 'upcoming',
    zone: 'Zone C – Framing',
  },
]

export const todayShifts: Shift[] = [
  {
    id: 'sh1',
    siteId: 'site1',
    siteName: 'Grandview Heights Phase 3',
    date: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endTime: '15:30',
    status: 'scheduled',
  },
]

export const tomorrowShift: Shift = {
  id: 'sh2',
  siteId: 'site2',
  siteName: 'Port Kells Industrial',
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  startTime: '06:30',
  endTime: '15:00',
  status: 'scheduled',
}

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

export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'urgent',
    title: 'Site Safety Update — Grandview Heights',
    body: 'Excavation work resumes Monday at Zone A. All crew must complete the updated trench safety briefing before entering. See foreman for sign-off sheet.',
    timestamp: Date.now() - 1000 * 60 * 25,
    read: false,
    author: 'William Benedict – Site Supervisor',
    targetRoles: ['field', 'supervisor'],
  },
  {
    id: 'a2',
    type: 'ceo',
    title: 'Message from Darren Richco',
    body: 'Team — great progress on Phase 3 this week. We are ahead of schedule by 4 days. Keep it up. Safety first, always.',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    read: false,
    author: 'Darren Richco – CEO',
  },
  {
    id: 'a3',
    type: 'weather',
    title: 'Rain Advisory — Thursday',
    body: 'Environment Florida is forecasting 18–22mm of rain Thursday. Concrete pours scheduled for Thursday should be reviewed. Site leads please confirm go/no-go by Wednesday EOD.',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    read: true,
    author: 'Automated Weather System',
  },
  {
    id: 'a4',
    type: 'schedule',
    title: 'Shift Change — Port Kells Friday',
    body: 'Friday shift at Port Kells has been moved from 6:30 AM to 7:00 AM start. New end time is 3:30 PM. Updated in scheduling system.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
    author: 'Office Admin',
  },
  {
    id: 'a5',
    type: 'vendor',
    title: 'Concrete Delivery — Grandview Thursday 8 AM',
    body: 'Lafarge is delivering 42 yards of 32 MPa concrete to Grandview Heights Thursday at 8:00 AM. Zone A crew must be on site by 7:30 AM.',
    timestamp: Date.now() - 1000 * 60 * 60 * 28,
    read: true,
    author: 'Procurement Team',
  },
  {
    id: 'a6',
    type: 'timesheet',
    title: 'Timesheet Reminder',
    body: 'You have not yet clocked in for today\'s shift. Your scheduled start time was 7:00 AM at Grandview Heights Phase 3.',
    timestamp: Date.now() - 1000 * 60 * 45,
    read: false,
    author: 'System',
  },
]

export const mockCrew: CrewMember[] = [
  { id: 'u1', firstName: 'Jake', lastName: 'Morrison', role: 'supervisor', roleLabel: 'Site Supervisor', phone: '(604) 555-0182', email: 'j.morrison@richco.ca', status: 'onsite', currentSite: 'Grandview Heights Phase 3' },
  { id: 'u2', firstName: 'Tyler', lastName: 'Nash', role: 'field', roleLabel: 'Carpenter', phone: '(604) 555-0241', email: 't.nash@richco.ca', status: 'onsite', currentSite: 'Grandview Heights Phase 3', clockedInAt: Date.now() - 1000 * 60 * 120 },
  { id: 'u3', firstName: 'Marcus', lastName: 'Webb', role: 'field', roleLabel: 'Labourer', phone: '(604) 555-0317', email: 'm.webb@richco.ca', status: 'onsite', currentSite: 'Port Kells Industrial', clockedInAt: Date.now() - 1000 * 60 * 95 },
  { id: 'u4', firstName: 'Priya', lastName: 'Sharma', role: 'field', roleLabel: 'Electrician', phone: '(604) 555-0448', email: 'p.sharma@richco.ca', status: 'enroute', currentSite: 'Grandview Heights Phase 3' },
  { id: 'u5', firstName: 'Connor', lastName: 'Buell', role: 'field', roleLabel: 'Carpenter', phone: '(604) 555-0529', email: 'c.buell@richco.ca', status: 'available' },
  { id: 'u6', firstName: 'Sandra', lastName: 'Liu', role: 'admin', roleLabel: 'Office Admin', phone: '(604) 555-0634', email: 's.liu@richco.ca', status: 'available' },
  { id: 'u7', firstName: 'Dave', lastName: 'Richco', role: 'ceo', roleLabel: 'CEO', phone: '(604) 555-0001', email: 'd.richco@richco.ca', status: 'available' },
  { id: 'u8', firstName: 'Aaron', lastName: 'Trent', role: 'field', roleLabel: 'Equipment Operator', phone: '(604) 555-0712', email: 'a.trent@richco.ca', status: 'off' },
  { id: 'u9', firstName: 'Benny', lastName: 'Park', role: 'field', roleLabel: 'Labourer', phone: '(604) 555-0866', email: 'b.park@richco.ca', status: 'onsite', currentSite: 'Clayton Townhomes', clockedInAt: Date.now() - 1000 * 60 * 60 },
]

export const mockThreads: MessageThread[] = [
  { id: 't1', participants: ['u1', 'u2'], participantNames: ['Tyler Nash'], lastMessage: 'Roger that, on my way to Zone A now', lastTimestamp: Date.now() - 1000 * 60 * 8, unreadCount: 1, isGroup: false },
  { id: 't2', participants: ['u1', 'u4', 'u2', 'u3', 'u9'], participantNames: ['Grandview Heights Crew'], lastMessage: 'Concrete delivery confirmed for 8 AM', lastTimestamp: Date.now() - 1000 * 60 * 22, unreadCount: 3, isGroup: true, groupName: 'Grandview Heights Crew' },
  { id: 't3', participants: ['u1', 'u6'], participantNames: ['Sandra Liu'], lastMessage: 'Updated the schedule for Friday', lastTimestamp: Date.now() - 1000 * 60 * 60 * 2, unreadCount: 0, isGroup: false },
]

export const mockMessages: Record<string, Message[]> = {
  't1': [
    { id: 'm1', threadId: 't1', senderId: 'u1', senderName: 'Jake Morrison', body: 'Tyler, can you head to Zone A? We need help with the form setting.', timestamp: Date.now() - 1000 * 60 * 15, read: true },
    { id: 'm2', threadId: 't1', senderId: 'u2', senderName: 'Tyler Nash', body: 'Roger that, on my way to Zone A now', timestamp: Date.now() - 1000 * 60 * 8, read: false },
  ],
  't2': [
    { id: 'm3', threadId: 't2', senderId: 'u6', senderName: 'Sandra Liu', body: 'Concrete delivery confirmed for 8 AM Thursday. All Zone A crew on site by 7:30.', timestamp: Date.now() - 1000 * 60 * 22, read: false },
    { id: 'm4', threadId: 't2', senderId: 'u2', senderName: 'Tyler Nash', body: 'Confirmed, I\'ll be there', timestamp: Date.now() - 1000 * 60 * 18, read: false },
    { id: 'm5', threadId: 't2', senderId: 'u4', senderName: 'Priya Sharma', body: 'Same, ETA 7:15', timestamp: Date.now() - 1000 * 60 * 16, read: false },
  ],
  't3': [
    { id: 'm6', threadId: 't3', senderId: 'u6', senderName: 'Sandra Liu', body: 'Updated the schedule for Friday — Port Kells shift starts at 7:00 AM now.', timestamp: Date.now() - 1000 * 60 * 60 * 2, read: true },
  ],
}

export const mockPhotos: Photo[] = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200', siteId: 'site1', siteName: 'Grandview Heights Phase 3', submittedBy: 'Tyler Nash', submittedById: 'u2', timestamp: Date.now() - 1000 * 60 * 40, category: 'Foundation', caption: 'North wall footing poured', aiCategory: 'Foundation', aiConfidence: 0.96, aiFlags: [] },
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
