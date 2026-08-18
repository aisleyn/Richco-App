import type { CrewMember } from '../types'
import {
  addCrewMember as supabaseAddCrewMember,
  getCrewMemberByEmail as supabaseGetCrewMemberByEmail,
  getAllCrewMembers,
  updateCrewMember as supabaseUpdateCrewMember,
} from './supabase'
import { deleteCrewMember as authDeleteCrewMember, supabase } from './supabaseAuth'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface Qualification {
  name: string
  expiryDate?: string
  issueDate?: string
  url?: string
  id?: string
  uploadedDate?: number
}

export interface EmploymentFile {
  id: string
  name: string
  type: 'contract' | 'offer_letter' | 'agreement' | 'nda' | 'other'
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

// Remove a crew member completely - deletes from all tables and data
export async function removeCrewMember(email: string): Promise<boolean> {
  try {
    console.log('[Crew] Removing crew member:', email)

    // First try to get user_id from users table by email
    let userId: string | null = null
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (userData?.id) {
      userId = userData.id
      console.log('[Crew] Found user in users table:', userId)
    } else {
      console.warn('[Crew] User not found in users table, will do full cleanup by email')
    }

    // Clean up all related data regardless of whether user is in users table
    // This ensures complete removal from the system
    await cleanupUserData(email, userId)

    // Always delete from users table (RLS might prevent read but not delete)
    try {
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('email', email)

      if (usersError) {
        console.warn('[Crew] Warning deleting from users table:', usersError.message)
      } else {
        console.log('[Crew] ✅ Deleted from users table:', email)
      }
    } catch (err) {
      console.warn('[Crew] Exception deleting from users table:', err)
    }

    // If we have userId, also use the auth deletion process
    if (userId) {
      const result = await authDeleteCrewMember(userId)
      if (result.success) {
        console.log('[Crew] ✅ Crew member fully removed (with auth):', email)
        return true
      } else {
        console.error('[Crew] Failed to delete auth user:', result.message)
        // Continue anyway - crew member is deleted even if auth cleanup failed
      }
    }

    console.log('[Crew] ✅ Crew member fully removed:', email)
    return true
  } catch (err) {
    console.error('[Crew] Error removing crew member:', err)
    return false
  }
}

// Helper function to clean up all user-related data
async function cleanupUserData(email: string, userId: string | null): Promise<void> {
  try {
    console.log('[Crew] Cleaning up data for:', email)

    // Delete time entries (timesheets)
    if (userId) {
      await supabase.from('time_entries').delete().eq('user_id', userId)
      console.log('[Crew] Deleted time entries for:', email)

      // Delete break periods
      await supabase.from('break_periods').delete().eq('user_id', userId)
      console.log('[Crew] Deleted break periods for:', email)

      // Delete shift assignments
      await supabase.from('shift_assignments').delete().eq('crew_member_id', userId)
      console.log('[Crew] Deleted shift assignments for:', email)

      // Delete photos uploaded by this user
      await supabase.from('photos').delete().eq('submitted_by_id', userId)
      console.log('[Crew] Deleted photos for:', email)

      // Delete messages from this user
      await supabase.from('messages').delete().eq('sender_id', userId)
      console.log('[Crew] Deleted messages for:', email)
    }

    // Delete crew member record (by email, works regardless of userId)
    await supabase.from('crew_members').delete().eq('email', email)
    console.log('[Crew] Deleted crew member record for:', email)

    console.log('[Crew] ✅ All data cleaned up for:', email)
  } catch (err) {
    console.error('[Crew] Error during cleanup:', err)
    // Don't throw - continue with deletion even if cleanup partially fails
  }
}

// Stub for backwards compatibility - clearing all crew should be done carefully
export async function clearAllCrew(): Promise<void> {
  console.warn('[Crew] clearAllCrew not implemented for Supabase backend')
}
