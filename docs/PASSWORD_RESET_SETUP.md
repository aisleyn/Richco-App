# Password Reset System Setup

## Overview

The app uses a custom password reset flow with email codes (sent via Power Automate) instead of Supabase's default reset links. This allows for better UX and custom email branding.

## Database Requirements

### 1. Create `password_reset_codes` Table

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_codes_code ON password_reset_codes(code);
CREATE INDEX idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_user_id ON password_reset_codes(user_id);

-- Enable RLS
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (they need the email)
CREATE POLICY "Users can insert reset codes" ON password_reset_codes
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read their own codes
CREATE POLICY "Users can read own reset codes" ON password_reset_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Allow unauthenticated to find codes (needed for reset flow)
CREATE POLICY "Reset codes are readable for verification" ON password_reset_codes
  FOR SELECT USING (true);

-- Only the auth system can update
CREATE POLICY "Only auth can update reset codes" ON password_reset_codes
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### 2. Environment Variables Required

Add to `.env.local`:

```env
VITE_SUPABASE_URL=https://rsomamqswbezhcaprbol.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Important:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` is exposed in the client-side code. This is a temporary solution. In production, password resets should happen server-side only.

### 3. Power Automate Flow Setup

The password reset code is sent via Power Automate HTTP trigger.

**Flow Configuration:**
- Trigger: HTTP request
- Inputs: `email` (string), `code` (string)
- Action: Send email with the code

See the flow URL in `supabaseAuth.ts` line 442.

## How It Works

### 1. User Requests Password Reset

```
ForgotPasswordScreen
  ↓ Enter email
  → requestPasswordResetCode(email)
    → Generate 6-digit code
    → Store in password_reset_codes table with user_id + 15min expiry
    → Send code via Power Automate
    → Show "Check your email"
```

### 2. User Receives Code & Enters It

```
ResetPasswordScreen
  ↓ User enters 6-digit code + new password
  → verifyPasswordResetCode(code, newPassword)
    → Find code in database
    → Verify not expired, not already used
    → Get user_id from code
    → Update user's password in auth
    → Mark code as used
    → Show "Password reset successfully"
```

### 3. User Logs In with New Password

```
LoginScreen
  ↓ Enter email + new password
  → login(email, password)
    → Supabase auth.signInWithPassword()
    → ✅ Success!
```

## Troubleshooting

### Error: "Invalid or expired code"

- Code is wrong (verify in Supabase `password_reset_codes` table)
- Code expired (15-minute window)
- Code already used (try requesting new one)
- Code doesn't exist in database

**Check:** Go to Supabase SQL Editor and run:
```sql
SELECT * FROM password_reset_codes 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC;
```

### Error: "Failed to update password: User not found"

This means the user exists in the `password_reset_codes` table but the auth system can't find them.

**Possible causes:**
1. User wasn't confirmed after signup
2. User was deleted from auth but exists in users table
3. Service role key doesn't have permission
4. Auth user ID doesn't match user_id in reset code table

**Fix:**
1. Verify user exists in Supabase Auth (Dashboard → Authentication → Users)
2. If missing, ask user to sign up again
3. Check that `password_reset_codes.user_id` matches `auth.users.id`

### Error: "Code already used"

User already reset their password with this code. They need to request a new code.

**Fix:** Ask user to go through password reset again.

## Security Notes

⚠️ **Current Risk:** The service role key is exposed in client-side JavaScript. This is a security issue.

**Production Fix:** Implement a backend endpoint that:
1. Receives code + newPassword from client
2. Uses service role key (kept on server) to update password
3. Returns result to client

Example backend (Node.js):
```javascript
app.post('/api/reset-password', async (req, res) => {
  const { code, newPassword } = req.body
  
  // Find code in DB
  const codeRecord = await db.query(
    'SELECT user_id FROM password_reset_codes WHERE code = $1',
    [code]
  )
  
  if (!codeRecord) return res.status(400).json({ error: 'Invalid code' })
  
  // Use server-side service role key
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    codeRecord.user_id,
    { password: newPassword }
  )
  
  return res.json({ success: !error })
})
```

## Testing

### Test Reset Flow

1. **Signup**
   - Go to Login → Forgot Password → Sign Up
   - Email: `test@example.com`
   - Password: `TestPassword123`

2. **Request Reset**
   - Go to Forgot Password
   - Enter email
   - Check console logs for code (or check DB if email fails)

3. **Enter Code**
   - Copy code from email or console
   - Enter in reset form
   - New password: `NewPassword456`
   - Should succeed

4. **Login with New Password**
   - Email: `test@example.com`
   - Password: `NewPassword456`
   - Should login successfully

### Test with Multiple Accounts

```sql
-- Check all reset codes
SELECT id, email, code, used, expires_at 
FROM password_reset_codes 
ORDER BY created_at DESC;

-- Clear test codes (optional)
DELETE FROM password_reset_codes 
WHERE email = 'test@example.com';
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Email not received | Power Automate flow offline | Check flow in Power Automate, verify trigger URL in code |
| Code doesn't work | User not in auth system | Verify user registered in Supabase Auth |
| "Already used" error | Code reused | Request new password reset |
| Timeout waiting for code | Email service slow | Wait 2-3 minutes, then request new code |
| Can't login after reset | Password wasn't saved | Try reset again, verify auth.users table updated |

## Verification Checklist

- [ ] `password_reset_codes` table exists
- [ ] RLS policies applied to table
- [ ] Power Automate flow URL working (test manually in Postman)
- [ ] Service role key in environment variables
- [ ] Tested full reset flow: forgot → code → new password → login

---

**Status:** Ready for testing  
**Deployment:** Automatic via GitHub Actions  
**Docs:** See this file for troubleshooting
