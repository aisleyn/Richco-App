# Azure Static Web Apps Deployment Guide

This app is ready to deploy. Follow these steps to get it live.

## Prerequisites

1. **Azure Subscription** — You mentioned you have one
2. **Azure CLI** — [Install](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows)
3. **Azure Static Web Apps CLI** (optional, for local testing) — `npm install -g @azure/static-web-apps-cli`

## Step 1: Create the Static Web App in Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for "Static Web Apps" → Create
3. **Basics tab:**
   - **Name:** `richco-app` (or your preferred name)
   - **Resource Group:** Create new or choose existing
   - **Plan type:** Free
   - **Region:** (Default is fine — closest to your team)
4. **Hosting details tab:**
   - **Build presets:** None (we're not using GitHub)
   - We'll upload the `dist/` folder manually
5. Click **Review + create** → **Create**

Wait 1-2 minutes for the resource to be created.

## Step 2: Get your deployment token

Once created, go to the Static Web App resource:

1. Left menu → **Manage deployment tokens**
2. Copy the **Deployment token** (long string)
3. Keep it safe — you'll need it next

## Step 3: Deploy the built app

On your local machine in the project root:

```bash
# Install Azure Static Web Apps CLI if not already done
npm install -g @azure/static-web-apps-cli

# Deploy the dist folder
swa deploy \
  --app-name richco-app \
  --deployment-token YOUR_DEPLOYMENT_TOKEN_HERE \
  --app-location ./dist
```

Or use Azure CLI instead:

```bash
az staticwebapp create \
  --name richco-app \
  --resource-group YOUR_RESOURCE_GROUP \
  --location eastus \
  --source ./dist
```

After a few minutes, Azure will give you a URL like:
```
https://your-app-name.azurestaticapps.net
```

## Step 4: Configure environment variables in Azure

Your app needs the Azure AD and Dataverse env vars at runtime.

1. In Azure Portal, go to your Static Web App resource
2. Left menu → **Configuration** → **Application settings**
3. Add the following:
   ```
   VITE_AZURE_CLIENT_ID=e9b090d5-e7a1-43c2-abe3-761a64c828f9
   VITE_AZURE_TENANT_ID=59114aa8-a5cf-4ff9-9edd-affc40d640a9
   VITE_DATAVERSE_ORG=richcogroup
   VITE_OPENWEATHER_KEY=fb0a84cc155d4e887a75225ed1c43542
   ```
4. Click **Save**

## Step 5: Update Azure AD App Registration

Your Azure AD app needs to know about the production URL so login redirects work.

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Find "Richco Construction App" (the one with client ID `e9b090d5...`)
3. Left menu → **Authentication**
4. Under **Redirect URIs**, add:
   ```
   https://your-app-name.azurestaticapps.net
   ```
   (Replace with your actual Static Web App URL)
5. Click **Save**

## Step 6: Test the deployed app

1. Visit your production URL: `https://your-app-name.azurestaticapps.net`
2. You should see the login screen
3. Click "Sign in with Microsoft"
4. After login, you should be able to:
   - See the Clock In card with a site picker
   - Clock in (creates entry in Dataverse)
   - Start/end break (updates Dataverse)
   - Clock out (finalizes entry with hours calculations)

## Troubleshooting

**Blank page or 404:**
- Check that `staticwebapp.config.json` exists in project root (it does)
- Rebuild: `npm run build` and redeploy

**Login fails:**
- Verify `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` are set in Azure Portal → Configuration
- Verify the redirect URI in Azure AD App Registration includes your Static Web App URL

**Dataverse operations fail silently:**
- Check that `VITE_DATAVERSE_ORG` is correct (should be `richcogroup`)
- Verify the Azure AD app has **Dynamics CRM** → **user_impersonation** permission (admin-consented)
- Check browser console for errors

**PWA not installing on mobile:**
- Visit from phone browser
- Top menu → "Install app" or "Add to Home Screen" should appear
- This only works over HTTPS (which Static Web Apps provides)

## Updating the app after deployment

Whenever you make changes and want to push them live:

```bash
npm run build
# Then redeploy using the same swa deploy or az staticwebapp commands above
```

Or, set up a GitHub repo and use GitHub Actions for auto-deploy (recommended for ongoing updates).
