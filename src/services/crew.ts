import type { CrewMember } from '../types'

const CREW_STORAGE_KEY = 'richco-crew-members'
const ADMIN_EMAILS_KEY = 'richco-admin-emails'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface Qualification {
  name: string
  expiryDate?: string
  issueDate?: string
}

export interface EmploymentFile {
  id: string
  name: string
  type: 'contract' | 'nda' | 'other'
  uploadedDate: number
  url?: string
}

export interface LeaveData {
  annualAllowance: number
  used: number
  approved: number
  pending: number
}

export interface StoredCrewMember extends CrewMember {
  email: string
  isAdmin: boolean
  hourlyRate?: number
  salary?: number
  paymentType?: 'hourly' | 'salary'
  hireDate?: string
  identification?: {
    type: 'passport' | 'drivers_license' | 'other'
    url: string
    uploadedDate: number
  }
  emergencyContact?: EmergencyContact
  qualifications?: Qualification[]
  employmentFiles?: EmploymentFile[]
  leaveData?: LeaveData
}

function getStoredCrew(): StoredCrewMember[] {
  try {
    const stored = localStorage.getItem(CREW_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCrew(crew: StoredCrewMember[]) {
  try {
    localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify(crew))
  } catch (err) {
    console.error('[Crew] Failed to save crew:', err)
  }
}

export function initializeCrew() {
  const existing = getStoredCrew()

  // Ensure Aisley is always in the crew list
  const aaisleyExists = existing.some(m => m.email.toLowerCase() === 'aisley@richcogroup.com')
  if (!aaisleyExists) {
    const adminUser: StoredCrewMember = {
      id: 'admin-aisley',
      firstName: 'Aisley',
      lastName: 'Nolan',
      email: 'aisley@richcogroup.com',
      role: 'admin',
      roleLabel: 'Admin',
      phone: '',
      status: 'available',
      isAdmin: true,
    }
    existing.push(adminUser)
    saveCrew(existing)
    console.log('[Crew] Added Aisley as admin user')
  }

  if (existing.length === 0) {
    console.log('[Crew] Initialized with empty crew list')
  }
}

export function getAllCrew(): StoredCrewMember[] {
  return getStoredCrew()
}

export function getCrewMemberByEmail(email: string): StoredCrewMember | undefined {
  return getStoredCrew().find(m => m.email.toLowerCase() === email.toLowerCase())
}

export function isUserAdmin(email: string): boolean {
  const member = getCrewMemberByEmail(email)
  return member?.isAdmin ?? false
}

export function addCrewMember(data: {
  firstName: string
  lastName: string
  email: string
  role: 'field' | 'supervisor' | 'admin' | 'ceo'
  phone?: string
  isAdmin?: boolean
}): StoredCrewMember {
  const existing = getStoredCrew()

  // Check if email already exists
  if (existing.some(m => m.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Employee with this email already exists')
  }

  const roleLabels: Record<string, string> = {
    field: 'Field Worker',
    supervisor: 'Supervisor',
    admin: 'Administrator',
    ceo: 'CEO',
  }

  const newMember: StoredCrewMember = {
    id: `crew-${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role,
    roleLabel: roleLabels[data.role] || data.role,
    phone: data.phone || '',
    status: 'available',
    isAdmin: data.isAdmin ?? false,
  }

  existing.push(newMember)
  saveCrew(existing)
  console.log('[Crew] Added crew member:', newMember)
  return newMember
}

export function updateCrewMember(
  email: string,
  updates: Partial<Omit<StoredCrewMember, 'id' | 'email'>>
): StoredCrewMember | null {
  const crew = getStoredCrew()
  const index = crew.findIndex(m => m.email.toLowerCase() === email.toLowerCase())

  if (index === -1) return null

  crew[index] = { ...crew[index], ...updates }
  saveCrew(crew)
  console.log('[Crew] Updated crew member:', crew[index])
  return crew[index]
}

export function removeCrewMember(email: string): boolean {
  const crew = getStoredCrew()
  const filtered = crew.filter(m => m.email.toLowerCase() !== email.toLowerCase())

  if (filtered.length === crew.length) return false

  saveCrew(filtered)
  console.log('[Crew] Removed crew member:', email)
  return true
}

export function setAdminStatus(email: string, isAdmin: boolean): StoredCrewMember | null {
  return updateCrewMember(email, { isAdmin })
}

export function ensureCrewMemberExists(
  email: string,
  firstName?: string,
  lastName?: string
): StoredCrewMember {
  const existing = getCrewMemberByEmail(email)
  if (existing) return existing

  // Create a new crew member with basic info
  return addCrewMember({
    firstName: firstName || email.split('@')[0],
    lastName: lastName || 'User',
    email,
    role: 'field',
  })
}
