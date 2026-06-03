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

const dataverseOrg = import.meta.env.VITE_DATAVERSE_ORG || 'richcogroup'
const scopes = [
  `https://${dataverseOrg}.crm.dynamics.com/user_impersonation`, // Dataverse API - environment-specific scope
]
console.log('[AUTH] Dataverse org:', dataverseOrg, 'Scope:', scopes[0])

let msalInstance: msal.PublicClientApplication | null = null
let msalInitialized = false

export async function getMsalInstance() {
  if (!msalInstance) {
    if (!config.auth.clientId) {
      console.error('❌ MSAL Config Error: clientId is not set. This will cause login to fail.', { config })
      return null
    }
    try {
      msalInstance = new msal.PublicClientApplication(config)
      console.log('✅ MSAL instance created')
    } catch (err) {
      console.error('❌ Failed to create MSAL instance:', err, { config })
      return null
    }
  }

  // Initialize if not already done
  if (!msalInitialized) {
    try {
      await msalInstance.initialize()

      // Handle redirect from Azure AD (when using loginRedirect flow)
      try {
        console.log('[AUTH] Handling redirect from Azure AD...')
        const result = await msalInstance.handleRedirectPromise()
        if (result) {
          console.log('[AUTH] ✅ Redirect handled, user:', result.account?.name)
          if (result.account) {
            msalInstance.setActiveAccount(result.account)
          }
        }
      } catch (redirectErr: unknown) {
        const err = redirectErr as { errorCode?: string }
        // Some errors are expected, only log if not the standard "no redirect" case
        if (err?.errorCode !== 'no_token_request_cache_error') {
          console.error('[AUTH] Redirect error:', err)
        }
      }

      msalInitialized = true
      console.log('✅ MSAL initialized successfully')
    } catch (err) {
      console.error('❌ Failed to initialize MSAL:', err)
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
  const instance = await getMsalInstance()
  if (!instance) {
    console.log('[AUTH] No MSAL instance, using mock login')
    const mockUser = {
      displayName: 'Demo User',
      mail: 'demo@example.com',
      id: 'demo-user-id',
    }
    sessionStorage.setItem('mock-user', JSON.stringify(mockUser))
    return mockUser
  }

  try {
    console.log('[AUTH] Starting loginRedirect...')
    await instance.loginRedirect({
      scopes: [],
      prompt: 'select_account',
    })
    // loginRedirect doesn't return - it redirects to Azure AD
    return null
  } catch (err) {
    console.error('[AUTH] Login redirect failed:', err)
    // Fall back to mock login on error
    console.log('[AUTH] Falling back to mock login due to error')
    const mockUser = {
      displayName: 'Demo User',
      mail: 'demo@example.com',
      id: 'demo-user-id',
    }
    sessionStorage.setItem('mock-user', JSON.stringify(mockUser))
    return mockUser
  }
}

export async function logout(): Promise<void> {
  const instance = await getMsalInstance()
  if (instance) {
    await instance.logoutRedirect()
  }
}

export async function getAccessToken(): Promise<string | null> {
  const instance = await getMsalInstance()
  if (!instance) return null

  const account = instance.getActiveAccount()
  if (!account) return null

  try {
    console.log('[AUTH] Acquiring token for scopes:', scopes)
    const result = await instance.acquireTokenSilent({
      account,
      scopes,
    })
    console.log('[AUTH] ✅ Token acquired. Audience claim:', result.accessToken.split('.')[1])
    return result.accessToken
  } catch (err) {
    console.error('[AUTH] ❌ Failed to get token:', err)
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  // If Azure AD not configured, return mock user if it was logged in via mock login
  if (!import.meta.env.VITE_AZURE_CLIENT_ID) {
    const mockUser = sessionStorage.getItem('mock-user')
    if (mockUser) {
      const user = JSON.parse(mockUser)
      console.log('[AUTH] Returning mock user:', user.displayName)
      return user
    }
    return null
  }

  const instance = await getMsalInstance()
  if (!instance) {
    console.log('[AUTH] getCurrentUser - No MSAL instance')
    return null
  }

  // Check all accounts in cache
  const allAccounts = instance.getAllAccounts()
  console.log('[AUTH] getCurrentUser - All accounts:', allAccounts.map(a => a.name))

  const account = instance.getActiveAccount()
  console.log('[AUTH] getCurrentUser - Active account:', account?.name || 'none')

  if (!account) {
    console.log('[AUTH] No active account found. Setting first available account...')
    // If no active account but accounts exist, set the first one
    if (allAccounts.length > 0) {
      instance.setActiveAccount(allAccounts[0])
      console.log('[AUTH] Set active account to:', allAccounts[0].name)
      const user = {
        displayName: allAccounts[0].name || '',
        mail: allAccounts[0].username || '',
        id: allAccounts[0].homeAccountId?.split('.')[0] || '',
      }
      return user
    }
    return null
  }

  const user = {
    displayName: account.name || '',
    mail: account.username || '',
    id: account.homeAccountId?.split('.')[0] || '',
  }
  console.log('[AUTH] getCurrentUser - Returning user:', user.displayName)
  return user
}
