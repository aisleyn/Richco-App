# Supabase Storage Bucket Setup

This guide walks through creating and configuring Supabase storage buckets for the Richco app. Storage is used for photos, documents, and employee avatars.

---

## Overview

**4 Storage Buckets:**
1. `project-photos` — Site photos, inspections, progress images
2. `crew-avatars` — Employee profile pictures
3. `documents` — PDFs, reports, company documents
4. `message-attachments` — Files shared in messages

---

## Prerequisites

- Supabase project created (see `.env` for `VITE_SUPABASE_URL`)
- Access to Supabase dashboard at https://app.supabase.com

---

## Step 1: Navigate to Storage

1. Open https://app.supabase.com
2. Select your project (Richco)
3. Left sidebar → **Storage**
4. Click **Create a new bucket**

---

## Step 2: Create `project-photos` Bucket

**Configuration:**
- **Bucket name:** `project-photos`
- **Public bucket:** ✅ YES (photos need public URLs)
- **File size limit:** 100 MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Steps:**
1. Enter name: `project-photos`
2. Toggle "Public bucket" ON
3. Click **Create bucket**

**Bucket Details:**
- Used by: PhotosScreen, BulkUploadModal, TimesheetScreen
- File type: Images only
- Naming: `projects/{projectId}/photos/{timestamp}-{filename}`
- Cleanup: Old photos auto-deleted (see retention policy below)

---

## Step 3: Create `crew-avatars` Bucket

**Configuration:**
- **Bucket name:** `crew-avatars`
- **Public bucket:** ✅ YES (avatars shown in UI)
- **File size limit:** 10 MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`

**Steps:**
1. Enter name: `crew-avatars`
2. Toggle "Public bucket" ON
3. Click **Create bucket**

**Bucket Details:**
- Used by: ProfileScreen, EmployeeProfileSheet, CrewScreen
- File type: Images only
- Naming: `crew/{userId}/avatar.{ext}`
- Update: Replace on each upload (single avatar per crew member)

---

## Step 4: Create `documents` Bucket

**Configuration:**
- **Bucket name:** `documents`
- **Public bucket:** ❌ NO (documents are private)
- **File size limit:** 500 MB
- **Allowed MIME types:** `application/pdf`, `text/plain`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Steps:**
1. Enter name: `documents`
2. Toggle "Public bucket" OFF
3. Click **Create bucket**

**Bucket Details:**
- Used by: Document uploads, reports, company files
- File type: PDFs, spreadsheets, text
- Naming: `projects/{projectId}/documents/{timestamp}-{filename}`
- Access: Requires authentication + RLS policies

---

## Step 5: Create `message-attachments` Bucket

**Configuration:**
- **Bucket name:** `message-attachments`
- **Public bucket:** ❌ NO (private messages)
- **File size limit:** 50 MB
- **Allowed MIME types:** All common types

**Steps:**
1. Enter name: `message-attachments`
2. Toggle "Public bucket" OFF
3. Click **Create bucket**

**Bucket Details:**
- Used by: Message threads
- File type: Any attachment
- Naming: `threads/{threadId}/{timestamp}-{filename}`
- Access: Only message participants can view

---

## Step 6: Configure RLS Policies (Important!)

### For `project-photos` (Public):

```sql
-- Allow anyone to read
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-photos');

-- Allow authenticated users to upload to their project
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'project-photos' 
    AND auth.role() = 'authenticated'
  );
```

### For `crew-avatars` (Public):

```sql
-- Allow anyone to read
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'crew-avatars');

-- Allow users to update their own avatar
CREATE POLICY "Allow users to update own avatar" ON storage.objects
  FOR UPDATE
  WITH CHECK (
    bucket_id = 'crew-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### For `documents` (Private):

```sql
-- Allow authenticated users to read their project docs
CREATE POLICY "Allow authenticated read" ON storage.objects
  FOR SELECT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );
```

### For `message-attachments` (Private):

```sql
-- Allow authenticated users only
CREATE POLICY "Allow authenticated access" ON storage.objects
  FOR ALL
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
  );
```

---

## Step 7: Verify Bucket Setup

In Supabase dashboard:
- [ ] **Storage** → All 4 buckets visible
- [ ] **project-photos**: Public bucket (🔓)
- [ ] **crew-avatars**: Public bucket (🔓)
- [ ] **documents**: Private bucket (🔒)
- [ ] **message-attachments**: Private bucket (🔒)

---

## Step 8: Environment Variables

Add to `.env.local` (already configured in `.env`):

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://rsomamqswbezhcaprbol.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

No additional env vars needed — buckets use REST API.

---

## Usage Examples

### Upload Photo to `project-photos`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
const path = `projects/${projectId}/photos/${Date.now()}-photo.jpg`

const { data, error } = await supabase.storage
  .from('project-photos')
  .upload(path, file)

if (error) {
  console.error('Upload failed:', error)
  return
}

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('project-photos')
  .getPublicUrl(data.path)

console.log('Photo URL:', publicUrl)
```

### Upload Avatar to `crew-avatars`

```typescript
const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
const path = `crew/${userId}/avatar.jpg`

// Delete old avatar first
await supabase.storage.from('crew-avatars').remove([path])

const { error } = await supabase.storage
  .from('crew-avatars')
  .upload(path, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('crew-avatars')
  .getPublicUrl(path)
```

### Upload Document to `documents`

```typescript
const file = new File([blob], 'report.pdf', { type: 'application/pdf' })
const path = `projects/${projectId}/documents/${Date.now()}-report.pdf`

const { data, error } = await supabase.storage
  .from('documents')
  .upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })

// Generate signed URL (private bucket)
const { data: { signedUrl } } = await supabase.storage
  .from('documents')
  .createSignedUrl(data.path, 3600) // 1 hour expiry
```

---

## File Structure Example

After uploads, buckets will look like:

```
project-photos/
├── projects/
│   ├── proj-001/
│   │   └── photos/
│   │       ├── 1723339200000-foundation.jpg
│   │       ├── 1723339800000-framing.jpg
│   │       └── 1723340400000-electrical.jpg
│   └── proj-002/
│       └── photos/
│           └── 1723341000000-site-conditions.jpg

crew-avatars/
├── crew/
│   ├── 1/
│   │   └── avatar.jpg
│   ├── 2/
│   │   └── avatar.jpg
│   └── 3/
│       └── avatar.jpg

documents/
├── projects/
│   ├── proj-001/
│   │   └── documents/
│   │       ├── 1723342000000-schedule.pdf
│   │       └── 1723342600000-budget.xlsx
│   └── proj-002/
│       └── documents/
│           └── 1723343200000-report.pdf

message-attachments/
├── threads/
│   ├── thread-001/
│   │   ├── 1723344000000-photo.jpg
│   │   └── 1723344600000-document.pdf
│   └── thread-002/
│       └── 1723345200000-invoice.pdf
```

---

## Storage Service Implementation

After buckets are created, create this service:

**File:** `src/services/storageService.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Project Photos
export async function uploadProjectPhoto(
  projectId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  try {
    const path = `projects/${projectId}/photos/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('project-photos')
      .upload(path, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('project-photos')
      .getPublicUrl(data.path)

    return { url: publicUrl, path: data.path }
  } catch (err) {
    console.error('[Storage] Upload failed:', err)
    return null
  }
}

// Crew Avatars
export async function uploadCrewAvatar(
  userId: number,
  file: File
): Promise<{ url: string; path: string } | null> {
  try {
    const path = `crew/${userId}/avatar.jpg`

    // Delete old avatar
    await supabase.storage.from('crew-avatars').remove([path])

    const { data, error } = await supabase.storage
      .from('crew-avatars')
      .upload(path, file, { upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('crew-avatars')
      .getPublicUrl(data.path)

    return { url: publicUrl, path: data.path }
  } catch (err) {
    console.error('[Storage] Avatar upload failed:', err)
    return null
  }
}

// Documents (Private)
export async function uploadDocument(
  projectId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  try {
    const path = `projects/${projectId}/documents/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (error) throw error

    // Generate signed URL (1 hour expiry)
    const { data: { signedUrl } } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 3600)

    return { url: signedUrl, path: data.path }
  } catch (err) {
    console.error('[Storage] Document upload failed:', err)
    return null
  }
}

// Message Attachments (Private)
export async function uploadMessageAttachment(
  threadId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  try {
    const path = `threads/${threadId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(path, file)

    if (error) throw error

    // Generate signed URL (24 hour expiry for messages)
    const { data: { signedUrl } } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(data.path, 86400)

    return { url: signedUrl, path: data.path }
  } catch (err) {
    console.error('[Storage] Attachment upload failed:', err)
    return null
  }
}

// Delete file
export async function deleteStorageFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
    return true
  } catch (err) {
    console.error('[Storage] Delete failed:', err)
    return false
  }
}
```

---

## Testing Buckets

### 1. Test Public Photo Upload

```typescript
// In browser console or component:
const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
const result = await uploadProjectPhoto('proj-001', testFile)
console.log('Upload result:', result)
// Expected: { url: 'https://...', path: 'projects/proj-001/photos/...' }
```

### 2. Test Avatar Upload

```typescript
const testFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
const result = await uploadCrewAvatar(1, testFile)
console.log('Avatar result:', result)
```

### 3. Verify Bucket Contents

In Supabase dashboard:
- Storage → `project-photos` → Can see uploaded files
- Storage → `crew-avatars` → Can see avatar files
- Storage → `documents` → Can see document files
- Storage → `message-attachments` → Can see attachments

---

## Security Notes

✅ **Public Buckets** (`project-photos`, `crew-avatars`):
- Anyone can view/download
- URLs don't expire
- Good for profile pictures, visible site photos

❌ **Private Buckets** (`documents`, `message-attachments`):
- Require authentication
- URLs expire after 1 hour
- Regenerate for each access
- RLS policies enforce access control

---

## Troubleshooting

### Upload Fails: "Bucket not found"

```
→ Verify bucket name in storage service exactly matches Supabase
→ Check bucket exists in Storage → Buckets list
```

### Upload Fails: "Unauthorized"

```
→ Check RLS policy is enabled for bucket
→ Verify user is authenticated (for private buckets)
→ Check bucket name in RLS policy matches
```

### Public URL Doesn't Work

```
→ Bucket must be public (toggle in Storage)
→ File path must exist in bucket
→ Try accessing signed URL instead (valid for all buckets)
```

### File Size Exceeded

```
→ Check bucket file size limit matches your file
→ Resize/compress before upload
→ Contact Supabase support to increase limit
```

---

## Costs

- **Storage**: $0.021 per GB/month
- **Bandwidth**: $0.09 per GB (downloads)
- **Example**: 10GB photos + 2GB documents = ~$1.10/month + bandwidth

Supabase free tier includes 1GB storage, perfect for testing.

---

## Next Steps

1. ✅ Create all 4 buckets (5 minutes)
2. ✅ Configure RLS policies (2 minutes)
3. Create `storageService.ts` (5 minutes)
4. Integrate into PhotosScreen component
5. Add avatar upload to ProfileScreen
6. Test file uploads end-to-end
7. Monitor bucket usage in Supabase dashboard

---

**Status:** Ready to configure
**Commit:** Will update after bucket creation
**Deployment:** No changes needed to app — ready to use existing service
