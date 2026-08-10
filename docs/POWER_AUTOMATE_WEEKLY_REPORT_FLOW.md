# Weekly Time Entries Report - Power Automate Flow

## Quick Setup (5 minutes)

### Prerequisites
- Power Automate account with cloud flow access
- Supabase project URL and API key
- Leadership email: `sherrie@richcogroup.com`

### Step-by-Step Setup

#### 1. Create New Scheduled Flow
1. Go to [Power Automate](https://make.powerautomate.com)
2. Select **Create** → **Scheduled cloud flow**
3. Configure:
   - Flow name: `Richco Weekly Time Report`
   - Runs: `Weekly`
   - Day: `Friday`
   - Time: `9:00 AM`

#### 2. Add Initialize Variable Action

Click **+ New step** and search for **Initialize variable**

- **Name**: `TimeEntriesData`
- **Type**: String
- **Value**: Empty (will fill with data)

#### 3. Add HTTP Request for Time Entries

Click **+ New step** → **HTTP**

Configure:
- **Method**: `GET`
- **URI**: 
```
https://{YOUR_SUPABASE_URL}/rest/v1/time_entries?clock_in_time=gte.2024-01-01T00:00:00Z&clock_in_time=lte.2024-01-07T23:59:59Z&order=employee_id.asc,clock_in_time.asc
```
- **Headers**:
```
apikey
{YOUR_SUPABASE_ANON_KEY}

Authorization
Bearer {YOUR_SUPABASE_ANON_KEY}
```

**Replace the date values** - For last week:
- Start: Last Monday (2024-01-01)
- End: Last Sunday (2024-01-07)

**Or use dynamic dates**:
- Start: `@{formatDateTime(addDays(addDays(utcNow(), -day(utcNow())+1), -7), 'yyyy-MM-ddT00:00:00Z')}`
- End: `@{formatDateTime(addDays(addDays(utcNow(), -day(utcNow())+1), 0), 'yyyy-MM-ddT23:59:59Z')}`

#### 4. Add HTTP Request for Crew Members

Click **+ New step** → **HTTP**

Configure:
- **Method**: `GET`
- **URI**: 
```
https://{YOUR_SUPABASE_URL}/rest/v1/crew_members?select=id,email,first_name,last_name
```
- **Headers**: Same as Step 3

#### 5. Add Compose Action (for formatting)

Click **+ New step** → **Compose**

In the Inputs field, add the HTML email template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #e0e0e0; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .total { background: #f9f9f9; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Weekly Time Entry Report</h2>
      <p>Week of January 1-7, 2024</p>
    </div>
    <p>Your time entries for the past week are summarized below:</p>
    <table>
      <tr>
        <th>Date</th>
        <th>Site</th>
        <th>Clock In</th>
        <th>Clock Out</th>
        <th>Hours</th>
      </tr>
      <!-- Add rows from time entries data here -->
    </table>
    <div class="summary">
      <p><strong>Total Hours This Week:</strong> 40.00h</p>
      <p><strong>Regular:</strong> 40.00h | <strong>Overtime:</strong> 0.00h</p>
    </div>
  </div>
</body>
</html>
```

#### 6. Send Email to Employee

Click **+ New step** → **Send an email (V2)**

Configure:
- **To**: `sherrie@richcogroup.com` (or use dynamic employee email)
- **Subject**: `Weekly Time Entry Report - Week of January 1-7, 2024`
- **Body**: Use the Compose output from Step 5
- **Is HTML**: Toggle **ON**

### 7. Test the Flow

1. Click **Test** in the top right
2. Select **Manually trigger a cloud flow**
3. Click **Test**
4. Wait for execution
5. Check email for report

## Dynamic Date Expressions

If you want the flow to automatically calculate last week's dates:

**For Monday of last week (start date):**
```
addDays(addDays(utcNow(), -day(utcNow())+1), -7)
```

**For Sunday of last week (end date):**
```
addDays(addDays(utcNow(), -day(utcNow())), -7)
```

Then format as ISO string for Supabase:
```
formatDateTime(addDays(addDays(utcNow(), -day(utcNow())+1), -7), 'yyyy-MM-ddT00:00:00Z')
```

## Environment Variables

Replace these placeholders with your actual values:

| Placeholder | Value |
|------------|-------|
| `{YOUR_SUPABASE_URL}` | Your Supabase project URL (e.g., `https://xyzabc.supabase.co`) |
| `{YOUR_SUPABASE_ANON_KEY}` | Your Supabase anonymous key |

## Troubleshooting

**No data returned?**
- Verify the date range is correct
- Check that time entries exist for that week
- Ensure API key is valid

**Email not sending?**
- Verify email address is correct
- Check that Outlook/Office 365 connector is authenticated
- Verify HTML formatting is valid

**Wrong employee data?**
- Confirm crew_members table has email field populated
- Check employee IDs match between time_entries and crew_members

## Next Steps

1. ✅ Test with manual trigger
2. ✅ Verify email format and data accuracy
3. ✅ Adjust HTML template as needed
4. ✅ Save the flow
5. ✅ Change trigger to scheduled (Friday 9 AM)

## Future Enhancements

- Add manager summary report
- Include project/site breakdown
- Add overtime alerts
- Generate PDF attachments
- Custom branding with logos
