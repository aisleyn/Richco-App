# Supabase Storage Setup Checklist

Quick reference for setting up storage buckets in Supabase.

---

## Prerequisites

✅ Supabase project created (check `.env` file)
✅ Supabase dashboard access: https://app.supabase.com

---

## Bucket Creation (5 minutes)

### 1. Create `project-photos` Bucket

- [ ] Go to Storage → Create bucket
- [ ] Name: `project-photos`
- [ ] Public: **YES** ✅
- [ ] File limit: 100 MB
- [ ] MIME types: `image/*`
- [ ] Click **Create bucket**

### 2. Create `crew-avatars` Bucket

- [ ] Go to Storage → Create bucket
- [ ] Name: `crew-avatars`
- [ ] Public: **YES** ✅
- [ ] File limit: 10 MB
- [ ] MIME types: `image/jpeg`, `image/png`, `image/webp`
- [ ] Click **Create bucket**

### 3. Create `documents` Bucket

- [ ] Go to Storage → Create bucket
- [ ] Name: `documents`
- [ ] Public: **NO** 🔒
- [ ] File limit: 500 MB
- [ ] MIME types: `application/pdf`, `application/xlsx`, `text/*`
- [ ] Click **Create bucket**

### 4. Create `message-attachments` Bucket

- [ ] Go to Storage → Create bucket
- [ ] Name: `message-attachments`
- [ ] Public: **NO** 🔒
- [ ] File limit: 50 MB
- [ ] MIME types: All
- [ ] Click **Create bucket**

---

## Verification (1 minute)

In Supabase Storage page:
- [ ] `project-photos` visible (🔓 public)
- [ ] `crew-avatars` visible (🔓 public)
- [ ] `documents` visible (🔒 private)
- [ ] `message-attachments` visible (🔒 private)

---

## RLS Policies (⏭️ SKIP FOR NOW - Optional for Production)

**Skip this step for now.** Basic bucket setup (public/private toggle) is sufficient.

For **production** security later:
1. Go to **SQL Editor** in Supabase
2. Copy policies from `/docs/SUPABASE_STORAGE_SETUP.md` (Step 6, corrected version)
3. Execute each policy SQL block

**Important:** If you see errors like:
- `"policy already exists"` — Different policies have same name (fixed in updated docs)
- `"WITH CHECK cannot be applied to SELECT"` — Wrong SQL syntax (fixed in updated docs)

Use the **corrected policies** in the updated `SUPABASE_STORAGE_SETUP.md` (just updated above).

---

## Testing (2 minutes)

### Manual Test

1. Open browser DevTools Console
2. Paste and run:

```javascript
// Test project photo upload
const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
const result = await (async () => {
  const formData = new FormData()
  formData.append('file', testFile)
  
  const response = await fetch(
    'https://rsomamqswbezhcaprbol.supabase.co/storage/v1/object/project-photos/test%2Ftest.jpg',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      },
      body: formData
    }
  )
  return response.json()
})()

console.log('Upload result:', result)
```

Or use the `storageService.ts` functions directly:

```javascript
import { uploadProjectPhoto } from './src/services/storageService'

const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
const result = await uploadProjectPhoto('proj-001', file)
console.log('Upload result:', result)
// Expected: { url: 'https://...', path: 'projects/proj-001/photos/...' }
```

3. Check Supabase Dashboard → Storage to verify file appears

---

## Integration (10 minutes)

Files already in place:
- ✅ `/docs/SUPABASE_STORAGE_SETUP.md` — Full setup guide
- ✅ `/src/services/storageService.ts` — Ready to use service functions
- ✅ `.env.example` — Updated with storage variables

### Update PhotosScreen (Next Step)

```typescript
// In PhotosScreen.tsx - BulkUploadModal completion
import { uploadProjectPhoto } from '../../services/storageService'

// Replace: await addPhotos(photosToAdd, userEmail)
// With:
for (const photo of photosToAdd) {
  const result = await uploadProjectPhoto(projectId, photo.file)
  if (result) {
    photo.url = result.url  // Store public URL
    photo.path = result.path  // Store path for deletion
  }
}
await addPhotos(photosToAdd, userEmail)
```

---

## Next Steps

1. **Today**: Create buckets (this checklist)
2. **Next**: Update PhotosScreen to use `storageService.ts`
3. **Then**: Update ProfileScreen for avatar uploads
4. **Finally**: Test end-to-end with real files

---

## Costs

- **Free tier**: 1GB storage included
- **Paid**: $0.021/GB/month + bandwidth

No cost to create buckets or test.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Bucket not found" | Verify name matches exactly: `project-photos` not `projectPhotos` |
| "Unauthorized" | Check bucket is public (🔓) in dashboard |
| "File too large" | Check file size limit in bucket settings |
| "Format not allowed" | Verify MIME type in allowed list |

---

## Status

- [ ] Buckets created
- [ ] Verification passed
- [ ] RLS policies applied (optional)
- [ ] storageService.ts tested
- [ ] PhotosScreen integration started

**Estimated time to complete:** 20 minutes (5 min buckets + 1 min verify + 2 min test + 10 min integration + 2 min deploy)
