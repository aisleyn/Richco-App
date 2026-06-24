import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'crew'
}

// Login with email and password
export async function login(email: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Auth] Login failed:', error.message)
      return null
    }

    if (!data.user) {
      console.error('[Auth] No user returned from login')
      return null
    }

    // Fetch user profile from users table
    const user = await getUserProfile(data.user.id)
    console.log('[Auth] ✅ Login successful:', user?.email)
    return user
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return null
  }
}

// Logout
export async function logout(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Auth] Logout failed:', error.message)
    } else {
      console.log('[Auth] ✅ Logged out successfully')
    }
  } catch (err) {
    console.error('[Auth] Logout error:', err)
  }
}

// Get current logged-in user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Auth] Session error:', error.message)
      return null
    }

    if (!data.session?.user) {
      return null
    }

    // Fetch full user profile from users table
    const user = await getUserProfile(data.session.user.id)
    if (user) {
      console.log('[Auth] ✅ Got current user:', user.email)
    }
    return user
  } catch (err) {
    console.error('[Auth] Get current user error:', err)
    return null
  }
}

// Get user profile from users table
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Failed to fetch user profile:', error.message)
      return null
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    }
  } catch (err) {
    console.error('[Auth] Get user profile error:', err)
    return null
  }
}

// Create new crew member (admin only)
export async function createCrewMember(email: string, name: string): Promise<{ success: boolean; message: string }> {
  try {
    // First, create auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12)

    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Require email confirmation
    })

    if (authError) {
      console.error('[Auth] Failed to create auth user:', authError.message)
      return { success: false, message: `Auth error: ${authError.message}` }
    }

    if (!data.user) {
      return { success: false, message: 'Failed to create user' }
    }

    // Create user profile in users table
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      name,
      role: 'crew',
    })

    if (profileError) {
      console.error('[Auth] Failed to create user profile:', profileError.message)
      return { success: false, message: `Profile error: ${profileError.message}` }
    }

    console.log('[Auth] ✅ Created crew member:', email)
    return { success: true, message: `Crew member ${email} created. They'll receive an email to set their password.` }
  } catch (err) {
    console.error('[Auth] Create crew member error:', err)
    return { success: false, message: 'Failed to create crew member' }
  }
}

// Get all crew members (admin only)
export async function getAllCrewMembers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'crew')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Auth] Failed to fetch crew members:', error.message)
      return []
    }

    return data.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
    }))
  } catch (err) {
    console.error('[Auth] Get crew members error:', err)
    return []
  }
}

// Request password reset (crew member)
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://mango-rock-0fadbc31e.7.azurestaticapps.net'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}`,
    })

    if (error) {
      console.error('[Auth] Password reset request failed:', error.message)
      return { success: false, message: error.message }
    }

    console.log('[Auth] ✅ Password reset email sent')
    return { success: true, message: 'Password reset email sent' }
  } catch (err) {
    console.error('[Auth] Password reset request error:', err)
    return { success: false, message: 'Failed to request password reset' }
  }
}

// Update password
export async function updatePassword(password: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      console.error('[Auth] Password update failed:', error.message)
      return { success: false, message: error.message }
    }

    console.log('[Auth] ✅ Password updated')
    return { success: true, message: 'Password updated successfully' }
  } catch (err) {
    console.error('[Auth] Password update error:', err)
    return { success: false, message: 'Failed to update password' }
  }
}

// Check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const user = await getUserProfile(userId)
    return user?.role === 'admin'
  } catch (err) {
    console.error('[Auth] Check admin error:', err)
    return false
  }
}

// Delete crew member (admin only)
export async function deleteCrewMember(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('[Auth] Failed to delete user auth:', error.message)
      return { success: false, message: error.message }
    }

    // Delete from users table
    const { error: profileError } = await supabase.from('users').delete().eq('id', userId)

    if (profileError) {
      console.error('[Auth] Failed to delete user profile:', profileError.message)
      return { success: false, message: profileError.message }
    }

    console.log('[Auth] ✅ Deleted crew member')
    return { success: true, message: 'Crew member deleted' }
  } catch (err) {
    console.error('[Auth] Delete crew member error:', err)
    return { success: false, message: 'Failed to delete crew member' }
  }
}
