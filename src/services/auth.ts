/**
 * Microsoft Authentication Service (MSAL)
 * Handles login/logout and token management
 */

import * as msal from '@azure/msal-browser'

// Debug: log env vars to verify they're loaded
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || 'e9b090d5-e7a1-43c2-abe3-761a64c828f9'
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '59114aa8-a5cf-4ff9-9edd-affc40d640a9'
console.log('[AUTH] Config loaded:', { clientId, tenantId, origin: window.location.origin })

const config: msal.Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
}

const scopes = [
  'https://org.crm.dynamics.com/.default', // Dataverse
]

let msalInstance: msal.PublicClientApplication | null = null

export function getMsalInstance() {
  if (!msalInstance) {
    if (!config.auth.clientId) {
      console.error('❌ MSAL Config Error: clientId is not set. This will cause login to fail.', { config })
      return null
    }
    try {
      msalInstance = new msal.PublicClientApplication(config)
      console.log('✅ MSAL initialized successfully')
    } catch (err) {
      console.error('❌ Failed to initialize MSAL:', err, { config })
      return null
    }
  }
  return msalInstance
}

export interface User {
  displayName: string
  mail: string
  id: string // Azure AD ID / OID
}

export async function login(): Promise<User | null> {
  const instance = getMsalInstance()
  if (!instance) return null

  try {
    const result = await instance.loginPopup({
      scopes,
      prompt: 'select_account',
    })

    const user: User = {
      displayName: result.account?.name || '',
      mail: result.account?.username || '',
      id: result.account?.homeAccountId?.split('.')[0] || '',
    }
    return user
  } catch (err) {
    console.error('Login failed:', err)
    return null
  }
}

export async function logout(): Promise<void> {
  const instance = getMsalInstance()
  if (instance) {
    await instance.logoutPopup()
  }
}

export async function getAccessToken(): Promise<string | null> {
  const instance = getMsalInstance()
  if (!instance) return null

  const account = instance.getActiveAccount()
  if (!account) return null

  try {
    const result = await instance.acquireTokenSilent({
      account,
      scopes,
    })
    return result.accessToken
  } catch (err) {
    console.error('Failed to get token:', err)
    return null
  }
}

export function getCurrentUser(): User | null {
  const instance = getMsalInstance()
  if (!instance) return null

  const account = instance.getActiveAccount()
  if (!account) return null

  return {
    displayName: account.name || '',
    mail: account.username || '',
    id: account.homeAccountId?.split('.')[0] || '',
  }
}
