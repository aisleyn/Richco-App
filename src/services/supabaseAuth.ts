import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Admin client for privileged operations (password reset, user management)
// Uses service role key - should only be used server-side in production
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

// Debug: Log service role key availability
if (typeof window !== 'undefined') {
  console.log('[Auth] Service role key available:', !!SUPABASE_SERVICE_ROLE_KEY)
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Auth] ⚠️  VITE_SUPABASE_SERVICE_ROLE_KEY not set - password reset will fail!')
  }
}

export interface User {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  role: 'admin' | 'crew'
}

// Register new user
export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: import.meta.env.VITE_APP_URL || 'https://mango-rock-0fadbc31e.7.azurestaticapps.net',
      },
    })

    if (authError) {
      console.error('[Auth] Registration failed:', authError.message)
      return { success: false, message: authError.message }
    }

    if (!authData.user) {
      return { success: false, message: 'Failed to create user account' }
    }

    // Create user profile in users table with 'crew' role by default
    // RLS policy allows users to insert their own profile (id = auth.uid())
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name: `${firstName} ${lastName}`,
      role: 'crew',
    })

    if (profileError) {
      console.error('[Auth] Failed to create user profile:', profileError.message)
      return { success: false, message: `Profile error: ${profileError.message}` }
    }

    // Also create a crew member entry so the user appears in the employee hub
    const { error: crewError } = await supabase.from('crew_members').insert({
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'site_employee',
      status: 'available',
      is_admin: false,
    })

    if (crewError) {
      console.error('[Auth] Failed to create crew member:', crewError.message)
      // Don't fail the whole registration, crew member will be created by the user
    }

    const user: User = {
      id: authData.user.id,
      email,
      name: `${firstName} ${lastName}`,
      role: 'crew',
    }

    console.log('[Auth] ✅ Registration successful:', email)
    return { success: true, message: 'Account created successfully! You can now login.', user }
  } catch (err) {
    console.error('[Auth] Registration error:', err)
    return { success: false, message: 'Failed to create account' }
  }
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
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
    }
  } catch (err) {
    console.error('[Auth] Get user profile error:', err)
    return null
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.firstName && { firstName: updates.firstName }),
        ...(updates.lastName && { lastName: updates.lastName }),
        ...(updates.phone && { phone: updates.phone }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[Auth] Failed to update profile:', error.message)
      return { success: false, message: `Failed to update profile: ${error.message}` }
    }

    // Fetch updated profile
    const user = await getUserProfile(userId)
    if (user) {
      console.log('[Auth] ✅ Profile updated:', userId)
      return { success: true, message: 'Profile updated successfully', user }
    } else {
      return { success: false, message: 'Profile updated but could not fetch updated data' }
    }
  } catch (err) {
    console.error('[Auth] Update profile error:', err)
    return { success: false, message: 'Failed to update profile' }
  }
}

// Create new crew member (admin only)
export async function createCrewMember(email: string, name: string): Promise<{ success: boolean; message: string }> {
  try {
    // Must use service role key (supabaseAdmin), NOT anon key
    if (!supabaseAdmin) {
      console.error('[Auth] Admin service not available')
      return { success: false, message: 'Admin service not available' }
    }

    // First, create auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12)

    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
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
    // Must use service role key (supabaseAdmin), NOT anon key
    if (!supabaseAdmin) {
      console.error('[Auth] Admin service not available')
      return { success: false, message: 'Admin service not available' }
    }

    // First, get the email from users table before deleting
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle to avoid 406 error if user doesn't exist

    const userEmail = userData?.email

    // Delete from auth.users first (requires service role key)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('[Auth] Failed to delete user auth:', authError.message)
      return { success: false, message: authError.message }
    }

    // Delete from users table
    const { error: profileError } = await supabase.from('users').delete().eq('id', userId)

    if (profileError) {
      console.error('[Auth] Failed to delete user profile:', profileError.message)
      return { success: false, message: profileError.message }
    }

    // Delete from crew_members table (by email, since crew_members stores email, not user_id)
    if (userEmail) {
      const { error: crewError } = await supabase
        .from('crew_members')
        .delete()
        .eq('email', userEmail)

      if (crewError) {
        console.error('[Auth] Failed to delete crew member record:', crewError.message)
        // Don't fail if crew_members delete fails, auth and profile were already deleted
      }
    }

    console.log('[Auth] ✅ Deleted crew member with ID:', userId, userEmail ? `(${userEmail})` : '')
    return { success: true, message: 'Crew member deleted successfully' }
  } catch (err) {
    console.error('[Auth] Delete crew member error:', err)
    return { success: false, message: 'Failed to delete crew member' }
  }
}

// Set password directly (admin only - no email verification)
export async function setPasswordDirect(userId: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    // Must use service role key (supabaseAdmin), NOT anon key
    if (!supabaseAdmin) {
      console.error('[Auth] Admin service not available')
      return { success: false, message: 'Admin service not available' }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (error) {
      console.error('[Auth] Failed to set password:', error.message)
      return { success: false, message: error.message }
    }

    console.log('[Auth] ✅ Password set directly for user:', userId)
    return { success: true, message: 'Password updated successfully' }
  } catch (err) {
    console.error('[Auth] Set password error:', err)
    return { success: false, message: 'Failed to set password' }
  }
}

// Request password reset with text code
export async function requestPasswordResetCode(email: string): Promise<{ success: boolean; message: string }> {
  try {
    // First, find the user by email (silently, don't reveal if user exists)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    // Always return success message (security: don't reveal if email exists)
    if (!userData) {
      console.log('[Auth] Password reset requested for non-existent email:', email)
      return { success: true, message: 'If an account exists with that email, a reset code will be sent.' }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store code in database with user_id
    const { error } = await supabase
      .from('password_reset_codes')
      .insert({
        user_id: userData.id,
        code,
        email,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      console.error('[Auth] Failed to create reset code:', error.message)
      return { success: true, message: 'If an account exists with that email, a reset code will be sent.' }
    }

    // Send code via Power Automate flow (with SAS token authentication)
    const POWER_AUTOMATE_FLOW_URL = 'https://e4bdc34769a8e6c783d5b9fd7e2535.13.environment.api.powerplatform.com/powerautomate/automations/direct/cu/14/workflows/7102fc06a2a44db3aeb4a1adccf559e6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=16V0Q2LCWT7kDHb0Ri-NpC89H2aAeXGp4XEQv633-4Y'

    console.log('[Auth] 🔄 Attempting to send email via Power Automate...')
    console.log('[Auth] Flow URL:', POWER_AUTOMATE_FLOW_URL)
    console.log('[Auth] Sending payload:', { email, code })

    try {
      const emailResponse = await fetch(POWER_AUTOMATE_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      console.log('[Auth] Flow response status:', emailResponse.status)
      const responseText = await emailResponse.text()
      console.log('[Auth] Flow response body:', responseText)

      if (emailResponse.ok) {
        console.log('[Auth] ✅ Password reset email sent to:', email)
      } else {
        console.warn('[Auth] ⚠️ Email send failed (flow error), but code was generated:', emailResponse.status, responseText)
        // Still return success - code exists in DB, user can get it another way
      }
    } catch (emailErr) {
      console.warn('[Auth] ⚠️ Failed to call Power Automate flow:', emailErr)
      console.error('[Auth] Full error:', emailErr)
      // Still return success - code exists in DB
    }

    return { success: true, message: 'If an account exists with that email, a reset code will be sent.' }
  } catch (err) {
    console.error('[Auth] Password reset code error:', err)
    return { success: true, message: 'If an account exists with that email, a reset code will be sent.' }
  }
}

// Verify password reset code and update password
export async function verifyPasswordResetCode(code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // Find the code
    const { data: resetData, error: fetchError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (fetchError || !resetData) {
      console.error('[Auth] Invalid or expired code:', fetchError?.message || 'No code found')
      return { success: false, message: 'Invalid or expired code' }
    }

    console.log('[Auth] Found reset code for:', resetData.email, 'User ID:', resetData.user_id)

    // Check if expired
    if (new Date(resetData.expires_at) < new Date()) {
      console.error('[Auth] Reset code expired')
      return { success: false, message: 'Reset code has expired' }
    }

    // Check if already used
    if (resetData.used) {
      console.error('[Auth] Reset code already used')
      return { success: false, message: 'This reset code has already been used' }
    }

    // Use user_id from reset code (more reliable than looking up by email)
    const userId = resetData.user_id
    if (!userId) {
      console.error('[Auth] No user ID in reset code')
      return { success: false, message: 'Invalid reset code data' }
    }

    // Try to use admin client if available, otherwise use regular updateUser
    let updateError = null

    if (supabaseAdmin) {
      console.log('[Auth] Using admin client to update password for user:', userId)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      })
      updateError = error
    } else {
      console.warn('[Auth] ⚠️ Service role key not available, using regular auth update')
      // Fallback: Update the user's password directly via auth method
      // This only works if the user is signed in, but during reset flow they might not be
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      updateError = error
    }

    if (updateError) {
      console.error('[Auth] Failed to update password:', updateError.message)
      return { success: false, message: `Failed to update password: ${updateError.message}` }
    }

    // Mark code as used
    const { error: useError } = await supabase
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', resetData.id)

    if (useError) {
      console.warn('[Auth] Could not mark code as used:', useError.message)
      // Continue anyway - password was updated
    }

    console.log('[Auth] ✅ Password reset successful for:', resetData.email)
    return { success: true, message: 'Password has been reset successfully' }
  } catch (err) {
    console.error('[Auth] Verify reset code error:', err)
    return { success: false, message: `Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}
