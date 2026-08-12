# Admin Timecard Management Features

## Overview

Admins can now:
1. View timecards per employee
2. Adjust hours (auto-deducts breaks)
3. See historical weeks
4. Edit submitted timecards

## Features Breakdown

### 1. Hour Adjustment (with Auto-Break Deduction)

**Database Change:** Add `adjusted_hours` column to time_entries

```sql
ALTER TABLE time_entries
ADD COLUMN adjusted_hours NUMERIC(10,2),
ADD COLUMN adjusted_by_admin BOOLEAN DEFAULT false,
ADD COLUMN admin_adjustment_note TEXT,
ADD COLUMN adjusted_at TIMESTAMP WITH TIME ZONE;
```

**Calculation Logic:**
```
If admin adjusts total hours:
  - Break hours stay the same
  - Regular hours = (total adjusted hours - break hours)
  - If regular hours > 8 → overtime = excess
  - Otherwise → all goes to regular
```

**Example:**
- Original: 10 hours work, 1 hour break = 9 regular hours
- Admin adjusts to 9 hours total
- New: 9 hours work, 1 hour break = 8 regular hours
- Breaks are NOT changed by admin adjustment

### 2. Layout Changes (TimesheetScreen.tsx)

**Current Layout:**
```
[Week History - Expandable to month]
[Time Off]
```

**New Layout:**
```
[Personal Week History - Week Navigation]
  Aug 8 - Aug 14  [← Prev | Current Week | Next →]
  [Weekly cards view]

[Per-Employee History] (Admin only)
  [Employee dropdown]
  Aug 8 - Aug 14  [← Prev | Current Week | Next →]
  [Weekly cards for selected employee]

[Time Off]
```

### 3. Components to Build

#### A. WeekNavigator Component

```typescript
interface WeekNavigatorProps {
  selectedDate: Date
  onWeekChange: (date: Date) => void
  showCurrentWeekButton?: boolean
}

// Shows: "Aug 8 - Aug 14"
// Buttons: [← Prev] [Current Week] [Next →]
```

#### B. PerEmployeeHistory Component (Admin only)

```typescript
interface PerEmployeeHistoryProps {
  selectedEmployee: CrewMember
  selectedWeek: Date
  onWeekChange: (date: Date) => void
  onEmployeeChange: (employee: CrewMember) => void
}

// Dropdown to select employee
// Shows their weekly timecards
// Clickable cards to view/edit
```

#### C. TimeCardAdjustmentModal Component

```typescript
interface TimeCardAdjustmentModalProps {
  timeEntry: TimeEntry
  onSave: (adjustedHours: number, note: string) => void
  onCancel: () => void
}

// Shows original vs adjusted hours
// Input for new total hours
// Input for admin note (why adjusted?)
// Auto-calculates regular/overtime
// Shows break hours (unchangeable)
```

### 4. API Changes

#### New Function: updateTimeEntryByAdmin

```typescript
export async function updateTimeEntryByAdmin(
  timeEntryId: string,
  adjustedHours: number,
  adminNote: string,
  adminId: string
): Promise<boolean>
```

Calls Supabase:
```sql
UPDATE time_entries
SET 
  adjusted_hours = $1,
  adjusted_by_admin = true,
  admin_adjustment_note = $2,
  adjusted_at = now(),
  updated_by = $3,
  regular_hours = CASE 
    WHEN ($1 - break_hours) > 8 THEN 8
    ELSE ($1 - break_hours)
  END,
  overtime_hours = CASE 
    WHEN ($1 - break_hours) > 8 THEN ($1 - break_hours) - 8
    ELSE 0
  END
WHERE id = $4
  AND employee_id != $5  -- Can't adjust own timecard
RETURNING *;
```

#### New Function: getEmployeeWeeklyTimecards

```typescript
export async function getEmployeeWeeklyTimecards(
  employeeId: string,
  weekStartDate: Date
): Promise<TimeEntry[]>
```

Returns all time entries for employee in that week.

### 5. UI Flow

#### Admin views Timesheet:

1. Sees "Personal Week History" (own timecards, current week)
2. Clicks "Prev" to see last week's timecards
3. Sees "Per-Employee History" section below
4. Clicks employee dropdown → selects "Carlos Cabrera"
5. Sees Carlos's current week timecards
6. Clicks on any timecard → opens TimeCardAdjustmentModal
7. Sees:
   - Original: 10.5h work, 1h break = 9.5h regular
   - Input field for adjusted hours
   - Text input for reason
8. Enters 9h in adjustment field
9. Modal shows recalculated:
   - Adjusted: 9h work, 1h break = 8h regular
   - No overtime
10. Clicks "Save"
11. Timecard updates in Supabase
12. Admin sees updated timecard immediately

### 6. File Structure

**New Files:**
- `src/components/timesheet/WeekNavigator.tsx`
- `src/components/timesheet/PerEmployeeHistory.tsx`
- `src/components/timesheet/TimeCardAdjustmentModal.tsx`
- `src/hooks/useWeekNavigation.ts`

**Modified Files:**
- `src/screens/TimesheetScreen.tsx` - New layout
- `src/services/supabase.ts` - New API functions
- `src/types/index.ts` - Add adjusted_hours, adjusted_by_admin, etc.

### 7. Break Handling Logic

**Important:** Breaks are NEVER adjusted by admin

```typescript
// When admin adjusts hours:
function calculateAdjustedHours(
  adjustedTotalHours: number,
  originalBreakHours: number
): { regular: number; overtime: number } {
  const workHours = adjustedTotalHours - originalBreakHours
  
  if (workHours > 8) {
    return {
      regular: 8,
      overtime: workHours - 8
    }
  }
  
  return {
    regular: workHours,
    overtime: 0
  }
}

// Example:
// Admin adjusts from 10h to 9h total
// Break stays 1h
// Work hours: 9 - 1 = 8h regular
// Overtime: 0h
```

### 8. Access Control (RLS)

```sql
-- Only admins can update other employees' timecards
CREATE POLICY "Admin can adjust employee timecards" ON time_entries
  FOR UPDATE USING (
    auth.uid()::int IN (SELECT id FROM crew_members WHERE is_admin = true)
    AND employee_id != auth.uid()::int
  );

-- Anyone can view their own timecards
CREATE POLICY "Users can view own timecards" ON time_entries
  FOR SELECT USING (
    employee_id = auth.uid()::int
    OR auth.uid()::int IN (SELECT id FROM crew_members WHERE is_admin = true)
  );
```

### 9. Testing Checklist

#### Admin Features:
- [ ] Admin can see "Per-Employee History" section
- [ ] Can select employee from dropdown
- [ ] Can navigate weeks with Prev/Next
- [ ] Week period shows "Aug 8 - Aug 14"
- [ ] Can click timecard to open adjustment modal
- [ ] Adjustment modal shows original vs adjusted
- [ ] Break hours are NOT editable (grayed out)
- [ ] Adjusted hours auto-calculate regular/overtime
- [ ] Can add admin note
- [ ] Saves to Supabase correctly

#### Personal History:
- [ ] Week navigation works (Prev/Next/Current)
- [ ] Week period displays "Aug 8 - Aug 14"
- [ ] Changed from "expand month" to "week navigation"
- [ ] Shows all timecards for that week

#### Time Off:
- [ ] Still appears below (not changed)

### 10. Timeline

- Database migration: 5 min
- Components: 60 min
- API functions: 15 min
- Integration: 20 min
- Testing: 20 min
- **Total: ~2 hours**

### 11. Security Considerations

- ✅ Admins cannot adjust their own timecards (RLS)
- ✅ Adjustment is tracked (admin_id, timestamp, note)
- ✅ Original hours preserved for audit trail
- ✅ Break hours never modified
- ✅ Only authenticated admins can see other employees

### 12. Future Enhancements

- Bulk adjust hours for multiple employees
- Adjustment approval workflow
- Audit log view of all adjustments
- Email notification when admin adjusts your hours
- Reason templates (missed break, early leave, etc.)
