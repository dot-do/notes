# OAuth Integration - Key Code Additions

Quick reference showing the most important code additions for universal OAuth support.

## 1. Provider Configuration

**File:** `workers/auth/src/oauth-providers.ts`

```typescript
export const OAUTH_PROVIDERS: Record<string, Omit<OAuthProvider, 'authUrl' | 'tokenUrl' | 'userInfoUrl'>> = {
  vercel: {
    provider: 'vercel',
    name: 'Vercel',
    scopes: [], // Full user access by default
    authType: 'oauth',
  },
  netlify: {
    provider: 'netlify',
    name: 'Netlify',
    scopes: [], // Full user access
    authType: 'oauth',
  },
  aws: {
    provider: 'aws',
    name: 'AWS Cognito',
    scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
    authType: 'oauth',
  },
  gcp: {
    provider: 'gcp',
    name: 'Google Cloud Platform',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/cloud-platform'],
    authType: 'oauth',
  },
  azure: {
    provider: 'azure',
    name: 'Microsoft Azure',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'https://management.azure.com/user_impersonation'],
    authType: 'oauth',
  },
}
```

## 2. Core OAuth Functions

### Get Authorization URL

```typescript
export async function getOAuthAuthUrl(
  provider: string,
  redirectUri: string,
  state: string,
  env: any
): Promise<string | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state: state,
    response_type: 'code',
  })

  if (config.scopes.length > 0) {
    params.set('scope', config.scopes.join(' '))
  }

  // Provider-specific parameters
  if (provider === 'gcp') {
    params.set('access_type', 'offline') // Get refresh token
    params.set('prompt', 'consent')
  }

  return `${config.authUrl}?${params.toString()}`
}
```

### Exchange Code for Tokens

```typescript
export async function exchangeOAuthCode(
  provider: string,
  code: string,
  redirectUri: string,
  env: any
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!response.ok) return null

  return await response.json()
}
```

### Refresh OAuth Token

```typescript
export async function refreshOAuthToken(
  provider: string,
  refreshToken: string,
  env: any
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })

  if (!response.ok) return null

  return await response.json()
}
```

### Get Valid Token (Auto-Refresh)

```typescript
export async function getValidOAuthToken(
  userId: string,
  provider: string,
  env: any
): Promise<OAuthToken | null> {
  let token = await getOAuthToken(userId, provider, env)
  if (!token) return null

  // Check if expired and refresh if needed
  if (isTokenExpired(token) && token.refreshToken) {
    const newTokens = await refreshOAuthToken(provider, token.refreshToken, env)
    if (!newTokens) return null

    // Update token
    token = {
      userId,
      provider,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || token.refreshToken,
      expiresAt: newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000) : undefined,
      scopes: token.scopes,
      tokenType: 'bearer',
    }

    await storeOAuthToken(token, env)
  }

  return token
}
```

## 3. HTTP Endpoints

**File:** `workers/auth/src/oauth-endpoints.ts`

### Authorize Endpoint

```typescript
export async function handleUniversalOAuthAuthorize(
  c: Context<{ Bindings: AuthServiceEnv }>
): Promise<Response> {
  const provider = c.req.param('provider') as OAuthProviderName
  const redirectUri = c.req.query('redirect_uri')

  if (!redirectUri) {
    return c.json(error('MISSING_REDIRECT_URI', 'redirect_uri query parameter is required'), 400)
  }

  // Generate CSRF state
  const state = crypto.randomUUID()

  // Get authorization URL
  const authUrl = await oauthProviders.getOAuthAuthUrl(provider, redirectUri, state, c.env)

  if (!authUrl) {
    return c.json(error('INVALID_PROVIDER', `Unsupported OAuth provider: ${provider}`), 400)
  }

  // Store state in KV for validation
  await c.env.SESSIONS_KV.put(
    `oauth:universal:state:${state}`,
    JSON.stringify({ provider, redirectUri }),
    { expirationTtl: 600 } // 10 minutes
  )

  return c.redirect(authUrl)
}
```

### Callback Endpoint

```typescript
export async function handleUniversalOAuthCallback(
  c: Context<{ Bindings: AuthServiceEnv }>
): Promise<Response> {
  const provider = c.req.param('provider') as OAuthProviderName
  const code = c.req.query('code')
  const state = c.req.query('state')

  // Validate state (CSRF protection)
  const storedState = await c.env.SESSIONS_KV.get(`oauth:universal:state:${state}`)
  if (!storedState) {
    return c.json(error('INVALID_STATE', 'Invalid or expired state parameter'), 400)
  }

  const { redirectUri } = JSON.parse(storedState)
  await c.env.SESSIONS_KV.delete(`oauth:universal:state:${state}`)

  // Exchange code for tokens
  const tokens = await oauthProviders.exchangeOAuthCode(provider, code, redirectUri, c.env)
  if (!tokens) {
    return c.json(error('CODE_EXCHANGE_FAILED', 'Failed to exchange code'), 500)
  }

  // Get user from session
  const authHeader = c.req.header('Authorization')
  const sessionResult = await sessions.validateSession(c.env, authHeader?.substring(7))

  // Store tokens
  const oauthToken: oauthProviders.OAuthToken = {
    userId: sessionResult.userId,
    provider,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
    scopes: tokens.scope ? tokens.scope.split(' ') : [],
    tokenType: 'bearer',
  }

  await oauthProviders.storeOAuthToken(oauthToken, c.env)

  // Redirect back
  const finalUrl = new URL(redirectUri)
  finalUrl.searchParams.set('provider', provider)
  finalUrl.searchParams.set('status', 'connected')

  return c.redirect(finalUrl.toString())
}
```

## 4. TypeScript Types

**File:** `workers/auth/src/types.ts`

```typescript
export type OAuthProviderName = 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure'

export interface OAuthAuthRequest {
  provider: OAuthProviderName
  redirectUri: string
  state: string
}

export interface OAuthTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tokenType: string
  scopes: string[]
}
```

## 5. Usage Examples

### In a Worker Service

```typescript
// Get valid token (auto-refreshes if needed)
const token = await getValidOAuthToken(userId, 'vercel', env)

if (token) {
  // Make API call to Vercel
  const response = await fetch('https://api.vercel.com/v2/deployments', {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      name: 'my-project',
      gitSource: { type: 'github', repo: 'user/repo' },
    }),
  })

  const deployment = await response.json()
  return deployment
}
```

### In Frontend

```typescript
// Connect Vercel account
function connectVercel() {
  window.location.href = '/oauth/vercel/authorize?redirect_uri=' +
    encodeURIComponent(window.location.origin + '/settings/integrations')
}

// After redirect
const params = new URLSearchParams(window.location.search)
if (params.get('status') === 'connected') {
  alert(`${params.get('provider')} connected!`)
}
```

## 6. Environment Variables

```bash
# Add to wrangler.jsonc or set via `wrangler secret put`

# Vercel
VERCEL_CLIENT_ID=oac_xxx
VERCEL_CLIENT_SECRET=xxx

# Netlify
NETLIFY_CLIENT_ID=xxx
NETLIFY_CLIENT_SECRET=xxx

# AWS Cognito
AWS_COGNITO_CLIENT_ID=xxx
AWS_COGNITO_CLIENT_SECRET=xxx
AWS_COGNITO_DOMAIN=my-domain
AWS_REGION=us-east-1

# GCP
GCP_CLIENT_ID=xxx.apps.googleusercontent.com
GCP_CLIENT_SECRET=xxx

# Azure
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx
AZURE_TENANT_ID=xxx

# Encryption (shared)
ENCRYPTION_SECRET=xxx
```

## 7. Database Schema

```sql
CREATE TABLE oauth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMP,
  scopes TEXT, -- JSON array
  token_type TEXT DEFAULT 'bearer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);
```

## 8. Test Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getOAuthAuthUrl, exchangeOAuthCode } from '../src/oauth-providers'

describe('OAuth Providers', () => {
  it('should generate Vercel auth URL', async () => {
    const url = await getOAuthAuthUrl('vercel', 'https://app.do/callback', 'state123', mockEnv)

    expect(url).toContain('https://api.vercel.com/v2/oauth/authorize')
    expect(url).toContain('client_id=')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('state=state123')
  })

  it('should exchange code for tokens', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token_xyz',
        expires_in: 3600,
      }),
    })

    const tokens = await exchangeOAuthCode('vercel', 'code123', 'https://app.do/callback', mockEnv)

    expect(tokens).toBeDefined()
    expect(tokens?.access_token).toBe('token_xyz')
  })
})
```

---

**Quick Start:**
1. Copy `oauth-providers.ts` to `workers/auth/src/`
2. Add OAuth types to `types.ts`
3. Add OAuth endpoints to `oauth-endpoints.ts`
4. Set environment variables
5. Deploy: `wrangler deploy`
6. Test: `GET /oauth/vercel/authorize?redirect_uri=...`

**Total Implementation:** ~1,462 lines of code across 4 files
