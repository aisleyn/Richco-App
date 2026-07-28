# Emergency Password Management Guide

When nobody can log into the app, use these tools to reset passwords directly in Supabase.

## Quick Start

### Option 1: PowerShell (Windows - Recommended)

```powershell
# Run from the richco-app directory
.\SET_PASSWORD.ps1 -email "user@example.com" -newPassword "NewPassword123"
```

The script will:
1. Prompt you for your Supabase Service Role Key (one-time)
2. Look up the user by email
3. Set their password
4. Log the reset in the database

### Option 2: Bash/curl (Mac/Linux)

```bash
./set_password.sh -e "user@example.com" -p "NewPassword123" -k "your_service_role_key"
```

### Option 3: Manual REST API (Any Platform)

```powershell
# PowerShell
$email = "user@example.com"
$newPassword = "NewPassword123"
$serviceRoleKey = "your_service_role_key"
$supabaseUrl = "https://xwpghxnyhqqafgwumejt.supabase.co"

# Step 1: Get user ID
$headers = @{
    "Authorization" = "Bearer $serviceRoleKey"
    "apikey" = $serviceRoleKey
}

$user = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?email=eq.$email&select=id" -Headers $headers
$userId = $user[0].id

# Step 2: Set password
$body = @{ password = $newPassword } | ConvertTo-Json

Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users/$userId" `
  -Headers $headers `
  -Method Put `
  -Body $body `
  -ContentType "application/json"

Write-Host "✅ Password updated for $email"
```

---

## Getting Your Service Role Key

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (bottom left)
3. Click **API**
4. Copy the **Service Role Key** (keep this secret!)

Never commit this key to git. The script will prompt you for it each time if not provided.

---

## Setup (First Time Only)

Run this SQL in Supabase SQL Editor to create the password_resets tracking table:

```sql
-- Password resets tracking table
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage password resets" ON public.password_resets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

Alternatively, run the migration:
```bash
# In your database tool or Supabase SQL Editor
\i migrations/password_reset_table.sql
```

---

## Troubleshooting

### "User not found"
- Check the email spelling (case-sensitive in some contexts)
- Verify the user exists in Supabase `users` table

### "Unauthorized" or "Invalid Service Role Key"
- Make sure you copied the **Service Role Key**, not the **API Key**
- Service Role Key starts with `eyJ...` and is longer

### "Password update failed"
- Check Supabase project is active (not paused)
- Verify the user ID matches a valid auth user
- Check Service Role Key has admin permissions

---

## What This Does

The scripts use the **Supabase Admin API** to:
1. Query the `users` table to find user ID by email
2. Call `/auth/v1/admin/users/{id}` with the Service Role Key
3. Set the password directly (bypassing email confirmation)
4. Optionally log the reset in the `password_resets` tracking table

This is the proper, secure way to manage passwords outside the app.

---

## Recreating a User (Nuclear Option)

If a user is truly corrupted and can't be fixed:

```powershell
# Delete and recreate via PowerShell
$email = "user@example.com"
$newPassword = "NewPassword123"

# Delete the auth user (app handles the cascade to users table)
# Then recreate:

# Via the app's createCrewMember function or manually:
curl -X POST "https://xwpghxnyhqqafgwumejt.supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer $serviceRoleKey" \
  -d '{"email":"'$email'","password":"'$newPassword'","email_confirm":true}'
```

---

## Key Points

✅ **Always use the Service Role Key** — never the anonymous key  
✅ **This bypasses email confirmation** — user gets immediate access  
✅ **Log all resets** in the password_resets table for audit trail  
✅ **Keep Service Role Key secret** — treat it like a password  
❌ **Never use direct SQL** with `crypt()` to modify auth.users  
❌ **Never commit Service Role Key** to git
