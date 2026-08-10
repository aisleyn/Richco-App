# Twilio SMS Notifications Setup

This guide sets up SMS notifications for clock-in/out confirmations using Twilio.

## Overview

**Features**:
- ✅ Clock-in confirmation SMS
- ✅ Clock-out summary SMS (hours worked)
- ✅ Shift reminder SMS (coming soon)
- ✅ SMS logging and debugging
- ✅ Test SMS panel in admin section

**Message Examples**:
- Clock-in: "Hi John, you've clocked in at Grandview Heights at 08:45. Safe travels!"
- Clock-out: "Hi John, you've clocked out from Grandview Heights at 17:15. Total hours today: 8.50h."

---

## Setup Instructions

### 1. Create Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up or log in
3. Navigate to **Account** menu
4. Get your **Account SID**
5. Get your **Auth Token** (keep secret!)

### 2. Get a Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage Numbers**
2. Click **Buy a Number**
3. Choose:
   - Country: USA (or your region)
   - Capabilities: SMS
   - Save the phone number (format: +1234567890)

**Note**: Free tier includes $15 credit - enough for ~250 SMS messages

### 3. Add Environment Variables

Create/update `.env.local` with:

```env
VITE_TWILIO_ACCOUNT_SID=AC...your_sid_here...
VITE_TWILIO_AUTH_TOKEN=...your_auth_token...
VITE_TWILIO_PHONE_NUMBER=+12345678900
```

**Where to find these**:
- Account SID: [Twilio Console Home](https://www.twilio.com/console)
- Auth Token: [API Keys & Tokens](https://www.twilio.com/console/project/api-keys)
- Phone Number: [Active Numbers](https://www.twilio.com/console/phone-numbers/incoming)

### 4. Update Employee Phone Numbers

Employees must have phone numbers in the crew_members table:

1. Go to Employee Hub (Crew screen)
2. Edit each employee profile
3. Add phone number in E.164 format: `+14155552671`

**Format**: `+[country code][phone number]`
- USA: +1 (10 digit number)
- Canada: +1 (10 digit number)
- International: +[country] [number]

### 5. Test SMS

#### Option A: Use Admin SMS Panel

1. Log in as admin
2. Go to Admin → SMS Panel
3. Enter test phone number and message
4. Click "Send Test SMS"
5. Check the SMS logs for success/failure

#### Option B: Test via Clock-In

1. Update your profile with your phone number
2. Clock in on the app
3. You should receive an SMS within 5 seconds

---

## SMS Features

### Automatic Notifications

**Clock-In SMS**:
- Triggered when employee clocks in
- Contains: Employee name, site name, clock-in time
- Confirms location and work start

**Clock-Out SMS**:
- Triggered when employee clocks out
- Contains: Site name, clock-out time, total hours worked
- Summary of the day

### SMS Logging

All SMS attempts are logged to `localStorage` with:
- Timestamp
- Phone number (last 4 digits visible)
- Message content
- Success/failure status
- Twilio message ID

**Access logs**:
- Via admin SMS Panel (View Logs)
- Via browser console: `localStorage.getItem('richco-sms-log')`

### Graceful Degradation

If Twilio is not configured:
- ✅ App continues to work normally
- ⚠️ SMS is logged but not sent
- ✅ No errors or crashes

---

## Troubleshooting

### "No SMS logs" or "SMS not sending"

**Check**:
1. Environment variables are set correctly
2. `.env.local` file exists in project root
3. App was restarted after .env changes
4. Phone number is in E.164 format (+1234567890)
5. Employee profile has phone number populated

**Test**:
```javascript
// In browser console:
import.meta.env.VITE_TWILIO_ACCOUNT_SID // Should show SID, not undefined
import.meta.env.VITE_TWILIO_PHONE_NUMBER // Should show +12345...
```

### "Failed to send SMS"

**Possible causes**:
- Invalid phone number format
- Insufficient Twilio account balance
- Phone number not verified (for trial accounts)
- Network connectivity issue

**Check Twilio**:
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Check account balance
3. Verify phone number in your account
4. Check [SMS logs](https://www.twilio.com/console/sms/logs)

### "CORS error" or "401 Unauthorized"

**Solution**:
Twilio API calls from frontend may have CORS issues. For production, consider:
1. Use a backend proxy/endpoint
2. Use Twilio Functions
3. Use Power Automate to send SMS instead

**Temporary workaround**: Add to `.env`:
```env
VITE_TWILIO_CORS_PROXY=https://cors-anywhere.herokuapp.com/
```

---

## Advanced: Power Automate Integration

Instead of direct Twilio API, use Power Automate:

1. Create Power Automate flow with **Twilio connector**
2. Trigger on clock-in/out webhook
3. Send SMS via Power Automate
4. Better control and logging

See `/docs/POWER_AUTOMATE_WEEKLY_REPORT_FLOW.md` for similar pattern.

---

## Costs

**Twilio Pricing**:
- Account: Free
- Phone number: $1/month
- SMS: $0.0075/SMS (US domestic)
- SMS: $0.01+ (international)

**Example**: 100 employees × 2 SMS/day × 20 days = 4,000 SMS = ~$30/month

---

## Future Enhancements

- [ ] Shift start reminders (next day evening)
- [ ] Overtime alerts
- [ ] Attendance summaries
- [ ] Two-factor authentication via SMS
- [ ] Reply-based features (e.g., "LATE 30" to report late)
- [ ] Bulk SMS campaigns

---

## Admin Panel

Access SMS admin features:

1. Log in as admin
2. Navigate to settings/admin area
3. Find "SMS Configuration & Testing" section

**Features**:
- ✅ Send test SMS
- ✅ View SMS logs
- ✅ Clear logs
- ✅ Check configuration status

---

## Testing Checklist

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Environment variables added
- [ ] `.env.local` saved
- [ ] App restarted
- [ ] Employee phone numbers updated (E.164 format)
- [ ] Test SMS sent successfully
- [ ] Clock-in SMS received
- [ ] Clock-out SMS received
- [ ] SMS logs visible in admin panel
- [ ] SMS appears on Twilio dashboard

---

## Questions?

Check:
1. Twilio docs: https://www.twilio.com/docs/sms
2. SMS logs in admin panel
3. Browser console for errors
4. Twilio account activity/logs
