# 🚀 Supabase Storage Quick Start

**What:** Set up cloud file storage for the Richco app (photos, documents, avatars)  
**Time:** 10 minutes  
**Next step:** Follow instructions below

---

## ✅ What's Ready to Use

### 📦 Service Created
File: `src/services/storageService.ts`

Functions ready to call:
- `uploadProjectPhoto(projectId, file)` 
- `uploadCrewAvatar(userId, file)`
- `uploadDocument(projectId, file)`
- `uploadMessageAttachment(threadId, file)`

### 📄 Documentation Complete
- `docs/SUPABASE_STORAGE_SETUP.md` — Full guide
- `docs/STORAGE_SETUP_CHECKLIST.md` — Bucket checklist
- `docs/STORAGE_IMPLEMENTATION_SUMMARY.md` — Architecture & integration

---

## 🎯 What To Do Now

### Step 1: Create Buckets (5 minutes)

1. Open https://app.supabase.com
2. Select your project (Richco)
3. Click **Storage** in left sidebar
4. Click **Create a new bucket**

**Bucket 1: `project-photos`**
- Name: `project-photos`
- Public: **YES** ✅
- Size limit: 100 MB
- Create bucket ✓

**Bucket 2: `crew-avatars`**
- Name: `crew-avatars`
- Public: **YES** ✅
- Size limit: 10 MB
- Create bucket ✓

**Bucket 3: `documents`**
- Name: `documents`
- Public: **NO** (🔒 keep private)
- Size limit: 500 MB
- Create bucket ✓

**Bucket 4: `message-attachments`**
- Name: `message-attachments`
- Public: **NO** (🔒 keep private)
- Size limit: 50 MB
- Create bucket ✓

### Step 2: Verify All 4 Buckets
Check Storage page:
- [ ] `project-photos` (🔓 public)
- [ ] `crew-avatars` (🔓 public)
- [ ] `documents` (🔒 private)
- [ ] `message-attachments` (🔒 private)

**Done!** ✅ Storage is ready to use.

---

## 🔐 RLS Policies (Optional - Skip For Now)

If you see SQL errors when creating policies:
- ❌ Skip them for now — not required
- ✅ Buckets work fine with public/private toggle only
- 🔒 Apply policies later for production security

Errors you might see:
- `"policy already exists"` — Policy name conflicts (fixed in updated docs)
- `"WITH CHECK cannot be applied to SELECT"` — SQL syntax error (fixed in updated docs)

**To skip:** Just don't run the SQL. Buckets are fully functional without policies.

---

## 🧪 Test Upload (Optional)

In browser console (or component):

```javascript
// Copy one of these functions into browser console:

// Test: Upload a photo
async function testPhoto() {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg'))
  const file = new File([blob], 'test.jpg', { type: 'image/jpeg' })
  
  const response = await fetch(
    'https://rsomamqswbezhcaprbol.supabase.co/storage/v1/object/project-photos/test%2Ftest.jpg',
    {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb21hbXFzd2JlemhjYXByYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTY4NjksImV4cCI6MjA5Mjg3Mjg2OX0.w6kwFhcRBJ38CpP7LUIDzL1bZWJBRuEae-6XMXeS2nU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb21hbXFzd2JlemhjYXByYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTY4NjksImV4cCI6MjA5Mjg3Mjg2OX0.w6kwFhcRBJ38CpP7LUIDzL1bZWJBRuEae-6XMXeS2nU',
      },
      body: file
    }
  )
  const result = await response.json()
  console.log('Upload result:', result)
  console.log('Public URL:', `https://rsomamqswbezhcaprbol.supabase.co/storage/v1/object/public/project-photos/test/test.jpg`)
}

testPhoto()
```

Expected: File appears in Supabase Storage → `project-photos` → `test` folder

---

## 📋 Integration Checklist

After buckets are created:

- [ ] Buckets visible in Supabase Storage
- [ ] `storageService.ts` reviewed (functions ready)
- [ ] `.env` has Supabase credentials ✅ (already configured)
- [ ] Test photo upload works
- [ ] Ready to integrate with PhotosScreen (next step)

---

## 🔗 Next Steps

1. **PhotosScreen Integration** (10 min)
   - Update BulkUploadModal to use `uploadProjectPhoto()`
   - Replace data URLs with Supabase URLs

2. **ProfileScreen Integration** (5 min)
   - Add avatar upload button
   - Use `uploadCrewAvatar()`

3. **Deploy** (5 min)
   - Push code to GitHub
   - Azure deployment runs automatically

4. **Verify** (5 min)
   - Test photo upload in app
   - Check files in Supabase Storage
   - Verify URLs load

---

## 📞 Help

**Buckets not appearing?**
- Refresh Supabase page
- Check project is selected (top-left)
- Try incognito window

**Need full details?**
- See `docs/SUPABASE_STORAGE_SETUP.md`

**Code examples?**
- See `docs/STORAGE_IMPLEMENTATION_SUMMARY.md`

---

## 💰 Costs

- **Free tier:** 1GB storage (plenty for testing)
- **Paid:** $0.021/GB/month
- **Setup cost:** $0 (no charge to create buckets)

---

**Status:** Ready for bucket creation ✅

**Time estimate:** 10 minutes total (5 min create + 1 min verify + 2 min test + 2 min celebrate)

Let's go! 🚀
