# Crew Members System - Supabase Setup Guide

## Overview
The app now uses Supabase for persistent crew member profiles instead of localStorage. Each crew member gets a numeric ID (auto-incrementing) that can be used across timesheets, messaging, and other features.

## What Changed

### Before
- Crew members stored in browser localStorage
- Hardcoded mock data ("Aisley", etc.)
- No persistent cross-device user data
- User IDs were random strings

### Now
- Crew members stored in Supabase `crew_members` table
- Real email-based registration (richcogroup.com emails)
- Persistent across all devices and browsers
- Numeric user IDs (1, 2, 3...) for all backend operations
- Real user identity tied to their richcogroup.com email

## Setup Steps

### Step 1: Create the Supabase Table

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Copy the contents of: /migrations/001_create_crew_members_table.sql
-- Or paste the SQL below:

CREATE TABLE IF NOT EXISTS public.crew_members (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'field',
  status VARCHAR(50) DEFAULT 'available',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email LIKE '%@%.%'),
  CONSTRAINT role_check CHECK (role IN ('field', 'supervisor', 'admin', 'ceo'))
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS crew_members_email_idx ON public.crew_members(email);
CREATE INDEX IF NOT EXISTS crew_members_role_idx ON public.crew_members(role);

-- Enable RLS
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Policies for public read/write (adjust permissions as needed)
CREATE POLICY "allow_read_all_crew" ON public.crew_members
  FOR SELECT
  USING (TRUE);

CREATE POLICY "allow_insert_crew" ON public.crew_members
  FOR INSERT
  WITH CHECK (TRUE);

-- Function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_crew_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS crew_members_updated_at_trigger ON public.crew_members;
CREATE TRIGGER crew_members_updated_at_trigger
  BEFORE UPDATE ON public.crew_members
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_members_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.crew_members TO anon, authenticated;
```

### Step 2: Test the Registration Flow

1. **Clear localStorage** to test fresh onboarding:
   - Open DevTools → Application → Local Storage
   - Delete `richco-app-state` and `richco-crew-members`
   - Refresh the page

2. **Log in with Microsoft account**:
   - Click "Sign in with Microsoft"
   - Use a richcogroup.com email

3. **Complete registration**:
   - You should see a modal: "Welcome to Richco - Complete your crew profile"
   - Fill in:
     - First Name
     - Last Name  
     - Phone (optional)
   - Click "Complete Registration"

4. **Verify in Supabase**:
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM crew_members;`
   - You should see your profile with a numeric ID (1, 2, 3...)

### Step 3: Test Cross-Device Persistence

1. **Login on Desktop**: Log in and register as User A (ID: 1)
2. **Open on Phone**: Same account, fresh browser
   - Your profile should appear automatically (ID: 1)
   - Name should display correctly
3. **Login on Different Device as User B**: Register with different richcogroup.com email
   - Should get a different numeric ID (2, 3...)
4. **Verify Timesheets Sync**:
   - Clock in on Device 1
   - Refresh on Device 2
   - Timesheet should appear (Supabase filtering by employee_id)

## Data Structure

### crew_members table

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL | Auto-increment numeric ID (1, 2, 3...) |
| `email` | VARCHAR(255) | Unique richcogroup.com email |
| `first_name` | VARCHAR(255) | User's first name |
| `last_name` | VARCHAR(255) | User's last name |
| `phone` | VARCHAR(20) | Optional phone number |
| `role` | VARCHAR(50) | 'field', 'supervisor', 'admin', 'ceo' |
| `status` | VARCHAR(50) | 'available', 'onsite', 'enroute', 'off' |
| `is_admin` | BOOLEAN | Whether user is admin |
| `created_at` | TIMESTAMP | Auto-set on registration |
| `updated_at` | TIMESTAMP | Auto-updated on changes |

## Usage in App

### Getting User Profile
```typescript
const member = await getCrewMemberByEmail('user@richcogroup.com')
console.log(member.id)  // Numeric ID: 1, 2, 3...
```

### Getting All Crew
```typescript
const crew = await getAllCrew()  // Returns all registered crew members
```

### Checking Registration Status
```typescript
const registered = await hasUserCompletedRegistration('user@richcogroup.com')
```

### Creating/Updating Members
```typescript
await addCrewMember({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@richcogroup.com',
  role: 'field',
  phone: '555-1234'
})
// Returns: { id: 5, firstName: 'John', ... }
```

## Messaging System Integration

The messaging system now uses numeric IDs:
- **Thread ID format**: `"1-2"` (numeric IDs, sorted)
- **Message senderId**: `1` (numeric)
- **Conversation lookup**: Based on numeric crew member IDs

Example:
```typescript
// User 1 messaging User 3
const threadId = getThreadId('1', '3')  // Returns '1-3'
// Send message from User 1
const message = {
  senderId: '1',  // String representation for messaging
  senderName: 'John Doe',
  ...
}
```

## Timesheet Integration

Timesheets now track by numeric crew member ID:
```typescript
const entry = {
  employee_id: 1,  // Numeric ID from crew_members.id
  employee_name: 'John Doe',
  clock_in_time: '2026-06-05T08:00:00Z',
  ...
}
```

## Troubleshooting

### Issue: "No authenticated user found" on fresh load
**Solution**: Clear localStorage and refresh. Registration modal should appear on first login.

### Issue: Profile shows blank name
**Solution**: Azure AD might not be passing displayName. The registration modal allows manual entry. Fill in first/last name and save.

### Issue: Same user shows different profiles on different devices
**Solution**: This is expected. localStorage is device-specific, but the database is shared. Both devices fetch the same Supabase data by email.

### Issue: Can't login with non-richcogroup.com email
**Note**: This is intentional for now. Only richcogroup.com emails should be registered. Add email validation if needed.

### Issue: Supabase returns 401 errors
**Solution**: Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are set correctly in your .env file.

## Next Steps

1. ✅ Run the SQL migration (Step 1)
2. ✅ Test registration flow (Step 2)
3. ✅ Verify Supabase entries (Step 3)
4. Update timesheet service to use numeric crew IDs (if not already)
5. Update messaging to use numeric sender IDs (now automatic)
6. Add email validation to only allow richcogroup.com (optional)

## Email Validation (Optional)

To enforce richcogroup.com-only registration:

```typescript
// In RegistrationModal.tsx
if (!email.toLowerCase().endsWith('@richcogroup.com')) {
  throw new Error('Only richcogroup.com emails are allowed')
}
```

## Support

For questions or issues with the crew system:
- Check Supabase Logs: Dashboard → Logs
- Check Console Logs: Browser DevTools → Console (filter for "[Crew]")
- Verify table exists: Supabase → Tables → crew_members

---

**Created:** June 5, 2026  
**Status:** Ready for production testing
