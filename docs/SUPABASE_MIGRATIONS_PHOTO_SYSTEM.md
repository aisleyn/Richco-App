# Supabase Migrations - Photo System

This document contains SQL migrations needed for the complete photo system (clock-out photos, avatars, alert photos, message attachments).

---

## Migration 1: Add avatar_url Column to crew_members

**Purpose:** Store employee profile pictures  
**Table:** `crew_members`  
**Status:** REQUIRED for avatar upload feature

Run this in Supabase SQL Editor:

```sql
-- Add avatar_url column to crew_members table
ALTER TABLE crew_members
ADD COLUMN avatar_url TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN crew_members.avatar_url IS 'URL to employee avatar stored in crew-avatars bucket';
```

After running, verify:
1. Go to Supabase → crew_members table
2. Should see new `avatar_url` column (TEXT)
3. Default is empty string

---

## Migration 2: Update Alerts Table for Photos (Optional)

**Purpose:** Store photo URLs in alerts  
**Table:** `alerts` (if exists)  
**Status:** OPTIONAL (depends on your alerts implementation)

If you have a custom alerts table in Supabase:

```sql
-- Add photos column to alerts
ALTER TABLE alerts
ADD COLUMN photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment
COMMENT ON COLUMN alerts.photos IS 'Array of photo URLs from project-photos bucket';
```

If using JSON format instead:

```sql
ALTER TABLE alerts
ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
```

---

## Migration 3: Message Attachments (Already Exists)

**Status:** COMPLETE ✅

The `messages` table already has these columns:
- `attachment_url` (TEXT)
- `attachment_name` (TEXT)

No migration needed.

---

## Migration 4: Time Entries Photos (Already Exists)

**Status:** COMPLETE ✅

The `time_entries` table already has:
- `photos_count` (INTEGER)

Photos are stored separately in photos table with foreign key to time_entry_id.

---

## How to Apply Migrations

### Option A: Via Supabase Dashboard

1. Open https://app.supabase.com
2. Select your Richco project
3. Click **SQL Editor**
4. Click **New Query**
5. Copy the SQL from above (Migration 1 is required)
6. Click **Run**
7. You should see "Success" message

### Option B: Via Supabase CLI (if configured)

```bash
supabase db push
```

---

## Verification Checklist

After applying migrations:

- [ ] avatar_url column exists in crew_members table
- [ ] Column is TEXT type
- [ ] Default value is empty string
- [ ] You can add/update avatarUrl in code
- [ ] Column shows in Supabase table editor

---

## Rollback (if needed)

If you need to remove a column:

```sql
-- Remove avatar_url column
ALTER TABLE crew_members
DROP COLUMN avatar_url;
```

---

## Related Features

| Feature | Table | Column | Status |
|---------|-------|--------|--------|
| Clock-out photos | photos | (url) | ✅ Working |
| Employee avatars | crew_members | avatar_url | ⏳ Needs migration |
| Message attachments | messages | attachment_url | ✅ Working |
| Alert photos | alerts | photos | ⏳ Optional |

---

## Timeline

- **Migration 1 (avatar_url):** REQUIRED NOW
- **Migrations 2-4:** Optional, already working

Apply Migration 1 in Supabase dashboard (1 minute), then avatar uploads will work!
