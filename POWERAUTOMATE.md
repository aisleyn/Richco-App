# Power Automate Report Flows

This document describes the two weekly email report flows that Power Automate should execute to summarize employee hours from Dataverse.

All data comes from the `richco_timeentries` table in Dataverse.

---

## Wednesday Flow: Mid-Week Report

**Schedule:** Every Wednesday at 7:00 AM

**Purpose:** Send supervisors two periods of hours data:
1. **Current week (Sat – Wed)** — hours worked so far this week
2. **Previous week (Sat – Fri)** — last week's final totals

### Query 1: Current Week
```
richco_timeentries where richco_clockintime >= [Last Saturday 00:00:00] AND richco_clockintime <= [Today 23:59:59]
```
Group by `richco_employeeid` and sum:
- `richco_totalhours` → "Raw Hours"
- `richco_regularhours` → "Paid Hours" (OSHA-adjusted)
- `richco_breakhours` → "Break Hours"

### Query 2: Previous Week
```
richco_timeentries where richco_clockintime >= [Two Saturdays ago 00:00:00] AND richco_clockintime <= [Last Friday 23:59:59]
```
Same grouping and sum as above.

### Report Output
Email to supervisors with table:
```
| Employee         | Current Week | Paid Hours | Breaks | Last Week Paid |
|------------------|--------------|-----------|--------|----------------|
| John Smith       | 39.5h        | 37.0h     | 2.5h   | 40.0h          |
| ...              |              |           |        |                |
```

---

## Friday Flow: Weekly Report

**Schedule:** Every Friday at 5:00 PM

**Purpose:** Send supervisors and department managers the final weekly hours summary for the full week just worked.

### Query: Full Week
```
richco_timeentries where richco_clockintime >= [Last Saturday 00:00:00] AND richco_clockintime <= [Today 23:59:59]
```
Group by `richco_employeeid` and sum:
- `richco_totalhours` → "Raw Hours"
- `richco_regularhours` → "Paid Hours" (OSHA-adjusted, final)
- `richco_breakhours` → "Break Hours Taken"
- `richco_overtimehours` → "Overtime"

### Report Output
Email to supervisors with table:
```
| Employee         | Raw Hours | Paid Hours | Breaks | Overtime |
|------------------|-----------|-----------|--------|----------|
| John Smith       | 40.0h     | 38.5h     | 1.5h   | 0.5h     |
| ...              |           |           |        |          |
```

---

## Field Definitions

- **Raw Hours** (`richco_totalhours`): Total work time minus actual breaks taken
- **Paid Hours** (`richco_regularhours`): Raw hours minus 1h mandatory OSHA break (0.5h for overnight shifts)
  - Capped at 8h regular time (hours beyond 8 go to overtime)
- **Break Hours** (`richco_breakhours`): Actual duration of breaks the employee took
- **Overtime** (`richco_overtimehours`): Hours beyond 8 regular hours in a day

---

## Setup Steps

1. In Power Automate, create two **Cloud Flows** → **Scheduled Cloud Flows**
2. **Wednesday Flow:**
   - Trigger: Recurrence → Every Wednesday at 7:00 AM
   - Action: "List rows in a table" (Dataverse) → Filter as above, group by employee ID
   - Action: "Create HTML table" to format the two result sets
   - Action: "Send an email" → To supervisor DL or email list
3. **Friday Flow:**
   - Trigger: Recurrence → Every Friday at 5:00 PM
   - Similar structure (single query for full week)
   - Email to same recipients

---

## Notes

- Dates are in ISO 8601 format in Dataverse (e.g., `2026-04-12T14:30:00Z`)
- The Dataverse **List rows** connector supports `$filter` OData syntax. Use the **Advanced options** to enter filter expressions directly.
- Ensure the service account running the flow has **read** access to the `richco_timeentries` table.
