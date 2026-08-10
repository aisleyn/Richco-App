# Weekly Time Entries Email Reporting Setup

This guide sets up automated weekly time entries reports sent to employees every Friday morning.

## Overview

- **Frequency**: Every Friday at 9:00 AM
- **Report Type**: Personal time entries summary for the previous week (Mon-Sun)
- **Delivery**: Email to each employee with time tracking data
- **Content**: Hours worked, sites visited, daily breakdown, overtime summary

## Setup Instructions

### 1. Create Power Automate Flow

1. Go to [Power Automate](https://make.powerautomate.com)
2. Click **Create** → **Scheduled cloud flow**
3. Configure:
   - **Flow name**: `Weekly Time Entries Report`
   - **Runs**: `Every week` on `Friday` at `9:00 AM`

### 2. Add Actions

#### Step 1: Initialize Variables

Add action: **Initialize variable**

- Name: `Reports`
- Type: Array
- Value: `[]`

#### Step 2: Get Time Entries from Supabase

Add action: **HTTP**

- **Method**: GET
- **URI**: 
  ```
  https://{SUPABASE_URL}/rest/v1/time_entries?clock_in_time=gte.{PREVIOUS_MONDAY}&clock_in_time=lte.{PREVIOUS_SUNDAY}&order=employee_id.asc,clock_in_time.asc
  ```
- **Headers**:
  ```
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
  Content-Type: application/json
  ```

Where:
- `{SUPABASE_URL}`: Your Supabase project URL
- `{SUPABASE_ANON_KEY}`: Your Supabase anon key
- `{PREVIOUS_MONDAY}`: Dynamic expression: `addDays(addDays(utcNow(), -day(utcNow())+1), -7)` formatted as ISO date
- `{PREVIOUS_SUNDAY}`: Dynamic expression: `addDays(addDays(utcNow(), -day(utcNow())), -7)` formatted as ISO date

#### Step 3: Get Crew Member Emails

Add action: **HTTP**

- **Method**: GET
- **URI**: 
  ```
  https://{SUPABASE_URL}/rest/v1/crew_members?select=id,email,first_name,last_name
  ```
- **Headers**: Same as Step 2

#### Step 4: Process Time Entries and Send Emails

Add action: **Apply to each**

- **Select an output from previous steps**: Body (from time entries HTTP call)

Inside the loop, add:

**Filter array** to group entries by employee_id

**Compose** to format the HTML email body (use the template below)

**Send an email (V2)**
- **To**: Employee email from crew_members table
- **Subject**: `Weekly Time Entry Report - {DATE_RANGE}`
- **Body**: Formatted HTML from compose action
- **Is HTML**: Yes

### 3. Email HTML Template

Use this template for the email body:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #374151; }
      .container { max-width: 800px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
      .summary { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .summary-value { font-size: 24px; font-weight: 700; color: #059669; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; }
      td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
      .totals { background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Weekly Time Entry Report</h1>
        <p>@{formatDateTime(addDays(addDays(utcNow(), -day(utcNow())+1), -7), 'MMM dd')} – @{formatDateTime(addDays(addDays(utcNow(), -day(utcNow())), -7), 'MMM dd')}</p>
      </div>
      <!-- Add table with daily entries here -->
    </div>
  </body>
</html>
```

## Important Notes

⚠️ **Date Calculation**: Power Automate's date functions can be complex. Ensure your date expressions correctly target the previous week (Monday-Sunday).

## Troubleshooting

- **No emails sent**: Check that Supabase returns data for the date range
- **Wrong date range**: Verify date expressions match your timezone
- **Missing employee emails**: Ensure all crew_members have email addresses populated

## Testing

1. Set the flow to run at a specific time within 5 minutes
2. Wait for it to execute
3. Check email inbox
4. Verify formatting and data accuracy
5. Once confirmed, reschedule for production (Friday 9 AM)

## Future Enhancements

- [ ] Add manager/leadership summary report
- [ ] Include project allocation data
- [ ] Add overtime warnings
- [ ] Include attendance metrics
- [ ] Generate PDF reports
