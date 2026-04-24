# Richco App — Dataverse API Connection Diagnostics
**Prepared for**: Microsoft Engineering Team  
**Date**: 2026-04-24  
**Issue**: Dataverse API calls failing from richco-app

---

## Azure AD Application Details

### Client ID (Application ID)
```
e9b090d5-e7a1-43c2-abe3-761a64c828f9
```

### Object ID (Service Principal OID)
**[NEEDED FROM AZURE PORTAL]**
- Navigate to: Azure Portal → Azure Active Directory → App registrations
- Search for "Richco Construction App" (Client ID: e9b090d5-e7a1-43c2-abe3-761a64c828f9)
- Go to Overview tab → Copy **Object ID**
- Provide this value to Microsoft Engineering

### Tenant ID
```
59114aa8-a5cf-4ff9-9edd-affc40d640a9
```

---

## Dataverse Environment Information

### Environment URL
```
https://richcogroup.crm.dynamics.com/api/data/v9.2
```

**Organization Name**: `richcogroup`  
**Region**: Dynamics CRM  

---

## API Endpoints Being Called

The app makes the following Dataverse API calls:

### 1. Fetch Job Sites (Projects)
```
GET https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/craa5_project
  ?$select=craa5_projectid,craa5_projectname,craa5_client
  &$filter=craa5_status eq 'active'
```

### 2. Fetch Employees
```
GET https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/richco_employees
  ?$select=richco_employeeid,richco_name,richco_department,richco_email,richco_phone,richco_status,richco_aadid
```

### 3. Fetch Employee Shifts
```
GET https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/richco_shifts
  ?$filter=richco_employeeid eq 'EMPLOYEE_ID' and richco_date eq 'YYYY-MM-DD'
  &$select=richco_shiftid,richco_starttime,richco_endtime,richco_status,richco_projectid
```

### 4. Create Time Entry (POST)
```
POST https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/craa5_timeentries
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "craa5_employee": "employee@email.com",
  "craa5_project": "site-id",
  "craa5_clockin": "2026-04-24T14:30:00Z",
  "craa5_status": "active"
}
```

### 5. Update Time Entry (PATCH)
```
PATCH https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/craa5_timeentries(ENTRY_ID)
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "craa5_clockout": "2026-04-24T18:30:00Z",
  "craa5_totalhours": 4.0,
  "craa5_breakduration": 60,
  "craa5_status": "complete"
}
```

---

## HTTP Headers Used in All Requests

```http
Authorization: Bearer {Azure_AD_Access_Token}
Content-Type: application/json
Accept: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
```

---

## Authentication Flow

1. **MSAL (Microsoft Authentication Library)** acquires access token from Azure AD
2. **Scope requested**: `https://richcogroup.crm.dynamics.com/.default`
3. **Token type**: Bearer token
4. **Token is passed in Authorization header** for all Dataverse API calls

### Code Location
- Auth service: `src/services/auth.ts` — manages MSAL and token retrieval
- Dataverse service: `src/services/dataverse.ts` — all API calls use this service

---

## Service Principal / Application User Configuration

### Required Permissions in Dataverse
The Azure AD application must be configured as an **Application User** in the Dataverse environment with:

- **Security Role**: One or more roles with permissions to:
  - Read `craa5_project` table
  - Read `richco_employees` table
  - Read `richco_shifts` table
  - Create/Update `craa5_timeentries` table

### Checklist for Microsoft to Verify
- [ ] Service principal (OID: `e9b090d5-e7a1-43c2-abe3-761a64c828f9`) exists in target Dataverse environment
- [ ] Service principal is registered as an **Application User** in Dataverse
- [ ] Application User has appropriate security roles assigned
- [ ] Application User has **Dynamics CRM** → **user_impersonation** permission
- [ ] Security role includes:
  - **Read** permission on: craa5_project, richco_employees, richco_shifts
  - **Create/Update** permission on: craa5_timeentries

---

## Testing with Postman

To verify the connection without the app:

### 1. Get Access Token
```bash
POST https://login.microsoftonline.com/59114aa8-a5cf-4ff9-9edd-affc40d640a9/oauth2/v2.0/token

grant_type=client_credentials
client_id=e9b090d5-e7a1-43c2-abe3-761a64c828f9
client_secret=[YOUR_CLIENT_SECRET]
scope=https://richcogroup.crm.dynamics.com/.default
```

### 2. Test Dataverse API with Token
```bash
GET https://richcogroup.crm.dynamics.com/api/data/v9.2/tables/craa5_project?$select=craa5_projectid,craa5_projectname

Headers:
Authorization: Bearer {access_token_from_step_1}
Accept: application/json
OData-Version: 4.0
```

**Expected Response**: 200 OK with list of projects

If this returns:
- **401 Unauthorized**: Token is invalid or service principal lacks permissions
- **403 Forbidden**: Service principal exists but lacks required security role
- **404 Not Found**: Table name is incorrect
- **500 Internal Server Error**: Dataverse environment issue

---

## Known Limitations & Constraints

1. **No client secret in app code** — Browser-based PWA cannot securely store credentials
2. **Token obtained via MSAL interactive flow** — Uses logged-in user's identity, not service principal directly in app
3. **User impersonation** — Each API call is made as the logged-in user, not service principal
4. **CORS** — Dataverse Web API must allow CORS from the Static Web App URL

---

## Application Files for Reference

| File | Purpose |
|------|---------|
| `src/services/auth.ts` | Azure AD authentication (MSAL) |
| `src/services/dataverse.ts` | All Dataverse API calls |
| `src/store/appStore.ts` | State management + Dataverse integration |
| `.env` | Environment variables (Client ID, Tenant ID, Org) |
| `staticwebapp.config.json` | SPA routing config for Azure Static Web Apps |

---

## What We've Already Verified

✅ Code is syntactically correct  
✅ Environment variables are set correctly  
✅ API endpoints and OData queries are properly formatted  
✅ HTTP headers match Dataverse requirements  
✅ Authentication flow (MSAL) is implemented correctly  
✅ No secrets or credentials hardcoded  
✅ Error handling and logging in place (console logs for debugging)  

---

## Questions for Microsoft Engineering

1. Is the service principal (OID: `e9b090d5-e7a1-43c2-abe3-761a64c828f9`) registered in the Dataverse environment?
2. If yes, what security role(s) are assigned to the Application User?
3. Are there any Conditional Access policies blocking the client ID?
4. Are there any audit logs showing the API requests and their failure reasons?
5. Is there a network/firewall policy blocking outbound calls to `richcogroup.crm.dynamics.com`?
6. Are there any changes to the Dataverse environment recently (schema changes, permission changes, etc.)?

---

## Next Steps

**Please contact Microsoft Engineering with**:
1. This entire document
2. Service Principal Object ID (once located in Azure Portal)
3. Recent Dataverse environment change logs (if any)
4. Network/firewall configuration summary
