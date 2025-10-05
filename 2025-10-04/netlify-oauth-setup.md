# Netlify OAuth 2.0 Integration Setup Guide

**Date:** 2025-10-04
**Purpose:** Comprehensive guide for setting up OAuth 2.0 integration with Netlify API

---

## Quick Reference

### OAuth Endpoints

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Authorization | `https://app.netlify.com/authorize` | User authorization |
| Token Exchange | `https://api.netlify.com/oauth/token` | Code-to-token exchange |
| Token Creation | `https://api.netlify.com/api/v1/oauth/applications/create_token` | Create personal access tokens |
| User Info | `https://api.netlify.com/api/v1/user` | Get current user details |
| API Base | `https://api.netlify.com/api/v1/` | All API requests |

### Rate Limits

- **General API**: 500 requests per minute
- **Deployments**: 3 per minute, 100 per day
- **Protocol**: HTTPS only
- **Monitoring**: Check HTTP headers for current rate limit status

---

## 1. OAuth Application Registration

### Step-by-Step Registration

1. **Navigate to User Settings**
   - Log into your Netlify account
   - Go to **User Settings** → **OAuth applications**
   - Alternative path: **Applications** → **OAuth applications**

2. **Create New OAuth Application**
   - Click "New OAuth application" or "Register new application"
   - Fill in application details:
     - **Application name**: Your app name
     - **Redirect URI**: Your callback URL (see section 7 below)
     - **Description**: Optional description of your integration

3. **Obtain Credentials**
   - After registration, you'll receive:
     - **Client ID**: Public identifier for your application
     - **Client Secret**: Secret key (keep secure, never expose publicly)
   - Store these securely (environment variables recommended)

### Security Best Practices

- Never commit client secrets to version control
- Use environment variables or secret managers
- Rotate secrets periodically
- Keep client secret server-side only

---

## 2. OAuth Authorization Endpoint

### Endpoint Details

```
URL: https://app.netlify.com/authorize
Method: GET (browser redirect)
```

### Authorization Request Parameters

#### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Your OAuth application's client ID |
| `response_type` | string | `code` (authorization code flow) or `token` (implicit flow) |
| `redirect_uri` | string | Must match registered redirect URI |

#### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | CSRF protection token (highly recommended) |
| `scope` | string | Currently limited; defaults to user-level access |

### Example Authorization URL (Authorization Code Flow)

```
https://app.netlify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://yourapp.com/callback&state=RANDOM_UUID_STATE
```

### Example Authorization URL (Implicit Flow)

```
https://app.netlify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=token&redirect_uri=http://localhost:8888/&state=RANDOM_UUID_STATE
```

### State Parameter Generation (JavaScript)

```javascript
// Generate cryptographically secure state parameter
const state = crypto.randomUUID();

// Store state for validation (client-side)
localStorage.setItem('oauth_state', state);

// Or store in HTTP-only cookie (server-side - recommended)
// Set-Cookie: oauth_state=VALUE; HttpOnly; Secure; SameSite=Lax
```

---

## 3. Token Endpoint

### Endpoint Details

```
URL: https://api.netlify.com/oauth/token
Method: POST
Content-Type: application/json or application/x-www-form-urlencoded
```

### Token Exchange Parameters (Authorization Code Flow)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | `authorization_code` |
| `code` | string | Yes | Authorization code from callback |
| `client_id` | string | Yes | Your OAuth application's client ID |
| `client_secret` | string | Yes | Your OAuth application's client secret |
| `redirect_uri` | string | Yes | Must match the original redirect URI |

### Example Token Exchange Request

```bash
curl -X POST https://api.netlify.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uri": "https://yourapp.com/callback"
  }'
```

### Token Response

```json
{
  "access_token": "netlify_oauth_token_here",
  "token_type": "Bearer",
  "created_at": 1696464000
}
```

### Refresh Token Support

**Current Status:** Netlify OAuth does not currently provide refresh tokens in the standard flow.

**Workarounds:**
- Use Personal Access Tokens (PATs) with configurable expiration
- Re-authenticate users when tokens expire
- Monitor token validity before API calls

---

## 4. User Info Endpoint

### Endpoint Details

```
URL: https://api.netlify.com/api/v1/user
Method: GET, PATCH
Authentication: Bearer token required
```

### Get Current User

```bash
curl https://api.netlify.com/api/v1/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Response Example

```json
{
  "id": "user_id_here",
  "uid": "unique_user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "affiliate_id": "affiliate_id",
  "site_count": 5,
  "created_at": "2023-01-15T10:30:00.000Z",
  "last_login": "2025-10-04T09:15:00.000Z",
  "login_providers": ["email", "github"],
  "onboarding_progress": {}
}
```

### Update User (PATCH)

```bash
curl -X PATCH https://api.netlify.com/api/v1/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'
```

---

## 5. Required Scopes

### Current Scope Implementation

**Important Limitation:** Netlify's OAuth implementation currently has **limited scope support**.

- **Default Scope**: User-level access (effectively full access to user's resources)
- **Scope Parameter**: Currently not fully implemented
- **Access Level**: OAuth tokens are scoped to user permissions
- **Team Isolation**: No current ability to restrict access to specific teams or sites

### Known Issues

1. **Full Access**: OAuth applications receive access to everything the user can access
2. **No Granular Permissions**: Cannot limit to specific teams, sites, or operations
3. **Feature Request**: Community has requested proper scope support ([Issue #168](https://github.com/netlify/open-api/issues/168))

### Recommended Approach

- Request minimal permissions in your application documentation
- Clearly communicate what your integration will access
- Consider using Personal Access Tokens for internal/single-user integrations
- Monitor Netlify's changelog for scope support updates

### Future Scope Expectations

When scopes are implemented, expect support for:
- Site-specific access (`site:read`, `site:write`)
- Deploy operations (`deploy:create`, `deploy:manage`)
- Team-level restrictions (`team:read`, `team:write`)
- User information (`user:read`, `user:email`)

---

## 6. OAuth Application Setup Process

### Complete Registration Workflow

#### 1. Access OAuth Settings

```
Netlify Dashboard → User Settings → OAuth applications
```

#### 2. Register Application

- Click **"New OAuth application"**
- Fill in required fields:
  - Application name
  - Homepage URL (optional but recommended)
  - Authorization callback URL (critical - see section 7)
  - Application description

#### 3. Configure Application

- Choose application type (if applicable)
- Set redirect URIs (can register multiple)
- Configure webhook URLs (optional)
- Set environment (production/development)

#### 4. Save and Obtain Credentials

- Click **"Register application"**
- Copy and securely store:
  - Client ID (public)
  - Client Secret (private - only shown once)

#### 5. Store Credentials Securely

**Environment Variables (Recommended):**

```bash
# .env.local (DO NOT COMMIT)
NETLIFY_CLIENT_ID=your_client_id_here
NETLIFY_CLIENT_SECRET=your_client_secret_here
NETLIFY_REDIRECT_URI=https://yourapp.com/callback
```

**In Code:**

```javascript
const config = {
  clientId: process.env.NETLIFY_CLIENT_ID,
  clientSecret: process.env.NETLIFY_CLIENT_SECRET,
  redirectUri: process.env.NETLIFY_REDIRECT_URI,
  authorizationUrl: 'https://app.netlify.com/authorize',
  tokenUrl: 'https://api.netlify.com/oauth/token'
};
```

---

## 7. Redirect URL Requirements

### Redirect URI Rules

1. **Exact Match Required**
   - The redirect URI in authorization requests must **exactly match** a registered URI
   - Protocol (http/https), domain, port, and path must all match
   - Query parameters and fragments are not considered in matching

2. **Multiple URIs**
   - Register multiple redirect URIs for different environments:
     - `http://localhost:8888/callback` (development)
     - `http://localhost:3000/callback` (alternative development)
     - `https://yourapp.com/callback` (production)
     - `https://www.yourapp.com/callback` (production with www)

3. **HTTPS Requirement**
   - Production redirect URIs **must use HTTPS**
   - HTTP allowed only for localhost development
   - Consider using `https://127.0.0.1` for local development if needed

4. **Localhost Development**
   - `http://localhost:PORT` is allowed
   - Common ports: 3000, 8080, 8888
   - Netlify Dev uses port 8888 by default

### Standard Redirect URI Patterns

#### For Netlify Extensions

```
https://api.netlify.com/auth/done/identeer
```

#### For Third-Party Integrations

```
https://api.netlify.com/auth/done
```

#### For Custom Applications

```
https://your-domain.com/integrations/netlify/oauth2/callback
https://your-domain.com/auth/netlify/callback
https://your-domain.com/api/oauth/netlify/callback
```

### Callback Handling

#### 1. Receive Authorization Code

After user authorization, Netlify redirects to:

```
https://yourapp.com/callback?code=AUTH_CODE&state=ORIGINAL_STATE
```

#### 2. Validate State Parameter

```javascript
// Server-side validation
const receivedState = req.query.state;
const storedState = req.session.oauth_state; // or from cookie

if (receivedState !== storedState) {
  throw new Error('Invalid state parameter - possible CSRF attack');
}
```

#### 3. Extract Authorization Code

```javascript
const authorizationCode = req.query.code;

if (!authorizationCode) {
  throw new Error('No authorization code received');
}
```

#### 4. Exchange Code for Token

```javascript
const tokenResponse = await fetch('https://api.netlify.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: process.env.NETLIFY_CLIENT_ID,
    client_secret: process.env.NETLIFY_CLIENT_SECRET,
    redirect_uri: process.env.NETLIFY_REDIRECT_URI
  })
});

const { access_token } = await tokenResponse.json();
```

### Custom Domain Considerations

When using Netlify's custom domain features:

- Use your **custom domain** in redirect URIs, not Netlify subdomain
- Register both `www` and non-`www` versions if applicable
- Update OAuth settings when changing domains
- Test thoroughly after domain changes

---

## 8. API Access Patterns

### Authentication Methods

#### Bearer Token Authentication (Recommended)

```bash
curl https://api.netlify.com/api/v1/sites \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Personal Access Token (Alternative)

```bash
curl https://api.netlify.com/api/v1/sites \
  -H "Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN"
```

### Common API Operations

#### 1. List User's Sites

```bash
GET https://api.netlify.com/api/v1/sites
Authorization: Bearer YOUR_ACCESS_TOKEN
```

```javascript
const sites = await fetch('https://api.netlify.com/api/v1/sites', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
}).then(r => r.json());
```

#### 2. Get Site Details

```bash
GET https://api.netlify.com/api/v1/sites/{site_id}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 3. List Deploys

```bash
GET https://api.netlify.com/api/v1/sites/{site_id}/deploys
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 4. Create Deploy

```bash
POST https://api.netlify.com/api/v1/sites/{site_id}/deploys
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "files": { ... },
  "draft": false
}
```

#### 5. List Accounts

```bash
GET https://api.netlify.com/api/v1/accounts
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 6. Manage Environment Variables

```bash
GET https://api.netlify.com/api/v1/accounts/{account_id}/env
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Pagination

Many list endpoints support pagination:

```bash
GET https://api.netlify.com/api/v1/sites?page=2&per_page=50
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Results per page (max: 100)

### Error Handling

```javascript
const response = await fetch('https://api.netlify.com/api/v1/user', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error);

  // Handle specific error codes
  switch (response.status) {
    case 401:
      // Unauthorized - token invalid or expired
      break;
    case 403:
      // Forbidden - insufficient permissions
      break;
    case 429:
      // Rate limit exceeded
      const retryAfter = response.headers.get('Retry-After');
      break;
    case 500:
      // Server error
      break;
  }
}
```

### Rate Limit Monitoring

```javascript
const response = await fetch(url, { headers });

// Check rate limit headers
const rateLimit = {
  limit: response.headers.get('X-RateLimit-Limit'),
  remaining: response.headers.get('X-RateLimit-Remaining'),
  reset: response.headers.get('X-RateLimit-Reset')
};

console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
console.log(`Resets at: ${new Date(rateLimit.reset * 1000)}`);
```

---

## 9. Special Considerations

### Security Best Practices

#### 1. CSRF Protection with State Parameter

**Generate Secure State:**

```javascript
// Node.js
const crypto = require('crypto');
const state = crypto.randomUUID();

// Or using Web Crypto API
const state = crypto.randomUUID();
```

**Store State Securely:**

```javascript
// Server-side (recommended)
req.session.oauth_state = state;

// Or HTTP-only cookie
res.cookie('oauth_state', state, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 600000 // 10 minutes
});
```

**Validate on Callback:**

```javascript
const receivedState = req.query.state;
const storedState = req.session.oauth_state;

if (!receivedState || receivedState !== storedState) {
  return res.status(403).send('Invalid state parameter');
}

// Clear state after validation
delete req.session.oauth_state;
```

#### 2. Token Storage

**Server-Side (Recommended):**
- Store in encrypted session
- Use secure cookie storage
- Consider using Redis or database for persistence

```javascript
// Store in encrypted session
req.session.netlify_token = {
  access_token: token,
  created_at: Date.now(),
  user_id: userId
};
```

**Client-Side (If Necessary):**
- Use httpOnly cookies (set by server)
- Never store in localStorage for sensitive apps
- Consider token lifetime and automatic refresh

**Bad Practice (Avoid):**
```javascript
// DON'T DO THIS
localStorage.setItem('netlify_token', token); // Vulnerable to XSS
```

#### 3. PKCE Support

**Current Status:** Netlify does not explicitly document PKCE support, but it's recommended for public clients.

**Implementation (If Supported):**

```javascript
// Generate code verifier
const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

// Generate code challenge
const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
};

// Use in authorization request
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store code verifier for token exchange
sessionStorage.setItem('code_verifier', codeVerifier);

// Add to authorization URL
const authUrl = `https://app.netlify.com/authorize?` +
  `client_id=${clientId}&` +
  `response_type=code&` +
  `redirect_uri=${redirectUri}&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;
```

#### 4. Token Expiration Handling

```javascript
// Store token with creation time
const tokenData = {
  access_token: token,
  created_at: Date.now(),
  expires_in: 3600000 // 1 hour in milliseconds (if provided)
};

// Check if token is expired
const isTokenExpired = (tokenData) => {
  if (!tokenData.expires_in) return false; // No expiration

  const expirationTime = tokenData.created_at + tokenData.expires_in;
  return Date.now() >= expirationTime;
};

// Refresh or re-authenticate if expired
if (isTokenExpired(tokenData)) {
  // Re-authenticate user
  redirectToAuthorization();
}
```

### OAuth Flow Types

#### 1. Authorization Code Flow (Recommended)

**Use Case:** Server-side applications, mobile apps

**Pros:**
- Most secure
- Client secret kept server-side
- Supports refresh tokens (when available)

**Flow:**
1. Redirect to authorization endpoint
2. User authorizes
3. Receive authorization code
4. Exchange code for token (server-side)
5. Store and use token

#### 2. Implicit Flow (Legacy)

**Use Case:** Single-page applications (historical)

**Pros:**
- Simpler implementation
- No server-side code required

**Cons:**
- Less secure (token in URL)
- No refresh tokens
- Not recommended for new applications

**Flow:**
1. Redirect to authorization endpoint with `response_type=token`
2. User authorizes
3. Receive access token in URL fragment
4. Extract and use token

**Important:** Modern best practice recommends using Authorization Code Flow with PKCE even for SPAs.

### Netlify-Specific Considerations

#### 1. Deploy Webhooks

OAuth tokens can be used to set up webhooks for deploy events:

```javascript
const webhook = await fetch('https://api.netlify.com/api/v1/hooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    site_id: siteId,
    type: 'url',
    event: 'deploy_created',
    data: { url: 'https://yourapp.com/webhook/netlify' }
  })
});
```

#### 2. Team-Level Access

When a user belongs to multiple teams:
- OAuth token grants access to all teams the user can access
- No way to restrict to specific team (current limitation)
- API calls can filter by team using team/account IDs

#### 3. Personal Access Token Alternative

For internal tools or personal integrations:

```javascript
// Generate PAT via OAuth
const patResponse = await fetch('https://api.netlify.com/api/v1/oauth/applications/create_token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${oauthAccessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    expires_at: Math.floor(Date.now() / 1000) + 604800, // 7 days
    description: 'Generated via OAuth'
  })
});
```

#### 4. Extension Development

For Netlify Extensions (UI Extensions):
- Use `@netlify/sdk` for simplified OAuth
- Built-in `ProviderAuthCard` component
- Automatic token management
- Redirect URI: `https://api.netlify.com/auth/done/identeer`

```typescript
import { ProviderAuthCard } from "@netlify/sdk/ui/react/components";

export const TeamConfiguration = () => (
  <TeamConfigurationSurface>
    <ProviderAuthCard />
  </TeamConfigurationSurface>
);
```

#### 5. Netlify Identity vs OAuth

**Netlify Identity:** For authenticating end-users of your site
**Netlify OAuth:** For integrating with Netlify API

Don't confuse:
- **Identity (GoTrue):** User authentication service for your app
- **OAuth:** API integration for managing Netlify resources

---

## 10. Complete Implementation Example

### Full OAuth Flow Implementation (Node.js/Express)

```javascript
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const app = express();

// Configuration
const config = {
  clientId: process.env.NETLIFY_CLIENT_ID,
  clientSecret: process.env.NETLIFY_CLIENT_SECRET,
  redirectUri: process.env.NETLIFY_REDIRECT_URI,
  authorizationUrl: 'https://app.netlify.com/authorize',
  tokenUrl: 'https://api.netlify.com/oauth/token',
  apiBaseUrl: 'https://api.netlify.com/api/v1'
};

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));

// Step 1: Initiate OAuth flow
app.get('/auth/netlify', (req, res) => {
  // Generate and store state for CSRF protection
  const state = crypto.randomUUID();
  req.session.oauth_state = state;

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    state: state
  });

  const authUrl = `${config.authorizationUrl}?${params.toString()}`;

  // Redirect user to Netlify authorization page
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback
app.get('/auth/netlify/callback', async (req, res) => {
  try {
    // Validate state parameter
    const receivedState = req.query.state;
    const storedState = req.session.oauth_state;

    if (!receivedState || receivedState !== storedState) {
      return res.status(403).send('Invalid state parameter - possible CSRF attack');
    }

    // Clear state after validation
    delete req.session.oauth_state;

    // Check for authorization code
    const code = req.query.code;
    if (!code) {
      return res.status(400).send('No authorization code received');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return res.status(500).send('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();

    // Store access token in session
    req.session.netlify_token = {
      access_token: tokenData.access_token,
      created_at: Date.now()
    };

    // Fetch user information
    const userResponse = await fetch(`${config.apiBaseUrl}/user`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      req.session.user = userData;
    }

    // Redirect to success page
    res.redirect('/dashboard');

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Step 3: Use access token for API calls
app.get('/api/sites', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.netlify_token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const accessToken = req.session.netlify_token.access_token;

    // Fetch sites from Netlify API
    const response = await fetch(`${config.apiBaseUrl}/sites`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        delete req.session.netlify_token;
        return res.status(401).json({ error: 'Token expired' });
      }
      throw new Error(`API error: ${response.status}`);
    }

    const sites = await response.json();
    res.json(sites);

  } catch (error) {
    console.error('API request error:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Frontend Integration (React)

```javascript
import { useEffect, useState } from 'react';

function NetlifyIntegration() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initiate OAuth flow
  const handleConnect = () => {
    window.location.href = '/auth/netlify';
  };

  // Fetch sites after authentication
  const fetchSites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sites');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, redirect to login
          handleConnect();
          return;
        }
        throw new Error('Failed to fetch sites');
      }

      const data = await response.json();
      setSites(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Netlify Sites</h1>
      {sites.length === 0 ? (
        <button onClick={handleConnect}>Connect Netlify</button>
      ) : (
        <ul>
          {sites.map(site => (
            <li key={site.id}>
              <h3>{site.name}</h3>
              <p>{site.url}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NetlifyIntegration;
```

---

## 11. Testing and Development

### Local Development Setup

1. **Use Netlify Dev for local testing:**

```bash
npm install netlify-cli -g
netlify dev
```

2. **Set up local redirect URI:**

```
http://localhost:8888/callback
```

3. **Environment variables for development:**

```bash
# .env.local
NETLIFY_CLIENT_ID=your_client_id
NETLIFY_CLIENT_SECRET=your_client_secret
NETLIFY_REDIRECT_URI=http://localhost:8888/callback
SESSION_SECRET=random_secret_for_dev
```

### Testing OAuth Flow

1. **Test authorization redirect:**
   - Visit `/auth/netlify`
   - Verify redirect to `app.netlify.com/authorize`
   - Check URL parameters (client_id, state, redirect_uri)

2. **Test callback handling:**
   - Complete authorization
   - Verify state parameter validation
   - Check token exchange success
   - Confirm user session creation

3. **Test API calls:**
   - Fetch user information
   - List sites
   - Test error handling (invalid token, rate limits)

### Common Testing Scenarios

```javascript
// Test helper for OAuth flow
const testOAuthFlow = async () => {
  // 1. Generate state
  const state = crypto.randomUUID();
  console.log('Generated state:', state);

  // 2. Build authorization URL
  const authUrl = buildAuthorizationUrl(state);
  console.log('Authorization URL:', authUrl);

  // 3. Simulate callback (replace with actual code)
  const mockCode = 'mock_authorization_code';
  const mockState = state;

  // 4. Exchange code for token
  const token = await exchangeCodeForToken(mockCode);
  console.log('Access token received:', !!token);

  // 5. Test API call
  const user = await fetchUser(token);
  console.log('User info:', user);
};
```

---

## 12. Troubleshooting

### Common Issues and Solutions

#### 1. Redirect URI Mismatch

**Error:** `redirect_uri_mismatch`

**Causes:**
- Redirect URI in request doesn't match registered URI
- Protocol mismatch (http vs https)
- Port number differences
- Trailing slash differences

**Solutions:**
- Verify exact match with registered URI
- Check protocol (http/https)
- Ensure port numbers match
- Register multiple URIs for different environments

#### 2. Invalid State Parameter

**Error:** `Invalid state parameter`

**Causes:**
- State not stored before redirect
- Session expired between authorization and callback
- Cookie settings blocking session storage
- CSRF attack attempt

**Solutions:**
- Verify session middleware is working
- Check cookie settings (secure, httpOnly, sameSite)
- Increase session timeout if necessary
- Test in incognito/private mode

#### 3. Token Exchange Fails

**Error:** `Failed to exchange authorization code`

**Causes:**
- Invalid client secret
- Authorization code already used
- Authorization code expired (10 minutes)
- Incorrect redirect_uri in token exchange

**Solutions:**
- Verify client secret is correct
- Don't refresh callback page (code can only be used once)
- Complete token exchange quickly after authorization
- Ensure redirect_uri matches exactly

#### 4. Unauthorized API Calls

**Error:** `401 Unauthorized`

**Causes:**
- Missing authorization header
- Invalid or expired token
- Malformed bearer token format

**Solutions:**
```javascript
// Correct format
headers: {
  'Authorization': `Bearer ${accessToken}` // Note the space after "Bearer"
}

// Incorrect formats (don't use these)
headers: {
  'Authorization': accessToken, // Missing "Bearer"
  'Authorization': `Bearer${accessToken}`, // Missing space
  'Token': accessToken // Wrong header name
}
```

#### 5. Rate Limit Exceeded

**Error:** `429 Too Many Requests`

**Causes:**
- Exceeded 500 requests per minute
- Exceeded deployment limits (3/min, 100/day)

**Solutions:**
```javascript
// Implement exponential backoff
const makeRequestWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

      console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
};
```

#### 6. CORS Issues

**Error:** `CORS policy blocked`

**Causes:**
- Making API calls from client-side JavaScript
- Netlify API doesn't support CORS for direct browser calls

**Solutions:**
- Use server-side proxy for API calls
- Never expose client secret to frontend
- Make OAuth token exchange server-side only

```javascript
// Good: Server-side proxy
app.get('/api/sites', async (req, res) => {
  const response = await fetch('https://api.netlify.com/api/v1/sites', {
    headers: { 'Authorization': `Bearer ${req.session.token}` }
  });
  const data = await response.json();
  res.json(data);
});

// Bad: Direct client-side call (will fail)
fetch('https://api.netlify.com/api/v1/sites', {
  headers: { 'Authorization': `Bearer ${token}` }
}); // CORS error
```

---

## 13. Resources and References

### Official Documentation

- **Netlify API Docs:** https://docs.netlify.com/api/get-started/
- **OpenAPI Reference:** https://open-api.netlify.com/
- **OAuth Guide:** https://developers.netlify.com/guides/generating-personal-access-tokens-with-netlify-oauth/
- **SDK OAuth Docs:** https://developers.netlify.com/sdk/oauth/get-started/

### Example Repositories

- **Official OAuth Example:** https://github.com/netlify/netlify-oauth-example
- **OAuth Labs Example:** https://github.com/netlify-labs/oauth-example
- **Auth Demo:** https://github.com/netlify/netlify-auth-demo

### Community Resources

- **Netlify Support Forums:** https://answers.netlify.com/
- **Open API Issues:** https://github.com/netlify/open-api/issues
- **Medium Guide:** https://medium.com/@tony.infisical/guide-to-using-oauth-2-0-to-access-netlify-api-473ee4675434

### Related Documentation

- **OAuth 2.0 Specification:** https://oauth.net/2/
- **OAuth 2.0 Security Best Practices:** https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
- **OWASP OAuth Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html

---

## Summary Checklist

### Pre-Implementation

- [ ] Register OAuth application in Netlify settings
- [ ] Obtain client ID and client secret
- [ ] Configure redirect URIs for all environments
- [ ] Store credentials securely (environment variables)
- [ ] Review scope limitations (currently minimal)

### Authorization Flow

- [ ] Generate secure state parameter (CSRF protection)
- [ ] Build authorization URL with correct parameters
- [ ] Redirect user to Netlify authorization endpoint
- [ ] Handle user authorization (or denial)

### Callback Handling

- [ ] Validate state parameter matches
- [ ] Extract authorization code from callback
- [ ] Exchange code for access token (server-side)
- [ ] Store access token securely (session/database)
- [ ] Fetch user information from API

### API Integration

- [ ] Use Bearer token authentication
- [ ] Implement error handling (401, 403, 429, 500)
- [ ] Monitor rate limits (500 req/min)
- [ ] Handle token expiration gracefully
- [ ] Test all API endpoints needed

### Security

- [ ] Never expose client secret to frontend
- [ ] Use HTTPS for production redirect URIs
- [ ] Implement CSRF protection with state parameter
- [ ] Store tokens securely (HTTP-only cookies/encrypted sessions)
- [ ] Validate all callback parameters
- [ ] Clear sensitive data after use

### Production Readiness

- [ ] Test OAuth flow end-to-end
- [ ] Implement proper error handling
- [ ] Add logging and monitoring
- [ ] Document integration for your team
- [ ] Set up alerts for rate limit issues
- [ ] Plan for token expiration scenarios

---

**Document Version:** 1.0
**Last Updated:** 2025-10-04
**Next Review:** When Netlify adds scope support or refresh token functionality
