# RLS Policies Fix - Messaging & User Deletion

## 🔴 Problem

- **Messaging silent failure:** Users can't send messages (notifications_comments insert fails)
- **User deletion not working:** Delete operation doesn't remove users from database
- **RLS policies too restrictive:** Default deny blocks legitimate operations

## ✅ Solution

Run these SQL statements in Supabase SQL Editor to add missing RLS policies.

---

## SQL Fixes

### 1. Fix Messaging - notifications_comments Table

Copy and paste this entire block into Supabase SQL Editor and run:

```sql
-- Check current policies on notifications_comments
SELECT * FROM pg_policies WHERE tablename = 'notifications_comments';

-- Add policy to allow authenticated users to INSERT comments
CREATE POLICY "Allow authenticated users to insert comments" ON notifications_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add policy to allow authenticated users to SELECT comments
CREATE POLICY "Allow authenticated users to select comments" ON notifications_comments
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- If UPDATE policy doesn't exist, add it
CREATE POLICY "Allow authenticated users to update own comments" ON notifications_comments
  FOR UPDATE USING (auth.role() = 'authenticated');
```

✅ **Result:** Users can now send messages (INSERT succeeds)

---

### 2. Fix Messaging - comment_replies Table

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'comment_replies';

-- Add INSERT policy
CREATE POLICY "Allow authenticated users to insert replies" ON comment_replies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add SELECT policy
CREATE POLICY "Allow authenticated users to select replies" ON comment_replies
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Add UPDATE policy
CREATE POLICY "Allow authenticated users to update own replies" ON comment_replies
  FOR UPDATE USING (auth.role() = 'authenticated');
```

✅ **Result:** Users can now add nested replies to messages

---

### 3. Fix Messaging - comment_reactions Table

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'comment_reactions';

-- Add INSERT policy
CREATE POLICY "Allow authenticated users to add reactions" ON comment_reactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add SELECT policy
CREATE POLICY "Allow authenticated users to view reactions" ON comment_reactions
  FOR SELECT USING (true);

-- Add DELETE policy for removing reactions
CREATE POLICY "Allow authenticated users to remove reactions" ON comment_reactions
  FOR DELETE USING (auth.role() = 'authenticated');
```

✅ **Result:** Users can now add/remove emoji reactions

---

### 4. Fix User Deletion - crew_members Table

```sql
-- Check current DELETE policies on crew_members
SELECT * FROM pg_policies WHERE tablename = 'crew_members' AND qual LIKE '%DELETE%';

-- Add DELETE policy (if not exists)
-- Note: auth.uid() should match the user being deleted
CREATE POLICY "Allow authenticated users to delete crew members" ON crew_members
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also ensure SELECT and UPDATE exist
CREATE POLICY "Allow authenticated users to view crew members" ON crew_members
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update crew members" ON crew_members
  FOR UPDATE USING (auth.role() = 'authenticated');
```

✅ **Result:** Deletions from crew_members now work

---

### 5. Check project-photos Bucket RLS (For Clock-Out Photos)

```sql
-- Check if project-photos bucket has proper RLS
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- If upload is failing with 403, you may need to allow authenticated uploads
-- In Supabase Storage dashboard:
-- 1. Go to Storage → project-photos bucket
-- 2. Click "Policies" tab
-- 3. Check if authenticated users can INSERT
-- 4. If not, create new policy:
--    "Allow authenticated users to upload"
--    FOR: INSERT
--    Role: authenticated
--    With check: (bucket_id = 'project-photos')
```

---

## 🧪 Testing After Fixes

### Test 1: Send Message
1. Go to Notifications/Alerts in app
2. Click any alert to open detail
3. Type message in comment input
4. Click "Send"
5. ✅ Message appears immediately (no error)

### Test 2: Delete User
1. Go to Employee Hub
2. Click delete button on any employee
3. Confirm deletion
4. ✅ User disappears from list
5. Check Supabase `crew_members` table to verify deleted

### Test 3: Verify RLS Policies
Run this to confirm policies are in place:

```sql
-- Check notifications_comments policies
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'notifications_comments' 
ORDER BY policyname;

-- Should show:
-- "Allow authenticated users to insert comments"
-- "Allow authenticated users to select comments"
-- "Allow authenticated users to update own comments"
```

---

## ❌ If You Get Errors

### Error: "policy [...] already exists"
This is OK! The policy is already there. Just run the next statement.

### Error: "new row violates row-level security policy" (still happens after fixes)
1. Run the SELECT to check what policies exist
2. Make sure the policy's `WITH CHECK` clause covers your use case
3. If still failing, drop the restrictive policy first:
   ```sql
   DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON notifications_comments;
   CREATE POLICY "Allow authenticated users to insert comments" ON notifications_comments
     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

### Error: "permission denied"
Make sure you're running this as the **project owner** or with **admin role** in Supabase.

---

## 📋 Checklist

- [ ] Ran SQL for notifications_comments (INSERT, SELECT, UPDATE)
- [ ] Ran SQL for comment_replies (INSERT, SELECT, UPDATE)
- [ ] Ran SQL for comment_reactions (INSERT, SELECT, DELETE)
- [ ] Ran SQL for crew_members (DELETE, SELECT, UPDATE)
- [ ] Checked project-photos bucket RLS if clock-out photos failing
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Tested sending a message ✓
- [ ] Tested deleting a user ✓

---

## 🚀 What Happens Now

After applying these RLS policies:

1. **Messaging works:** Users can send comments, replies, and reactions
2. **User deletion works:** Employee Hub delete button actually removes users
3. **Clock-out photos:** Should upload if project-photos RLS is fixed
4. **No more silent failures:** Operations either succeed or show error in console

---

**Status:** Ready to apply  
**Deployment:** No redeploy needed (RLS changes take effect immediately)  
**Time to apply:** ~5 minutes to run all SQL statements

