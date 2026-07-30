import type { CrewMember } from '../types'
import {
  addCrewMember as supabaseAddCrewMember,
  getCrewMemberByEmail as supabaseGetCrewMemberByEmail,
  getAllCrewMembers,
  updateCrewMember as supabaseUpdateCrewMember,
} from './supabase'

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

export interface StoredCrewMember extends Omit<CrewMember, 'status'> {
  id: number
  email: string
  isAdmin: boolean
  status: 'available' | 'onsite' | 'enroute' | 'off' | string
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

export function initializeCrew() {
  console.log('[Crew] Initialized (using Supabase backend)')
}

export async function getAllCrew(): Promise<StoredCrewMember[]> {
  const members = await getAllCrewMembers()
  return members.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    roleLabel: `${m.firstName} ${m.lastName}`,
    phone: m.phone || '',
    status: m.status || 'available',
    isAdmin: m.isAdmin || false,
  }))
}

export async function getCrewMemberByEmail(email: string): Promise<StoredCrewMember | undefined> {
  const member = await supabaseGetCrewMemberByEmail(email)
  if (!member) return undefined

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: member.role,
    roleLabel: `${member.firstName} ${member.lastName}`,
    phone: member.phone || '',
    status: member.status || 'available',
    isAdmin: member.isAdmin || false,
  }
}

export async function isUserAdmin(email: string): Promise<boolean> {
  const member = await getCrewMemberByEmail(email)
  return member?.isAdmin ?? false
}

export async function addCrewMember(data: {
  firstName: string
  lastName: string
  email: string
  role?: 'site_employee' | 'office_staff' | 'leadership'
  phone?: string
  isAdmin?: boolean
}): Promise<StoredCrewMember> {
  // Check if email already exists
  const existing = await getCrewMemberByEmail(data.email)
  if (existing) {
    throw new Error('Employee with this email already exists')
  }

  const result = await supabaseAddCrewMember({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role || 'site_employee',
    phone: data.phone,
    isAdmin: data.isAdmin,
  })

  if (!result) {
    throw new Error('Failed to create crew member in Supabase')
  }

  console.log('[Crew] Added crew member:', result.email, 'ID:', result.id)

  return {
    id: result.id,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    role: result.role,
    roleLabel: `${result.firstName} ${result.lastName}`,
    phone: result.phone || '',
    status: result.status || 'available',
    isAdmin: result.isAdmin || false,
  }
}

export async function updateCrewMember(
  email: string,
  updates: Partial<Omit<StoredCrewMember, 'id' | 'email'>>
): Promise<StoredCrewMember | null> {
  const updatePayload: any = {}
  if (updates.firstName) updatePayload.firstName = updates.firstName
  if (updates.lastName) updatePayload.lastName = updates.lastName
  if (updates.phone) updatePayload.phone = updates.phone
  if (updates.role) updatePayload.role = updates.role
  if (updates.status) updatePayload.status = updates.status
  if (updates.isAdmin !== undefined) updatePayload.isAdmin = updates.isAdmin

  const result = await supabaseUpdateCrewMember(email, updatePayload)
  if (!result) return null

  console.log('[Crew] Updated crew member:', email)

  return {
    id: result.id,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    role: result.role,
    roleLabel: `${result.firstName} ${result.lastName}`,
    phone: result.phone || '',
    status: result.status || 'available',
    isAdmin: result.isAdmin || false,
  }
}

export async function setAdminStatus(email: string, isAdmin: boolean): Promise<StoredCrewMember | null> {
  return updateCrewMember(email, { isAdmin })
}

export async function ensureCrewMemberExists(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<StoredCrewMember> {
  const existing = await getCrewMemberByEmail(email)
  if (existing) return existing

  return addCrewMember({
    firstName: firstName || email.split('@')[0],
    lastName: lastName || 'User',
    email,
    role: 'site_employee',
  })
}

export async function hasUserCompletedRegistration(email: string): Promise<boolean> {
  const member = await getCrewMemberByEmail(email)
  return member !== undefined
}

// Stub for backwards compatibility - removing from Supabase should be done carefully
export async function removeCrewMember(_email: string): Promise<boolean> {
  console.warn('[Crew] removeCrewMember not implemented for Supabase backend')
  return false
}

// Stub for backwards compatibility - clearing all crew should be done carefully
export async function clearAllCrew(): Promise<void> {
  console.warn('[Crew] clearAllCrew not implemented for Supabase backend')
}
