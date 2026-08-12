# Apply Missing Migrations - Messaging & Reactions

## Problem

When you tried to run the RLS SQL, you got:
```
ERROR: 42P01: relation "comment_replies" does not exist
```

**Why?** The migration files exist in your repo but haven't been applied to Supabase yet.

## What's Missing

These migrations exist in `migrations/` folder but need to be run in Supabase:

1. ✅ **Migration 014** - `notifications_comments` table (ALREADY APPLIED)
2. ❌ **Migration 015** - Nested replies, comment reactions, comment views
3. ❌ **Migration 016** - Notification-level reactions
4. ❌ **Migration 017** - Nested replies with threading
5. ✅ **Migration 018** - Password reset codes
6. ✅ **Migration 019** - RLS fixes
7. ✅ **Migration 020** - Registration RLS
8. ✅ **Migration 021** - Notifications RLS

---

## What These Migrations Add

### Migration 015 (MOST IMPORTANT)

Adds 3 new tables:

1. **notification_comment_replies**
   - Allows replying to comments
   - Supports nested replies
   - Already has RLS policies

2. **notification_comment_reactions**
   - Like/Dislike/Question emoji reactions on comments
   - Unique constraint (1 reaction per user per comment)
   - Already has RLS policies

3. **notification_comment_views**
   - Track who viewed each comment
   - Already has RLS policies

### Migration 016

Adds 1 table:

**notification_reactions**
- Like/Dislike/Question reactions on notifications (not comments)
- Already has RLS policies

### Migration 017

Adds nested reply threading (reply to specific replies, not just comments)

---

## How to Apply the Migrations

### Option 1: Copy-Paste SQL (Easiest)

1. Open `migrations/015_add_comment_replies_and_reactions.sql` in your editor
2. Copy all the SQL
3. Go to Supabase Dashboard → SQL Editor
4. Paste and run
5. Repeat for migrations 016 and 017

### Option 2: Apply One File at a Time

**Migration 015:**
```bash
# Open this file and copy the entire content
cat migrations/015_add_comment_replies_and_reactions.sql
```

Then in Supabase SQL Editor, paste and run.

**Migration 016:**
```bash
cat migrations/016_add_notification_reactions.sql
```

**Migration 017:**
```bash
cat migrations/017_add_nested_replies.sql
```

---

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Log into Supabase dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New Query"

### Step 2: Copy Migration 015

1. Open `C:\Users\aisle\Richco\richco-app\migrations\015_add_comment_replies_and_reactions.sql`
2. Select all text (Ctrl+A)
3. Copy (Ctrl+C)

### Step 3: Run in Supabase

1. In Supabase SQL Editor, click in the text area
2. Paste (Ctrl+V)
3. Click "Run" button (or Ctrl+Enter)
4. ✅ Should say "Query executed successfully"

### Step 4: Repeat for 016 and 017

Do the same for:
- `migrations/016_add_notification_reactions.sql`
- `migrations/017_add_nested_replies.sql`

### Step 5: Verify All Tables Created

Run this query in Supabase to verify:

```sql
-- List all tables related to notifications
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'notification%'
ORDER BY tablename;
```

Should show:
```
notification_comment_reactions
notification_comment_replies
notification_comment_views
notifications
notifications_comments
notifications_views
notification_reactions
```

---

## After Migrations Are Applied

Once all migrations are applied:

✅ **Messaging works** - Comments on notifications
✅ **Nested replies work** - Reply to comments with threading  
✅ **Emoji reactions work** - Like/dislike/question on comments
✅ **Notification reactions work** - Emoji reactions on notifications
✅ **View tracking works** - See who viewed comments/notifications

All with RLS policies already in place!

---

## Quick Reference: Which Migrations to Run

| # | File | What It Adds | Status |
|---|------|-------------|--------|
| 014 | `notifications_comments` | Basic comments | ✅ Already applied |
| 015 | `comment_replies_and_reactions` | Nested replies, comment emoji, view tracking | ❌ **Run this** |
| 016 | `notification_reactions` | Notification-level emoji reactions | ❌ **Run this** |
| 017 | `nested_replies` | Better threading for replies | ❌ **Run this** |

---

## Troubleshooting

### "ERROR: relation X already exists"

This is OK! It means the migration was already applied. Just run the next migration.

### "ERROR: 42P01: relation X does not exist"

The table is referenced but not yet created. Make sure you ran the migration that creates it first (run migrations in order: 015, 016, 017).

### After applying, messaging still doesn't work

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console (F12) for errors
4. Run the verify query above to confirm all tables exist

---

## Files Needed

All these files already exist in your repo:
- `migrations/015_add_comment_replies_and_reactions.sql` ✅
- `migrations/016_add_notification_reactions.sql` ✅
- `migrations/017_add_nested_replies.sql` ✅

Just copy their contents to Supabase SQL Editor!

---

## After This Session

Once migrations are applied:
1. Rebuild app: `npm run build`
2. Test messaging again
3. Test nested replies (click "Reply" on a comment)
4. Test emoji reactions (click 👍/👎/❓ on comments)

All should work now! 🚀

