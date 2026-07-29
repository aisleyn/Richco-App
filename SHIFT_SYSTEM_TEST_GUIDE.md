# Shift System End-to-End Testing Guide

**Status:** Dev server running on http://localhost:5173  
**Prerequisites:** Admin user is now set up in Supabase with is_admin=true ✅

---

## Phase 1: Create a Shift (Admin User)

1. **Navigate to Admin Dashboard**
   - Open http://localhost:5173
   - Login as: **nolanaisley@gmail.com**
   - Expected: Redirected to admin dashboard

2. **Access Shift Creation Form**
   - Look for "Create Shift" button on the Timesheet screen
   - Or navigate via admin menu if available

3. **Fill Shift Details**
   - **Date**: Tomorrow or any future date
   - **Start Time**: 8:00 AM (hour: 8, min: 00)
   - **End Time**: 5:00 PM (hour: 17, min: 00)
   - **Project**: Select from dropdown (e.g., "Park A Maintenance")
   - **Park Opening Time**: 9:00 AM
   - **Park Closing Time**: 6:00 PM

4. **Add Shift Locations** (Multi-location support)
   - Click "Add Location"
   - Enter address 1: "123 Main St"
   - Click "Add Location" again
   - Enter address 2: "456 Oak Ave"
   - **Expected**: Two locations should appear in the form

5. **Assign Crew Members**
   - Checkboxes should appear for available crew
   - Select 2-3 crew members (check their boxes)
   - **Expected**: Selected crew names should appear somewhere on form

6. **Submit Shift**
   - Click "Create Shift" button
   - **Expected Success**:
     - ✅ No RLS 401 error
     - ✅ Shift is created in Supabase
     - ✅ Confirmation message appears
     - ✅ Form clears or navigates back

   **If you see an error**:
     - Check browser console (F12 → Console)
     - Look for error messages
     - Note the error and report

---

## Phase 2: Verify Shift in Admin View

1. **Navigate to "Manage Crew Assignments"**
   - Should be on Timesheet screen
   - Look for section showing shifts

2. **Verify Created Shift Appears**
   - **Expected**:
     - Shift date/time visible
     - Assigned crew count shown (2-3)
     - Expand button to see assigned crew names

3. **Expand Shift to See Crew**
   - Click expand/dropdown
   - **Expected**:
     - See list of assigned crew members
     - Checkboxes for adding more crew
     - "Assign Selected" button

4. **Test Adding Crew to Shift**
   - Find an unassigned crew member
   - Check their checkbox
   - Click "Assign Selected"
   - **Expected**:
     - New crew member appears in "Assigned" list
     - No errors in console

---

## Phase 3: Crew Member View (Login as Assigned Crew)

1. **Logout from Admin**
   - Logout: nolanaisley@gmail.com

2. **Login as Assigned Crew Member**
   - Use email of one of the crew members assigned to the shift
   - (Get from crew dropdown or list)
   - Expected: Logged in successfully

3. **Navigate to Timesheet**
   - Should see "Today's Shift" card (or "Upcoming Shift")
   - **Expected**:
     - Shift date/time visible
     - First location from the shift shown
     - "Clock In" button visible

4. **Check Multi-Location Shift**
   - Look for location expand/dropdown
   - **Expected**: Option to see all locations (if you added 2+)
   - Click to expand
   - **Expected**: All locations should list

---

## Phase 4: Test Clock-In Functionality

1. **Single Location Shift**
   - Click "Clock In" button
   - **Expected**:
     - ✅ Clock-in succeeds
     - ✅ Time entry created in Supabase
     - ✅ "Clock Out" button appears

2. **Multi-Location Shift (if applicable)**
   - Shift might ask which location to clock in for
   - **Expected**:
     - ✅ Location selection modal/dropdown
     - ✅ Select location → Clock in
     - ✅ Success message

3. **Test Clock-Out**
   - Click "Clock Out" button
   - **Expected**:
     - ✅ Clock-out succeeds
     - ✅ Duration/hours calculated correctly
     - ✅ "Clock In" button reappears

---

## Phase 5: Test Crew Assignment UI

1. **Login back as admin**

2. **Expand a shift in "Manage Crew Assignments"**

3. **Test Crew Selection**
   - Uncheck a crew member
   - Check a new crew member
   - Click "Assign Selected"
   - **Expected**:
     - ✅ List updates correctly
     - ✅ No RLS errors
     - ✅ Changes persist on page reload

4. **Test Unassign Crew**
   - Look for remove/X button next to crew names
   - Click to unassign
   - **Expected**:
     - ✅ Crew removed from assigned list
     - ✅ Appears back in available checkbox list
     - ✅ No errors

---

## Phase 6: Test Reactions on Notifications

1. **Navigate to Notifications/Alerts**
   - Look for Notifications/Alerts screen
   - Open any notification detail

2. **Test Comment Reactions**
   - Find a comment with reactions
   - Hover over reaction buttons (thumbs up, etc.)
   - **Expected**:
     - ✅ Tooltip appears with reactions' authors
     - ✅ Capitalized names visible (e.g., "Nolan Aisley")

3. **Test Adding Reaction**
   - Click a reaction button
   - **Expected**:
     - ✅ Count increases
     - ✅ Button highlights your reaction
     - ✅ Can only have 1 per reaction type

4. **Test Removing Reaction**
   - Click same reaction button again
   - **Expected**:
     - ✅ Count decreases
     - ✅ Button returns to normal state

---

## Phase 7: Test Nested Replies

1. **In Notification Details**
   - Find a comment with replies
   - Verify nested replies show with indentation
   - **Expected**:
     - ✅ Indentation visible (left margin for nested replies)
     - ✅ "Reply to X" text shows for nested replies

2. **Test Adding Nested Reply**
   - Click "Reply" on a nested comment
   - Type a reply
   - Click "Reply" to submit
   - **Expected**:
     - ✅ Reply appears below with indentation
     - ✅ "Reply to [author name]" shows
     - ✅ Maintains reply depth correctly

3. **Test Deep Nesting (3+ levels)**
   - Reply to your nested reply
   - **Expected**:
     - ✅ Continues to indent properly
     - ✅ No errors on deep nesting
     - ✅ Reaction tooltips work at all levels

---

## Browser Console Checks

Throughout testing, watch for:
- ✅ No 401 RLS errors
- ✅ No 409 constraint violations
- ✅ No undefined/null errors
- ✅ Correct console.log statements from debugging

**Search for errors**: Open DevTools (F12), go to Console, look for:
- `[CommentCard]` logs (reaction/reply loading)
- `[NotificationDetails]` logs (errors)
- Any red `Error:` messages

---

## Success Criteria

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| Create shift as admin | ✅ Created, no RLS error | __ |
| Shift appears in crew list | ✅ Visible in admin view | __ |
| Crew sees shift | ✅ "Today's Shift" card visible | __ |
| Clock in/out works | ✅ Time entries created | __ |
| Manage crew assignments | ✅ Add/remove crew | __ |
| Nested replies render | ✅ Indentation visible | __ |
| Reaction tooltips | ✅ Show author names on hover | __ |
| Reactions toggle | ✅ Add/remove with count update | __ |

---

## If You Find Issues

1. **Check Browser Console** (F12 → Console)
   - Copy exact error message
   - Note which step failed

2. **Check Database** (Supabase Dashboard)
   - Verify crew_members table has is_admin=true
   - Verify shifts table has your created shift
   - Verify time_entries has clock in/out records

3. **Common Issues**:
   - **RLS 401**: is_admin not set → RUN: `UPDATE crew_members SET is_admin = true WHERE email = 'nolanaisley@gmail.com';`
   - **Location not showing**: Multi-location support in ShiftRosterTable
   - **Reactions not persisting**: Check notification_comment_reactions table

---

## Notes

- Dev server hot-reloads changes (save files to see updates)
- Time entries are created immediately on clock-in
- Reactions use email as identifier (nolanaisley@gmail.com)
- Nested replies support infinite depth with indentation
- All features use Supabase RLS for security

Good luck! 🚀
