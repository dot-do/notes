# Microsoft Azure / Microsoft Entra ID OAuth 2.0 Integration Guide

**Date:** 2025-10-04
**Purpose:** Comprehensive guide for setting up OAuth 2.0 integration with Microsoft Azure/Entra ID

---

## Table of Contents
1. [OAuth Endpoints](#oauth-endpoints)
2. [User Info Endpoint (Microsoft Graph)](#user-info-endpoint-microsoft-graph)
3. [Required Scopes](#required-scopes)
4. [Application Registration Process](#application-registration-process)
5. [Client ID/Secret Setup](#client-idsecret-setup)
6. [Redirect URL Requirements](#redirect-url-requirements)
7. [API Access Patterns](#api-access-patterns)
8. [Special Considerations](#special-considerations)
9. [Token Management Best Practices](#token-management-best-practices)
10. [Quick Reference](#quick-reference)

---

## OAuth Endpoints

### Base Endpoint Structure
All endpoints use the tenant-specific or common authority:
- **Tenant-specific:** `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/`
- **Multi-tenant (common):** `https://login.microsoftonline.com/common/oauth2/v2.0/`

Replace `{tenant}` with:
- Your Azure AD tenant ID (GUID)
- Your tenant domain name (e.g., `contoso.onmicrosoft.com`)
- `common` for multi-tenant applications
- `organizations` for work/school accounts only
- `consumers` for personal Microsoft accounts only

### Primary OAuth 2.0 Endpoints

#### 1. Authorization Endpoint
```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
```
**Purpose:** Initiates user authentication and authorization
**Method:** GET (browser redirect)
**Use:** Authorization code flow, implicit flow

#### 2. Token Endpoint
```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
```
**Purpose:** Exchange authorization code for access/refresh tokens
**Method:** POST
**Use:** All token operations (authorization code, refresh token, client credentials)

#### 3. Device Authorization Endpoint
```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode
```
**Purpose:** Device code flow for input-constrained devices
**Method:** POST

#### 4. Logout Endpoint
```
https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout
```
**Purpose:** Sign out user and clear session
**Method:** GET (browser redirect)

#### 5. JWKS (JSON Web Key Set) Endpoint
```
https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys
```
**Purpose:** Public keys for token signature verification
**Method:** GET

### OpenID Connect Discovery Document
```
https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
```
**Purpose:** Metadata document with all endpoint URLs and capabilities

---

## User Info Endpoint (Microsoft Graph)

### UserInfo Endpoint (OIDC Standard)
```
https://graph.microsoft.com/oidc/userinfo
```
**Method:** GET
**Authentication:** Bearer token (access token)
**Required Scopes:** `openid`, `profile`, `email`

**Returns:** Standard OIDC user claims:
- `sub` (subject identifier)
- `name`
- `given_name`
- `family_name`
- `email`
- `picture`

### Enhanced User Information (Microsoft Graph API)

For detailed user information beyond OIDC standard claims:

#### Get Current User
```
GET https://graph.microsoft.com/v1.0/me
```
**Required Scope:** `User.Read`

#### Get Specific User
```
GET https://graph.microsoft.com/v1.0/users/{id-or-userPrincipalName}
```
**Required Scope:** `User.Read.All` (application) or `User.ReadBasic.All` (delegated)

**Available Properties:**
- Basic: `displayName`, `mail`, `userPrincipalName`, `jobTitle`, `officeLocation`
- Advanced: `manager`, `directReports`, `memberOf`, `photo`
- Extended: `employeeId`, `department`, `companyName`, `mobilePhone`

---

## Required Scopes

### OpenID Connect Standard Scopes

| Scope | Description | Admin Consent Required |
|-------|-------------|----------------------|
| `openid` | Required for OIDC authentication, returns `sub` claim | No |
| `profile` | User's full name, given name, family name, and other profile info | No |
| `email` | User's email address | No |
| `offline_access` | Refresh tokens for long-lived access | No |

### Microsoft Graph Common Scopes

#### User Scopes
| Scope | Type | Description | Admin Consent |
|-------|------|-------------|---------------|
| `User.Read` | Delegated | Read signed-in user's profile | No |
| `User.ReadWrite` | Delegated | Read and update signed-in user's profile | No |
| `User.ReadBasic.All` | Delegated | Read basic profiles of all users | No |
| `User.Read.All` | Delegated/Application | Read all users' full profiles | Yes |
| `User.ReadWrite.All` | Delegated/Application | Read and write all users' full profiles | Yes |

#### Mail Scopes
| Scope | Type | Description | Admin Consent |
|-------|------|-------------|---------------|
| `Mail.Read` | Delegated/Application | Read user's mail | No (Delegated) / Yes (Application) |
| `Mail.ReadWrite` | Delegated/Application | Read and write user's mail | No (Delegated) / Yes (Application) |
| `Mail.Send` | Delegated/Application | Send mail as user | No (Delegated) / Yes (Application) |

#### Calendar Scopes
| Scope | Type | Description | Admin Consent |
|-------|------|-------------|---------------|
| `Calendars.Read` | Delegated/Application | Read user's calendars | No (Delegated) / Yes (Application) |
| `Calendars.ReadWrite` | Delegated/Application | Read and write user's calendars | No (Delegated) / Yes (Application) |

#### Files Scopes
| Scope | Type | Description | Admin Consent |
|-------|------|-------------|---------------|
| `Files.Read` | Delegated | Read user's files | No |
| `Files.Read.All` | Delegated/Application | Read all files user can access | Yes |
| `Files.ReadWrite` | Delegated | Read and write user's files | No |
| `Files.ReadWrite.All` | Delegated/Application | Read and write all files user can access | Yes |

### Azure Resource Manager Scopes

#### Primary Scope
```
https://management.azure.com/user_impersonation
```
**Description:** Access Azure Service Management as the signed-in user
**Type:** Delegated only
**Admin Consent:** No

#### Client Credentials Flow Scope
```
https://management.azure.com/.default
```
**Description:** All permissions configured in app registration
**Type:** Application
**Admin Consent:** Yes

**Important:** Note the double slash `//` when requesting this scope:
```
https://management.azure.com//.default
```

### Scope Format

#### Delegated Permissions (User Context)
Format: `{resource}/{permission}`
Examples:
- `https://graph.microsoft.com/User.Read`
- `User.Read` (short form)
- `Mail.Read Mail.Send` (space-separated multiple scopes)

#### Application Permissions (App-Only Context)
Format: `{resource}/.default`
Examples:
- `https://graph.microsoft.com/.default`
- `https://management.azure.com/.default`

---

## Application Registration Process

### Step 1: Access Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Sign in with an account that has at least **Application Developer** role
3. Search for "Microsoft Entra ID" or "Azure Active Directory"

### Step 2: Register New Application

1. In Microsoft Entra ID blade, select **App registrations** (left menu)
2. Click **+ New registration** button
3. Fill in application details:

#### Application Details

**Name:**
- Enter a user-facing name for your application
- Example: "My OAuth App"

**Supported account types:** (Choose one)
- **Single tenant:** Accounts in this organizational directory only
  - Use for internal apps
  - Best for enterprise applications
- **Multi-tenant:** Accounts in any organizational directory
  - Use for B2B SaaS applications
  - Requires organization admin consent
- **Multi-tenant + Personal:** Accounts in any org directory + personal Microsoft accounts
  - Use for consumer-facing apps
  - Broadest user base
- **Personal only:** Personal Microsoft accounts only
  - Use for consumer apps not needing work/school accounts

**Redirect URI:** (Optional at registration, recommended to add)
- Select platform: **Web**, **Single-page application (SPA)**, **Mobile and desktop**
- Enter your callback URL (see Redirect URL Requirements section)

4. Click **Register** button

### Step 3: Record Application (Client) ID

After registration:
1. You'll be redirected to the app's **Overview** page
2. **Copy and save** the **Application (client) ID** (GUID format)
3. **Copy and save** the **Directory (tenant) ID** if using tenant-specific endpoints
4. Store these securely (e.g., environment variables, secret manager)

### Step 4: Configure Authentication Settings

1. In the app registration, select **Authentication** (left menu)
2. Configure platform-specific settings:

#### Web Applications
- Add redirect URIs (up to 256 per app)
- Configure logout URL
- Enable ID tokens (if using implicit flow)
- Enable access tokens (if using implicit flow - not recommended)

#### Single-Page Applications (SPA)
- Add redirect URIs
- PKCE is automatically enabled
- Refresh tokens limited to 24-hour lifetime

#### Mobile and Desktop
- Add custom redirect URIs
- Can use `http://localhost` for development

3. Configure advanced settings:
- **Allow public client flows:** Enable for mobile/desktop apps
- **Supported account types:** Can be changed here if needed

---

## Client ID/Secret Setup

### Client ID

The **Application (client) ID** is automatically generated during registration:
- Found on the app's **Overview** page
- GUID format: `12345678-1234-1234-1234-123456789012`
- Used in all OAuth flows
- Public information (not a secret)

### Client Secret Creation

#### When You Need a Client Secret
- **Web applications** using authorization code flow
- **Server-to-server** applications (client credentials flow)
- **Not needed** for Single-Page Applications (use PKCE instead)
- **Not needed** for mobile/desktop apps using PKCE

#### Steps to Create Client Secret

1. In app registration, select **Certificates & secrets** (left menu)
2. Select **Client secrets** tab
3. Click **+ New client secret**
4. Configure secret:

**Description:**
- Enter a meaningful name/description
- Example: "Production API Secret" or "Dev Environment Key"

**Expires:**
- **3 months** (90 days)
- **6 months** (180 days)
- **12 months** (365 days)
- **24 months** (730 days)
- **Custom** (1-24 months)

**Best Practice:** Use shorter expiration periods (3-6 months) and rotate regularly

5. Click **Add** button

#### ⚠️ CRITICAL: Copy Secret Value Immediately

After creation:
1. The secret **Value** is displayed **ONLY ONCE**
2. **Copy the entire value immediately**
3. Store it securely (password manager, Azure Key Vault, environment variable)
4. The value will **never be shown again** after you navigate away
5. If lost, you must create a new secret

**Secret Format:** Long alphanumeric string (e.g., `abc123~DefGHI456.jklMNO789`)

#### Secret Management Best Practices

1. **Rotation:**
   - Rotate secrets before expiration
   - Create new secret before deleting old one
   - Allow overlap period for zero-downtime rotation

2. **Storage:**
   - Never commit secrets to source control
   - Use Azure Key Vault, AWS Secrets Manager, or similar
   - Use managed identities when possible

3. **Monitoring:**
   - Set up expiration alerts (Azure Monitor)
   - Track secret usage in application logs
   - Document which environments use which secrets

### Certificate-Based Authentication (Alternative to Secrets)

More secure alternative for production applications:

1. In **Certificates & secrets**, select **Certificates** tab
2. Click **Upload certificate**
3. Upload a public key certificate (.cer, .pem, .crt)
4. Use the private key to sign JWT assertions for authentication

**Benefits:**
- More secure than client secrets
- Can use longer expiration periods
- Supports hardware security modules (HSMs)
- Required for some high-security scenarios

---

## Redirect URL Requirements

### What is a Redirect URI?

The redirect URI (also called reply URL or callback URL) is where the authorization server sends the user after authentication, along with the authorization code or tokens.

### URI Requirements

#### Scheme Requirements
- **HTTPS required** for all non-localhost URIs
- **HTTP allowed** only for `http://localhost` and `http://127.0.0.1`
- Custom schemes allowed for mobile/desktop apps (e.g., `myapp://callback`)

#### Format Requirements
- Must be **absolute URIs** (include scheme, host, path)
- ✅ Correct: `https://myapp.com/auth/callback`
- ❌ Incorrect: `/auth/callback` (relative path)
- ❌ Incorrect: `myapp.com/auth/callback` (missing scheme)

#### Character Limits
- **Maximum 256 characters** per redirect URI
- **Maximum number:** Limited for security (typically dozens)

#### Exact Matching
- Azure performs **exact match** on redirect URIs
- Trailing slashes matter: `https://myapp.com/callback` ≠ `https://myapp.com/callback/`
- Query parameters matter: `https://myapp.com/callback` ≠ `https://myapp.com/callback?state=abc`

### Localhost Special Cases

For development and testing:

#### Port Flexibility
- Port numbers are **ignored** for localhost URIs
- Register: `http://localhost/callback`
- Can use any port: `http://localhost:3000/callback`, `http://localhost:8080/callback`

#### Localhost Aliases
Both work interchangeably:
- `http://localhost/callback`
- `http://127.0.0.1/callback`

### Query Parameters

#### Work/School Accounts Only
- Query parameters **allowed** for apps that sign in only work/school accounts
- Example: `https://myapp.com/callback?environment=prod`

#### Personal Microsoft Accounts
- Query parameters **NOT allowed** if app supports personal accounts
- Must use exact URI without query strings
- Pass state via the `state` parameter in OAuth flow instead

### Platform-Specific Requirements

#### Web Applications
```
https://myapp.com/auth/callback
https://myapp.com/.auth/login/aad/callback
```

#### Single-Page Applications (SPA)
```
https://myapp.com/callback
http://localhost:3000
```

#### Mobile and Desktop Applications
```
https://myapp.com/callback
http://localhost
myapp://callback
ms-app://s-1-15-2-1234567890-1234567890-1234567890-1234567890-1234567890-1234567890-1234567890
```

### Common Root Domain Requirement

⚠️ **Important:** All redirect URIs for a single app registration must share the same root domain.

- ✅ Allowed:
  - `https://myapp.com/callback`
  - `https://api.myapp.com/auth`
  - `https://auth.myapp.com/redirect`

- ❌ Not Allowed:
  - `https://myapp.com/callback`
  - `https://otherapp.com/callback`

**Workaround:** Create separate app registrations for different domains.

### Best Practices

1. **Use HTTPS:** Always use HTTPS in production
2. **Specific Paths:** Use specific callback paths, not root domains
3. **Path Segments:** Use paths like `/auth/callback` or `/signin-oidc`
4. **Environment Separation:** Use different redirect URIs for dev/staging/production
5. **State Parameter:** Use the `state` parameter for additional routing/context
6. **RFC Compliance:** Follow [RFC 6749 Section 3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)

### Adding/Updating Redirect URIs

#### Via Azure Portal
1. Navigate to app registration → **Authentication**
2. Select platform or click **Add a platform**
3. Enter redirect URI
4. Click **Configure** or **Save**

#### Via Microsoft Graph API
```http
PATCH https://graph.microsoft.com/v1.0/applications/{id}
{
  "web": {
    "redirectUris": ["https://myapp.com/callback"]
  }
}
```

---

## API Access Patterns

### Microsoft Graph API

#### Base URLs
- **Production (v1.0):** `https://graph.microsoft.com/v1.0/`
- **Preview (beta):** `https://graph.microsoft.com/beta/`

**Recommendation:** Use `v1.0` for production apps (stable APIs)

#### Authentication
```http
Authorization: Bearer {access_token}
```

#### Common Operations

**Get Current User:**
```http
GET https://graph.microsoft.com/v1.0/me
```

**Get User by ID:**
```http
GET https://graph.microsoft.com/v1.0/users/{id}
```

**List Users:**
```http
GET https://graph.microsoft.com/v1.0/users
```

**Get User's Mail:**
```http
GET https://graph.microsoft.com/v1.0/me/messages
```

**Send Mail:**
```http
POST https://graph.microsoft.com/v1.0/me/sendMail
```

**Get User's Calendar Events:**
```http
GET https://graph.microsoft.com/v1.0/me/events
```

**Get User's Files:**
```http
GET https://graph.microsoft.com/v1.0/me/drive/root/children
```

#### Request Methods
- **GET:** Retrieve resources
- **POST:** Create resources
- **PATCH:** Update resources (partial update)
- **PUT:** Replace resources (full update)
- **DELETE:** Remove resources

#### Pagination
```http
GET https://graph.microsoft.com/v1.0/users?$top=100&$skip=0
```

Response includes `@odata.nextLink` for next page:
```json
{
  "@odata.nextLink": "https://graph.microsoft.com/v1.0/users?$skip=100",
  "value": [...]
}
```

#### Filtering and Selection
```http
GET https://graph.microsoft.com/v1.0/users?$filter=startsWith(displayName,'John')&$select=displayName,mail
```

### Azure Resource Manager API

#### Base URL
```
https://management.azure.com/
```

#### Authentication
```http
Authorization: Bearer {access_token}
```

#### API Version
All ARM requests require `api-version` parameter:
```http
GET https://management.azure.com/subscriptions?api-version=2020-01-01
```

#### Common Operations

**List Subscriptions:**
```http
GET https://management.azure.com/subscriptions?api-version=2020-01-01
```

**List Resource Groups:**
```http
GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups?api-version=2021-04-01
```

**Get Resource:**
```http
GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}?api-version={api-version}
```

**Create/Update Resource:**
```http
PUT https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}?api-version={api-version}
```

**Delete Resource:**
```http
DELETE https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}?api-version={api-version}
```

#### Resource Provider Operations
```http
GET https://management.azure.com/providers?api-version=2021-04-01
```

### Azure Service-Specific APIs

Many Azure services have their own API endpoints:

**Azure DevOps:**
```
https://dev.azure.com/{organization}/_apis/
```

**Azure Storage (Blob):**
```
https://{account}.blob.core.windows.net/
```

**Azure Key Vault:**
```
https://{vault-name}.vault.azure.net/
```

**Azure Cosmos DB:**
```
https://{account}.documents.azure.com/
```

---

## Special Considerations

### Tenant ID Considerations

#### Finding Your Tenant ID

**Azure Portal:**
1. Navigate to Microsoft Entra ID
2. Select **Overview**
3. Copy **Tenant ID** (GUID format)

**Alternative Location:**
- Azure AD → **Properties** → **Directory ID**

**Via PowerShell:**
```powershell
Get-AzTenant
```

**Via Azure CLI:**
```bash
az account show --query tenantId -o tsv
```

#### Tenant vs. Common Authority

**Tenant-Specific (`/tenant-id/`):**
- Use for single-tenant apps
- Use for B2B apps with known tenant
- Faster authentication (no home realm discovery)
- More secure (explicit tenant validation)

**Common Authority (`/common/`):**
- Use for multi-tenant apps
- Accepts users from any Azure AD tenant
- Accepts personal Microsoft accounts (if configured)
- Requires home realm discovery (slower first login)

**Organizations Authority (`/organizations/`):**
- Multi-tenant but only work/school accounts
- Excludes personal Microsoft accounts

**Consumers Authority (`/consumers/`):**
- Personal Microsoft accounts only
- No work/school accounts

### Multi-Tenant Applications

#### Configuration Requirements

1. **App Registration:**
   - Set "Supported account types" to multi-tenant option
   - Configure redirect URIs for all environments

2. **Admin Consent:**
   - Admin consent required for each tenant
   - Use admin consent endpoint:
   ```
   https://login.microsoftonline.com/{tenant}/adminconsent
     ?client_id={client_id}
     &redirect_uri={redirect_uri}
   ```

3. **Tenant-Specific Tokens:**
   - Tokens are tenant-specific
   - Users from different tenants get different `tid` claims
   - Store tenant context with user records

4. **Cross-Tenant Access:**
   - Configure cross-tenant access settings in Azure AD
   - Set up trust relationships between tenants
   - Required for accessing resources in other tenants

#### Multi-Tenant Organization (MTO)

New feature for managing multiple Azure AD tenants:

**Features:**
- Shared user base across tenants
- Cross-tenant synchronization
- Unified identity management
- Simplified collaboration

**Requirements:**
- Microsoft Entra ID P1 license per user
- Minimum one license per tenant

**Configuration:**
```
Azure AD → Multi-tenant organizations → Add tenant
```

### Token Issuance Considerations

#### Token Types

**Access Tokens:**
- Short-lived (typically 1 hour)
- Used for API access
- Contains `aud` (audience) claim for specific resource
- Opaque for most scenarios (JWT for Microsoft Graph)

**ID Tokens:**
- Contains user identity claims
- Always JWT format
- Used for authentication, not API access
- Contains `nonce` claim if provided in request

**Refresh Tokens:**
- Long-lived (see Token Management section)
- Used to obtain new access tokens
- Rotates on each use
- More restricted for SPAs (24-hour lifetime)

#### Token Claims

**Standard OIDC Claims:**
- `sub` - Subject (unique user identifier)
- `oid` - Object ID (Azure AD user ID)
- `tid` - Tenant ID
- `iss` - Issuer (Microsoft)
- `aud` - Audience (your client ID or resource)
- `exp` - Expiration timestamp
- `iat` - Issued at timestamp
- `nbf` - Not before timestamp

**Azure-Specific Claims:**
- `upn` - User Principal Name
- `unique_name` - Unique name (email or UPN)
- `roles` - Application roles assigned to user
- `groups` - Group memberships (if configured)
- `wids` - Directory role IDs

### Permission Types and Consent

#### Delegated Permissions
- App acts on behalf of signed-in user
- User consent (or admin consent for high-privilege)
- Effective permissions = intersection of app permissions and user permissions

#### Application Permissions
- App acts as itself (no user context)
- Always requires admin consent
- Used for background services, daemons
- Effective permissions = all granted permissions

#### Consent Types

**User Consent:**
- User agrees to permissions during sign-in
- Allowed for low-privilege delegated permissions
- Can be disabled by admin policy

**Admin Consent:**
- Organization admin grants permission for all users
- Required for application permissions
- Required for high-privilege delegated permissions
- Bypasses user consent prompts

**Pre-Consent:**
- Admin grants consent before users sign in
- Configured in Azure Portal
- Removes consent prompts for users

#### Admin Consent URL
```
https://login.microsoftonline.com/{tenant}/adminconsent
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &state={state}
```

### Security Considerations

#### Application Security

1. **Validate Tokens:**
   - Verify signature using JWKS endpoint
   - Validate `aud` (audience) claim
   - Validate `iss` (issuer) claim
   - Check `exp` (expiration)
   - Validate `nonce` (if using implicit/hybrid flow)

2. **Secure Client Secrets:**
   - Never expose in client-side code
   - Use Azure Key Vault or similar
   - Rotate regularly
   - Use certificates for production

3. **Use PKCE:**
   - Required for SPAs and mobile apps
   - Recommended for all public clients
   - Protects against authorization code interception

4. **Validate Redirect URIs:**
   - Never use wildcard redirect URIs
   - Validate in application code
   - Use strict string matching

#### Network Security

1. **Always Use HTTPS:**
   - Production apps must use HTTPS
   - Tokens should never be transmitted over HTTP

2. **Secure Token Storage:**
   - SPAs: sessionStorage or memory only
   - Mobile: secure enclave/keychain
   - Server: encrypted at rest

3. **Token Binding:**
   - Consider implementing token binding
   - Ties tokens to TLS channel
   - Prevents token theft

### Rate Limiting

#### Microsoft Graph Rate Limits
- **Per-user limits:** Varies by endpoint
- **Per-app limits:** Varies by endpoint
- **Throttling response:** HTTP 429 with `Retry-After` header

**Best Practices:**
- Implement exponential backoff
- Cache responses when possible
- Use batch requests to reduce calls
- Monitor throttling in logs

#### Azure Resource Manager Rate Limits
- **Reads:** 12,000 per hour per subscription
- **Writes:** 1,200 per hour per subscription
- **Per-tenant limits:** Higher limits for read operations

**Best Practices:**
- Use resource graph for large queries
- Implement caching for read operations
- Batch operations when possible

---

## Token Management Best Practices

### Access Token Lifecycle

**Default Lifetime:**
- **1 hour** for most scenarios
- Cannot be extended beyond 24 hours
- Lifetime is not configurable (as of January 2021)

**Best Practices:**
1. Always request new tokens before expiration
2. Implement token refresh logic
3. Don't rely on specific token lifetimes (may change)
4. Handle token expiration gracefully (retry with refresh)

### Refresh Token Lifecycle

#### Lifetimes by Application Type

**Single-Page Applications (SPA):**
- **24 hours** (fixed, cannot be extended)
- New refresh token on every use
- Must perform interactive login after 24 hours
- PKCE required

**Web Apps, Mobile, Desktop:**
- **90 days** default
- Extends with each use (rolling expiration)
- Inactive for 90 days = expired
- Can be configured (with limitations)

**Application-Only (Client Credentials):**
- No refresh tokens
- Request new access tokens as needed

#### Refresh Token Best Practices

1. **Automatic Refresh:**
   ```typescript
   // Refresh proactively 5 minutes before expiration
   if (tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
     await refreshToken();
   }
   ```

2. **Handle Refresh Failures:**
   ```typescript
   try {
     await refreshToken();
   } catch (error) {
     if (error.error === 'invalid_grant') {
       // Refresh token expired or revoked
       await redirectToLogin();
     }
   }
   ```

3. **Use Latest Refresh Token:**
   - Refresh tokens rotate on each use
   - Old tokens may be rejected after rotation
   - Always store and use the newest token

4. **Request `offline_access` Scope:**
   - Required to receive refresh tokens
   - Include in initial authorization request
   - No additional user consent required

5. **Handle SPA Limitations:**
   ```typescript
   // For SPAs, prepare for 24-hour re-authentication
   if (app.type === 'SPA' && tokenAge > 23 * 60 * 60 * 1000) {
     // Warn user about upcoming re-authentication
     showReauthenticationWarning();
   }
   ```

### Token Storage

#### Client-Side (Browser)

**Single-Page Applications:**
- ✅ **sessionStorage:** Lost on tab close (more secure)
- ✅ **Memory only:** Lost on page reload (most secure)
- ⚠️ **localStorage:** Persists across sessions (XSS risk)
- ❌ **Cookies:** CSRF risk if not properly configured

**Best Practice for SPAs:**
```typescript
// Store in memory only
let accessToken = null;
let refreshToken = null;

// Or use sessionStorage for convenience
sessionStorage.setItem('access_token', accessToken);
```

#### Server-Side

**Web Applications:**
- ✅ **Encrypted session:** Server-side session with encrypted storage
- ✅ **Secure cookies:** HttpOnly, Secure, SameSite cookies
- ✅ **Database:** Encrypted at rest
- ❌ **Plain text files:** Security risk

**Best Practice:**
```typescript
// Encrypt tokens before storing
const encryptedToken = await encrypt(accessToken, encryptionKey);
await database.save('tokens', userId, encryptedToken);
```

#### Mobile Applications

**iOS:**
- ✅ **Keychain:** Use iOS Keychain Services
- ❌ **UserDefaults:** Not secure for sensitive data

**Android:**
- ✅ **Android Keystore:** Use Android Keystore System
- ❌ **SharedPreferences:** Not secure for sensitive data

### Token Refresh Patterns

#### Proactive Refresh (Recommended)
```typescript
async function ensureValidToken() {
  const expiresIn = tokenExpiresAt - Date.now();

  if (expiresIn < 5 * 60 * 1000) { // Refresh 5 min before expiration
    await refreshAccessToken();
  }

  return accessToken;
}

// Use before API calls
const token = await ensureValidToken();
await callAPI(token);
```

#### Reactive Refresh
```typescript
async function callAPIWithRetry(url) {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    if (error.status === 401) { // Unauthorized
      await refreshAccessToken();
      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }
    throw error;
  }
}
```

#### Background Refresh (Web Apps)
```typescript
// Set up automatic background refresh
setInterval(async () => {
  const expiresIn = tokenExpiresAt - Date.now();
  if (expiresIn < 10 * 60 * 1000) { // 10 minutes before expiration
    try {
      await refreshAccessToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Optionally notify user to re-authenticate
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

### Token Revocation

#### When Tokens Are Revoked

- User changes password
- User revokes consent
- Admin revokes app access
- User signs out (if configured)
- Security policy violation

#### Handling Revocation

```typescript
try {
  await refreshAccessToken();
} catch (error) {
  if (error.error === 'invalid_grant') {
    // Token revoked - clear local tokens and redirect to login
    clearStoredTokens();
    window.location.href = '/login';
  }
}
```

### Logout Best Practices

#### Single Logout
```typescript
// Clear local tokens
clearStoredTokens();

// Redirect to Azure logout endpoint
const logoutUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout` +
  `?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
window.location.href = logoutUrl;
```

#### Front-Channel Logout
Configure in Azure Portal:
1. App Registration → Authentication
2. Add **Front-channel logout URL**
3. Azure will call this URL when user signs out elsewhere

---

## Quick Reference

### Essential Endpoints

| Purpose | Endpoint |
|---------|----------|
| Authorization | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` |
| Token | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| UserInfo | `https://graph.microsoft.com/oidc/userinfo` |
| Logout | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout` |
| JWKS | `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys` |
| OpenID Config | `https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration` |

### Common Scopes

| Scope | Description |
|-------|-------------|
| `openid` | OIDC authentication (required) |
| `profile` | User profile information |
| `email` | User email address |
| `offline_access` | Refresh tokens |
| `User.Read` | Read signed-in user profile |
| `Mail.Read` | Read user's mail |
| `Calendars.Read` | Read user's calendar |
| `Files.Read` | Read user's files |
| `https://management.azure.com/user_impersonation` | Azure Resource Manager access |

### Authorization Code Flow Example

#### Step 1: Authorization Request
```
GET https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
  ?client_id={client_id}
  &response_type=code
  &redirect_uri={redirect_uri}
  &response_mode=query
  &scope=openid%20profile%20email%20User.Read
  &state={state}
  &code_challenge={code_challenge}
  &code_challenge_method=S256
```

#### Step 2: Token Request
```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id={client_id}
&client_secret={client_secret}
&code={authorization_code}
&redirect_uri={redirect_uri}
&code_verifier={code_verifier}
```

#### Step 3: Token Response
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email User.Read",
  "refresh_token": "0.AXEAknmR2u06bkObtFRLqY_Mg...",
  "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

#### Step 4: Refresh Token Request
```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id={client_id}
&client_secret={client_secret}
&refresh_token={refresh_token}
&scope=openid%20profile%20email%20User.Read
```

### Client Credentials Flow Example

#### Token Request (Application-Only)
```http
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={client_id}
&client_secret={client_secret}
&scope=https://graph.microsoft.com/.default
```

#### Token Response
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### API Call Examples

#### Microsoft Graph - Get Current User
```http
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer {access_token}
```

#### Microsoft Graph - Send Email
```http
POST https://graph.microsoft.com/v1.0/me/sendMail
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "message": {
    "subject": "Hello from Microsoft Graph",
    "body": {
      "contentType": "Text",
      "content": "This is a test email."
    },
    "toRecipients": [
      {
        "emailAddress": {
          "address": "user@example.com"
        }
      }
    ]
  }
}
```

#### Azure Resource Manager - List Subscriptions
```http
GET https://management.azure.com/subscriptions?api-version=2020-01-01
Authorization: Bearer {access_token}
```

### Error Response Examples

#### Invalid Client
```json
{
  "error": "invalid_client",
  "error_description": "AADSTS7000215: Invalid client secret provided.",
  "error_codes": [7000215],
  "timestamp": "2025-10-04 12:00:00Z",
  "trace_id": "abc123...",
  "correlation_id": "def456..."
}
```

#### Invalid Grant (Expired/Revoked Token)
```json
{
  "error": "invalid_grant",
  "error_description": "AADSTS50173: The provided grant has expired due to it being revoked.",
  "error_codes": [50173]
}
```

#### Insufficient Permissions
```json
{
  "error": {
    "code": "Authorization_RequestDenied",
    "message": "Insufficient privileges to complete the operation."
  }
}
```

---

## Additional Resources

### Official Documentation
- [Microsoft identity platform documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [OAuth 2.0 and OpenID Connect protocols](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols)
- [Microsoft Graph API reference](https://learn.microsoft.com/en-us/graph/api/overview)
- [Azure Resource Manager REST API](https://learn.microsoft.com/en-us/rest/api/azure/)

### Tools and SDKs
- [Microsoft Authentication Library (MSAL)](https://learn.microsoft.com/en-us/entra/msal/overview)
- [Microsoft Graph SDKs](https://learn.microsoft.com/en-us/graph/sdks/sdks-overview)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/)
- [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)

### Support
- [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/)
- [Stack Overflow - azure-active-directory tag](https://stackoverflow.com/questions/tagged/azure-active-directory)
- [Azure Support](https://azure.microsoft.com/en-us/support/)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-04
**Author:** Claude Code (AI Research Assistant)
