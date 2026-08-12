# Storage & Messaging RLS Fixes

## Problems

1. **Photo uploads failing** - Storage bucket RLS blocks authenticated users
2. **Messaging broken** - RLS policies not applied to notifications tables
3. **Auth mismatch** - Storage service using anon key instead of JWT

## Solution: Two Parts

### Part 1: Apply Missing RLS Policies in Supabase SQL

Run each block in Supabase SQL Editor:

#### Messaging Tables RLS

```sql
-- Fix notifications_comments table
CREATE POLICY "Allow authenticated users to insert comments" ON notifications_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select comments" ON notifications_comments
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to update comments" ON notifications_comments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Fix notification_comment_replies table  
CREATE POLICY "Allow authenticated users to insert replies" ON notification_comment_replies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select replies" ON notification_comment_replies
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to update replies" ON notification_comment_replies
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Fix notification_comment_reactions table
CREATE POLICY "Allow authenticated users to insert comment reactions" ON notification_comment_reactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select comment reactions" ON notification_comment_reactions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to delete reactions" ON notification_comment_reactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix notification_reactions table
CREATE POLICY "Allow authenticated users to insert notification reactions" ON notification_reactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to select notification reactions" ON notification_reactions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to delete notification reactions" ON notification_reactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix crew_members table for deletion
CREATE POLICY "Allow authenticated users to view crew members" ON crew_members
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to delete crew members" ON crew_members
  FOR DELETE USING (auth.role() = 'authenticated');
```

#### Storage Buckets RLS

```sql
-- For project-photos bucket (allow authenticated uploads)
CREATE POLICY "Allow authenticated uploads to project-photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public read project-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-photos');

-- For crew-avatars bucket
CREATE POLICY "Allow authenticated uploads to crew-avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'crew-avatars'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public read crew-avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'crew-avatars');

-- For message-attachments bucket
CREATE POLICY "Allow authenticated uploads to message-attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow owner read message-attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );

-- For documents bucket
CREATE POLICY "Allow authenticated uploads to documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow owner read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );
```

### Part 2: Update Storage Service to Use Authenticated JWT

**File:** `src/services/storageService.ts`

Change the authorization to use authenticated user's JWT token:

```typescript
import { getCurrentUser } from './supabaseAuth'

async function storageRequest(
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Storage] Missing Supabase credentials')
    return null
  }

  const url = `${SUPABASE_URL}/storage/v1${endpoint}`
  
  // Get authenticated user's JWT token
  let token = SUPABASE_ANON_KEY
  try {
    const user = await getCurrentUser()
    if (user && user.token) {
      token = user.token
    }
  } catch (err) {
    console.warn('[Storage] Failed to get auth token, using anon key')
  }

  const defaultHeaders: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  }

  const allHeaders = { ...defaultHeaders, ...headers }

  try {
    const config: RequestInit = {
      method,
      headers: allHeaders,
    }

    if (method !== 'GET' && method !== 'DELETE' && body) {
      config.body = body instanceof File ? body : body
    }

    const res = await fetch(url, config)

    if (!res.ok) {
      const errorBody = await res.text()
      console.error(`[Storage] ${method} ${endpoint} failed:`, res.status, errorBody)
      throw new Error(`Storage error: ${res.status}`)
    }

    if (method === 'DELETE') {
      return { success: true }
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch (err) {
    console.error('[Storage] Request failed:', err)
    throw err
  }
}
```

## Testing Checklist

### Messaging
- [ ] Open any alert/notification
- [ ] Type message in comment box
- [ ] Click Send → Message appears immediately
- [ ] Reply to comment → Reply appears indented
- [ ] Add emoji reaction → Emoji appears on message

### Photo Upload
- [ ] Clock out at a site
- [ ] Add photo during clock-out
- [ ] See upload progress
- [ ] Photo appears in photos list
- [ ] Check Supabase: project-photos bucket shows file

### User Deletion
- [ ] Go to Employee Hub (admin)
- [ ] Click delete on employee
- [ ] Confirm
- [ ] User disappears from list
- [ ] Check Supabase crew_members table - user gone

## If Still Not Working

### Check Browser Console (F12)

Look for:
```
[Storage] Request failed: Error: Storage error: 403
→ Means RLS policy blocks upload

[Storage] Request failed: Error: Storage error: 401
→ Means authentication token missing/invalid

POST /storage/v1/object/* 403 Forbidden
→ Storage bucket RLS blocking access

mutations.upsertNotificationComment - new row violates row-level security
→ Messaging RLS policy missing/wrong
```

### Verify RLS Policies Exist

Run in Supabase SQL Editor:

```sql
-- Count messaging policies
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('notifications_comments', 'notification_comment_replies', 'notification_comment_reactions', 'notification_reactions');

-- Count storage policies
SELECT COUNT(*) as storage_policy_count
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

Should show:
- `policy_count` = 12 (minimum)
- `storage_policy_count` ≥ 8

## Timeline

- Apply Part 1 (RLS): 5 minutes
- Apply Part 2 (Code): 10 minutes
- Test all features: 10 minutes
- **Total: 25 minutes**
