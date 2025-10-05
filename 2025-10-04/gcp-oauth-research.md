# Google Cloud Platform OAuth 2.0 Integration Research

**Date:** 2025-10-04
**Purpose:** Comprehensive research on GCP OAuth 2.0 setup, endpoints, and best practices

---

## Table of Contents

1. [OAuth 2.0 Endpoints](#oauth-20-endpoints)
2. [Required Scopes](#required-scopes)
3. [Creating OAuth Credentials](#creating-oauth-credentials)
4. [Redirect URL Requirements](#redirect-url-requirements)
5. [Service Accounts vs User OAuth](#service-accounts-vs-user-oauth)
6. [API Access Patterns](#api-access-patterns)
7. [Security Considerations](#security-considerations)
8. [Special Considerations](#special-considerations)

---

## OAuth 2.0 Endpoints

### Discovery Document

Google exposes a complete OpenID Connect discovery document at:
```
https://accounts.google.com/.well-known/openid-configuration
```

### Primary Endpoints

| Endpoint | URL | Purpose |
|----------|-----|---------|
| **Issuer** | `https://accounts.google.com` | OAuth provider identifier |
| **Authorization** | `https://accounts.google.com/o/oauth2/v2/auth` | User authorization (HTTPS only) |
| **Token** | `https://oauth2.googleapis.com/token` | Exchange code for tokens |
| **User Info (v3)** | `https://openidconnect.googleapis.com/v1/userinfo` | Get user profile (recommended) |
| **User Info (v2)** | `https://www.googleapis.com/oauth2/v2/userinfo` | Get user profile (deprecated) |
| **User Info (v1)** | `https://www.googleapis.com/oauth2/v1/userinfo` | Get user profile (legacy) |
| **Revocation** | `https://oauth2.googleapis.com/revoke` | Revoke access/refresh tokens |
| **Device Authorization** | `https://oauth2.googleapis.com/device/code` | Device flow authorization |
| **JWKS** | `https://www.googleapis.com/oauth2/v3/certs` | Public keys for token verification |

### Supported OAuth 2.0 Features

**Grant Types:**
- `authorization_code` - Standard OAuth flow
- `refresh_token` - Token refresh
- `device_code` - Device authorization flow
- `urn:ietf:params:oauth:grant-type:jwt-bearer` - JWT bearer tokens

**Response Types:**
- `code` - Authorization code
- `token` - Access token (implicit flow)
- `id_token` - OpenID Connect ID token
- Combinations: `code token`, `code id_token`, `token id_token`, `code token id_token`

**Response Modes:**
- `query` - Parameters in query string
- `fragment` - Parameters in URL fragment
- `form_post` - Parameters via POST

**Token Endpoint Auth Methods:**
- `client_secret_post` - Secret in POST body
- `client_secret_basic` - Secret in Authorization header (Basic auth)

**Code Challenge Methods (PKCE):**
- `plain` - Plain text code verifier
- `S256` - SHA-256 hashed code verifier (recommended)

**ID Token Signing:**
- `RS256` - RSA with SHA-256

---

## Required Scopes

### OpenID Connect Scopes

Basic user authentication scopes:

```
openid                          # Required for OpenID Connect
email                           # User's email address
profile                         # User's basic profile info
```

Full scope URLs:
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### GCP API Scopes

#### Cloud Platform (Broad Access)
```
https://www.googleapis.com/auth/cloud-platform
```
View and manage data across all Google Cloud Platform services.

#### Compute Engine
```
https://www.googleapis.com/auth/compute           # Full access
https://www.googleapis.com/auth/compute.readonly  # Read-only
```

#### Cloud Storage
```
https://www.googleapis.com/auth/devstorage.full_control    # Full control
https://www.googleapis.com/auth/devstorage.read_write      # Read/write
https://www.googleapis.com/auth/devstorage.read_only       # Read-only
```

#### BigQuery
```
https://www.googleapis.com/auth/bigquery                  # Full access
https://www.googleapis.com/auth/bigquery.readonly         # Read-only
https://www.googleapis.com/auth/bigquery.insertdata       # Insert data
```

#### Cloud SQL
```
https://www.googleapis.com/auth/sqlservice.admin          # Full admin
```

#### Other Common Scopes
```
https://www.googleapis.com/auth/drive                     # Google Drive
https://www.googleapis.com/auth/calendar                  # Google Calendar
https://www.googleapis.com/auth/gmail.readonly            # Gmail read-only
```

### Scope Categories

**Sensitive Scopes:** Require user consent and may trigger OAuth verification
**Restricted Scopes:** Require additional verification before production use

Complete scope list: https://developers.google.com/identity/protocols/oauth2/scopes

---

## Creating OAuth Credentials

### Step-by-Step Setup Process

#### 1. Create/Select Google Cloud Project

1. Log in to [Google Cloud Console](https://console.cloud.google.com)
2. Click project dropdown in top navigation
3. Select **New Project** or choose existing project
4. Enter **Project Name** and select **Location**
5. Click **Create**

#### 2. Enable Required APIs

1. Navigate to **APIs & Services > Library**
2. Search for APIs you need (e.g., "Compute Engine API", "Cloud Storage")
3. Click on each API and click **Enable**

#### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select user type:
   - **Internal** - Only for Google Workspace organizations (users within your domain)
   - **External** - For any Google account users
3. Click **Create**

**Required Information:**
- **App name** - Your application's public name
- **User support email** - Email users can contact for support
- **App logo** (optional) - 120x120 pixels
- **Authorized domains** - Domains that can use OAuth (e.g., `example.com`)
- **Developer contact information** - Email for Google to contact you

4. Click **Save and Continue**
5. Add scopes (click **Add or Remove Scopes**)
6. Select required scopes from the list
7. Click **Update** then **Save and Continue**
8. Add test users (if External + Testing mode)
9. Review summary and click **Back to Dashboard**

#### 4. Create OAuth Client ID

1. Navigate to **APIs & Services > Credentials**
2. Click **+ Create Credentials**
3. Select **OAuth client ID**
4. Choose **Application type**:
   - **Web application** - Server-side web apps
   - **Android** - Android mobile apps
   - **iOS** - iOS mobile apps
   - **Chrome Extension** - Chrome browser extensions
   - **Desktop app** - Native desktop applications
   - **TV and Limited Input devices** - Smart TVs, game consoles

5. Enter **Name** for the OAuth client (for your reference)

**For Web Applications:**

6. **Authorized JavaScript origins** (optional, for client-side requests):
   - Click **Add URI**
   - Enter origins (e.g., `https://example.com`, `http://localhost:3000`)
   - Must use HTTPS (except localhost)
   - Format: `scheme://domain:port` (no path, no trailing slash)

7. **Authorized redirect URIs** (required):
   - Click **Add URI**
   - Enter callback URLs (e.g., `https://example.com/auth/callback`)
   - Must use HTTPS (except localhost)
   - Must match exactly in authorization requests

8. Click **Create**

#### 5. Download Credentials

After creation, a dialog appears showing:
- **Client ID** - Public identifier (e.g., `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret** - Private key (only shown once!)

**CRITICAL:**
- Download the JSON file immediately
- Store client secret securely (e.g., Google Cloud Secret Manager)
- Never commit to version control
- Never expose in client-side code

**JSON Structure:**
```json
{
  "web": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["https://example.com/auth/callback"],
    "javascript_origins": ["https://example.com"]
  }
}
```

#### 6. Managing Existing Credentials

To view or edit:
1. Go to **APIs & Services > Credentials**
2. Find your OAuth 2.0 Client ID under **OAuth 2.0 Client IDs**
3. Click the pencil icon to edit
4. Click the name to view details

**Note:** Client secret only shows last 4 characters after initial creation. If lost, you must create a new secret.

---

## Redirect URL Requirements

### General Rules

1. **HTTPS Required** - All redirect URIs must use HTTPS
   - **Exception:** localhost URIs (for development only)
   - Valid: `http://localhost:3000/callback`, `http://127.0.0.1:8080/auth`

2. **Exact Match** - The `redirect_uri` parameter in authorization requests must exactly match a registered URI
   - Path, query parameters, and fragments must match
   - No wildcard matching

3. **No Private IPs** - Cannot use private network IP addresses (except localhost)
   - Invalid: `http://192.168.1.100/callback`

4. **Format Requirements:**
   - Must include scheme (http/https)
   - Can include port number
   - Can include path
   - Cannot include wildcards
   - Cannot include fragments (#)

### Examples

**Valid Redirect URIs:**
```
https://example.com/auth/callback
https://example.com:8443/oauth2/callback
https://subdomain.example.com/auth
http://localhost:3000/callback
http://127.0.0.1:8080/auth/google
```

**Invalid Redirect URIs:**
```
http://example.com/callback           # Not HTTPS (unless localhost)
https://example.com/*                  # Wildcards not allowed
https://example.com                    # Must include path for consistency
https://example.com/callback#fragment  # Cannot include fragment
http://192.168.1.100/callback          # Private IP (not localhost)
```

### Localhost Development

For local development:
- Use `http://localhost:PORT` or `http://127.0.0.1:PORT`
- Register exact port number in redirect URI
- Can use different ports for different environments

### Multiple Redirect URIs

You can register multiple redirect URIs for one OAuth client:
- Different environments (dev, staging, production)
- Different callback paths
- Different subdomains

**Best Practice:** Use separate OAuth clients for different environments

---

## Service Accounts vs User OAuth

### When to Use Service Accounts

**Use Cases:**
1. **Server-to-server communication** - Backend services accessing GCP APIs
2. **Automated processes** - Cron jobs, scheduled tasks, CI/CD pipelines
3. **Long-term access** - No user interaction, no consent required
4. **Project-based resources** - Accessing GCP resources owned by your project
5. **Machine-to-machine** - API gateways, data pipelines, monitoring

**Characteristics:**
- No user consent required
- No refresh token rotation
- Belongs to application, not user
- Configured via IAM roles
- Uses JSON key files or workload identity
- No 7-day token expiration (for external apps)

**Authentication Methods:**
1. **JSON Key File** - Download private key, use in application
2. **Workload Identity** - Federated identity from external providers (recommended)
3. **Metadata Service** - Automatic on GCP compute resources (GCE, GKE, Cloud Run)

**Security Considerations:**
- Service account keys are security risks if not managed properly
- Prefer workload identity or metadata service over key files
- Rotate keys regularly if using JSON key files
- Use least privilege (minimal IAM roles)
- Never commit service account keys to version control

**Example Use Case:**
```
Application → Service Account → Cloud Storage API
             (JSON key or         (upload backup files)
              workload identity)
```

### When to Use User OAuth

**Use Cases:**
1. **User-owned resources** - Accessing user's Google Drive, Calendar, Gmail
2. **User consent required** - Accessing data on behalf of end users
3. **Multi-user applications** - SaaS apps with individual user accounts
4. **Audit trails** - Track which user performed which action
5. **User-specific permissions** - Enforce user-level access controls

**Characteristics:**
- Requires user consent via OAuth flow
- User can revoke access anytime
- Refresh tokens may expire (7 days for external/testing apps)
- Access tokens expire in 1 hour
- 100 refresh token limit per client per user
- User sees consent screen with requested scopes

**OAuth Flow Types:**
1. **Authorization Code** - Server-side web apps (recommended)
2. **Authorization Code + PKCE** - Mobile and desktop apps (recommended)
3. **Implicit Flow** - Client-side web apps (deprecated, use Authorization Code + PKCE)
4. **Device Flow** - Limited input devices (smart TVs, IoT)

**Example Use Case:**
```
User → OAuth Consent → Application → User's Google Drive API
       (authorize app)   (access token)  (read user's files)
```

### Comparison Table

| Feature | Service Account | User OAuth |
|---------|----------------|------------|
| User consent | No | Yes |
| User interaction | None | Required for initial auth |
| Access duration | Long-term | Token-based (1 hour access, refresh varies) |
| Use case | Server-to-server | User-to-server |
| Resources accessed | Project resources | User resources |
| Authentication | JSON key / Workload identity | OAuth 2.0 flow |
| Revocation | Via IAM console | User can revoke anytime |
| Audit trail | Service account identity | Individual user identity |
| Token limits | No refresh token limits | 100 refresh tokens per user per client |
| Security risk | High (if key leaked) | Medium (user can revoke) |

### Hybrid Approach

Some applications use both:
- **Service Account** for backend operations (database, storage, compute)
- **User OAuth** for user-specific operations (accessing user's Gmail, Drive)

---

## API Access Patterns

### 1. REST API Access

**Standard HTTP requests with OAuth 2.0 bearer tokens**

**Request Format:**
```http
GET https://compute.googleapis.com/compute/v1/projects/PROJECT_ID/zones
Authorization: Bearer ACCESS_TOKEN
```

**Using cURL:**
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  https://compute.googleapis.com/compute/v1/projects/PROJECT_ID/zones
```

**Characteristics:**
- JSON over HTTPS
- Standard HTTP methods (GET, POST, PUT, DELETE)
- RESTful resource-based URLs
- OAuth 2.0 bearer token in `Authorization` header
- Slower than gRPC but more universal

### 2. gRPC API Access

**High-performance RPC using Protocol Buffers**

**Advantages:**
- 10x throughput improvement over REST
- Lower CPU usage
- Smaller payload size (binary Protocol Buffers)
- HTTP/2 multiplexing and streaming
- Strongly-typed schema

**Authentication:**
```python
# Python example
import grpc
from google.oauth2 import service_account

# Load credentials
credentials = service_account.Credentials.from_service_account_file(
    'service-account-key.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform']
)

# Create gRPC channel with credentials
channel = grpc.secure_channel(
    'compute.googleapis.com',
    grpc.composite_channel_credentials(
        grpc.ssl_channel_credentials(),
        grpc.access_token_call_credentials(credentials.token)
    )
)
```

**Metadata for OAuth:**
```
Key: authorization
Value: Bearer <JWT_TOKEN>
```

### 3. Client Libraries

**Official Google Cloud Client Libraries** (recommended)

**Advantages:**
- Handle authentication automatically
- Discover credentials from environment
- Implement retries and error handling
- Support both REST and gRPC backends
- Type-safe and idiomatic code

**Credential Discovery Order:**
1. **Application Default Credentials (ADC):**
   - Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   - Check `gcloud auth application-default login` credentials
   - Check GCE/GKE/Cloud Run metadata service
   - Check Cloud Shell credentials

**Example (Node.js):**
```javascript
const {Storage} = require('@google-cloud/storage');

// Automatically discovers credentials
const storage = new Storage();

async function listBuckets() {
  const [buckets] = await storage.getBuckets();
  buckets.forEach(bucket => console.log(bucket.name));
}
```

**Example (Python):**
```python
from google.cloud import storage

# Automatically discovers credentials
client = storage.Client()

# List buckets
buckets = list(client.list_buckets())
```

**Explicit Credentials:**
```javascript
const storage = new Storage({
  projectId: 'your-project-id',
  keyFilename: '/path/to/service-account-key.json'
});
```

### 4. Application Default Credentials (ADC)

**Recommended authentication strategy**

**Setup for Development:**
```bash
# Login as user
gcloud auth application-default login

# Or set service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

**Setup for Production:**
- **GCE/GKE/Cloud Run** - Automatic via metadata service
- **Other platforms** - Use Workload Identity Federation or service account key

**Credential Discovery Flow:**
```
1. GOOGLE_APPLICATION_CREDENTIALS env var
   ↓ (not found)
2. gcloud ADC credentials (~/.config/gcloud/application_default_credentials.json)
   ↓ (not found)
3. GCE/GKE/Cloud Run metadata service
   ↓ (not found)
4. Error: Could not automatically determine credentials
```

### 5. API Keys (Limited Use)

**For public, non-sensitive APIs only**

**Usage:**
```http
GET https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway&key=YOUR_API_KEY
```

**Not recommended for:**
- Accessing private user data
- GCP resource management
- APIs requiring user context

**Recommended for:**
- Maps API
- Translation API
- YouTube Data API (public videos)

---

## Security Considerations

### 1. Token Management

**Access Token Expiration:**
- Default: 1 hour (3600 seconds)
- Cannot be extended
- Use refresh tokens to obtain new access tokens

**Refresh Token Expiration:**
- **External apps (Testing):** 7 days
- **External apps (Production):** No expiration (until revoked)
- **Internal apps:** No expiration (until revoked)
- **Exception:** If only requesting `email`, `profile`, `openid` scopes, no expiration

**Token Limits:**
- 100 refresh tokens per user per OAuth client
- Oldest tokens automatically revoked when limit exceeded
- Plan for token rotation

**Best Practices:**
- Store tokens securely (encrypted database, secret manager)
- Implement token refresh before expiration
- Handle token revocation gracefully
- Don't expose tokens in URLs or logs

### 2. PKCE (Proof Key for Code Exchange)

**Strongly recommended for:**
- Mobile apps
- Desktop apps
- Single-page applications (SPAs)
- Any public client (cannot secure client secret)

**How it works:**
1. Client generates random `code_verifier` (43-128 characters)
2. Client creates `code_challenge` = BASE64URL(SHA256(code_verifier))
3. Client sends `code_challenge` and `code_challenge_method=S256` in auth request
4. Authorization server stores challenge
5. Client sends `code_verifier` when exchanging code for token
6. Server verifies: SHA256(code_verifier) == stored code_challenge

**Benefits:**
- Prevents authorization code interception attacks
- Protects against malicious apps with same redirect URI
- No client secret needed

**Implementation:**
```javascript
// Generate code verifier
const codeVerifier = base64URLEncode(crypto.randomBytes(32));

// Generate code challenge
const codeChallenge = base64URLEncode(
  crypto.createHash('sha256').update(codeVerifier).digest()
);

// Authorization request
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}` +
  `&redirect_uri=${redirectUri}` +
  `&response_type=code` +
  `&scope=openid email profile` +
  `&code_challenge=${codeChallenge}` +
  `&code_challenge_method=S256`;

// Token request (later)
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: JSON.stringify({
    code: authorizationCode,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier  // Send original verifier
  })
});
```

**Google PKCE Quirk:**
- Web applications still require `client_secret` even with PKCE
- This differs from standard OAuth 2.0 PKCE spec
- Mobile/desktop apps should use PKCE without client secret

### 3. Client Secret Security

**Storage:**
- ❌ Never in client-side JavaScript
- ❌ Never in mobile/desktop app binaries
- ❌ Never in version control (Git)
- ✅ Server-side environment variables
- ✅ Google Cloud Secret Manager
- ✅ HashiCorp Vault or similar

**Visibility:**
- Only visible once at creation in Google Cloud Console
- After creation, only last 4 characters shown
- If lost, must create new secret

**Rotation:**
- Can have multiple secrets active simultaneously
- Create new secret, update applications, then delete old secret
- Rotate regularly (e.g., every 90 days)

### 4. Scope Minimization

**Principle of Least Privilege:**
- Only request scopes your application needs
- Use read-only scopes when possible
- Avoid broad scopes like `cloud-platform` unless necessary

**User Trust:**
- Fewer scopes = less scary consent screen
- Users more likely to approve reasonable requests
- Some scopes trigger Google OAuth verification process

**Verification Requirements:**
- **Sensitive scopes** - May require verification
- **Restricted scopes** - Require verification for production
- Verification process can take weeks

### 5. State Parameter

**CSRF Protection:**
```javascript
// Generate random state
const state = base64URLEncode(crypto.randomBytes(32));

// Store in session
session.oauthState = state;

// Include in authorization request
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}` +
  `&redirect_uri=${redirectUri}` +
  `&response_type=code` +
  `&scope=openid email` +
  `&state=${state}`;

// Verify on callback
if (req.query.state !== session.oauthState) {
  throw new Error('Invalid state parameter - possible CSRF attack');
}
```

### 6. Redirect URI Validation

**Strict Matching:**
- Google validates redirect URI exactly
- No wildcard matching
- Register all variations needed

**Common Pitfalls:**
- Trailing slash mismatch: `https://example.com/callback` vs `https://example.com/callback/`
- Protocol mismatch: `http` vs `https`
- Port number mismatch: `https://example.com` vs `https://example.com:443`
- Subdomain mismatch: `example.com` vs `www.example.com`

### 7. Token Validation

**ID Token Verification:**
```javascript
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

async function verifyIdToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();

  // Verify issuer
  if (payload.iss !== 'https://accounts.google.com') {
    throw new Error('Invalid issuer');
  }

  // Verify expiration
  if (payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  return payload;
}
```

**Access Token Validation:**
- Call tokeninfo endpoint: `https://oauth2.googleapis.com/tokeninfo?access_token=TOKEN`
- Returns token metadata (scope, expiration, audience)
- Use for debugging, not production (rate limited)

### 8. Consent Screen Security

**Phishing Prevention:**
- Users should verify consent screen shows your app name
- Check URL is `accounts.google.com`
- OAuth app verification displays badge on consent screen

**Unverified App Warning:**
- External apps in testing show "unverified" warning
- Complete OAuth verification to remove warning
- Verification required for production apps with sensitive scopes

---

## Special Considerations

### 1. OAuth Consent Screen Types

**Internal vs External:**

| Feature | Internal | External |
|---------|----------|----------|
| **Availability** | Google Workspace orgs only | Any Google account |
| **User restriction** | Same Workspace domain only | Anyone with Google account |
| **Verification** | Not required | Required for production |
| **Token expiration** | No 7-day limit | 7 days in testing mode |
| **Setup requirement** | Must create from Workspace domain | Can create from any account |
| **Consent screen** | Simplified (org users) | Full consent flow |
| **Scopes** | No restrictions | Sensitive/restricted need verification |

**Publishing Status (External only):**
- **Testing** - Up to 100 test users, 7-day token expiration (unless only email/profile/openid)
- **Production** - Unlimited users, requires verification for sensitive scopes, no token expiration

### 2. Offline Access

**Request offline access to get refresh token:**

```javascript
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}` +
  `&redirect_uri=${redirectUri}` +
  `&response_type=code` +
  `&scope=openid email profile` +
  `&access_type=offline` +        // Required for refresh token
  `&prompt=consent`;              // Force consent to get new refresh token
```

**Key Parameters:**
- `access_type=offline` - Request refresh token
- `prompt=consent` - Force re-consent (gets new refresh token even if user previously authorized)

**Refresh Token Behavior:**
- Only returned on first authorization (unless `prompt=consent`)
- Store securely in database
- Use to get new access tokens without user interaction
- Can expire or be revoked

**Refreshing Access Token:**
```javascript
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })
});

const {access_token, expires_in} = await response.json();
// Note: refresh_token NOT returned (keep using existing one)
```

### 3. Incremental Authorization

**Request additional scopes later:**

```javascript
// Initial authorization - minimal scopes
const initialAuthUrl = buildAuthUrl(['openid', 'email']);

// Later - request additional scope
const additionalAuthUrl = buildAuthUrl([
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file'  // New scope
]);
```

**Benefits:**
- Better user experience (don't overwhelm with scopes upfront)
- Request scopes when actually needed
- Reduces abandonment during onboarding

**Implementation:**
- Include `include_granted_scopes=true` parameter
- Google merges old and new authorizations
- User only consents to new scopes

### 4. Google OAuth Verification Process

**When verification is required:**
- External apps in production
- Apps requesting sensitive or restricted scopes
- Apps with >100 test users (must move to production)

**Verification Requirements:**
- Detailed app description
- Privacy policy URL (required)
- Terms of service URL (required)
- App homepage URL
- Authorized domains must be verified (Google Search Console)
- Justification for each sensitive/restricted scope
- Video demonstration of app using scopes
- Security assessment (for restricted scopes)

**Process Timeline:**
- Typically 4-6 weeks for standard verification
- Longer for restricted scopes (security review)
- Can be rejected if insufficient justification

**Avoiding Verification:**
- Use internal OAuth consent screen (Workspace orgs only)
- Only use non-sensitive scopes
- Keep app in testing mode (max 100 users)

### 5. Rate Limits and Quotas

**OAuth Token Endpoints:**
- Token refresh: 10,000 requests/day (per project)
- UserInfo: 100,000 requests/day (per project)
- TokenInfo: Limited (use sparingly, for debugging only)

**Token Limits:**
- 100 refresh tokens per user per OAuth client
- Oldest tokens revoked when exceeded
- Access tokens: No hard limit, but rate limits apply

**Best Practices:**
- Cache access tokens until near expiration (don't refresh unnecessarily)
- Implement exponential backoff on errors
- Monitor quota usage in Cloud Console

### 6. Workload Identity Federation

**Modern alternative to service account keys:**

**Benefits:**
- No long-lived credentials to manage
- No JSON key files to secure
- Federated identity from external providers
- Short-lived access tokens

**Supported Identity Providers:**
- AWS
- Azure Active Directory
- OIDC providers (GitHub Actions, GitLab CI, etc.)
- SAML 2.0 providers

**Use Case Example - GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v1
  with:
    workload_identity_provider: 'projects/PROJECT_ID/locations/global/workloadIdentityPools/github/providers/github-provider'
    service_account: 'github-actions@PROJECT_ID.iam.gserviceaccount.com'

- name: Deploy to Cloud Run
  run: gcloud run deploy my-service --image gcr.io/PROJECT_ID/image
```

**Security Advantages:**
- No service account keys in GitHub secrets
- Automatic key rotation
- Scoped to specific repositories/branches
- Audit logs for all access

### 7. Domain-Wide Delegation (Workspace Admin)

**For accessing user data across Workspace domain:**

**Requirements:**
- Google Workspace organization
- Super Admin access
- Service account with domain-wide delegation enabled

**Setup:**
1. Create service account
2. Enable domain-wide delegation in Cloud Console
3. Grant service account access in Workspace Admin Console
4. Specify OAuth scopes

**Use Case:**
- Admin tools that access multiple users' data
- Backup/migration tools
- Compliance auditing tools

**Security Risks:**
- Very privileged access
- Can impersonate any user in organization
- Should be heavily restricted and monitored

### 8. Testing and Development

**Test Users (External Apps in Testing):**
- Add up to 100 test users
- Test users can authorize app during testing phase
- No verification required for test users
- Add via OAuth consent screen configuration

**Localhost Development:**
- Use `http://localhost` or `http://127.0.0.1` redirect URIs
- Can use any port
- Register exact port in Cloud Console
- Production should use separate OAuth client

**OAuth Playground:**
- Google's OAuth 2.0 Playground: https://developers.google.com/oauthplayground
- Test OAuth flows interactively
- See all scopes for each API
- Generate sample requests
- Useful for debugging

### 9. Migration and Versioning

**Multiple OAuth Clients:**
- Create separate clients for dev/staging/production
- Different redirect URIs for each environment
- Separate quota tracking
- Easier security incident response (revoke specific client)

**Credential Rotation:**
- Can have multiple client secrets active
- Create new secret, deploy to apps, delete old secret
- Zero downtime rotation

**API Version Migration:**
- OAuth endpoints are versioned (`/v2/auth`, `/oauth2/v3/userinfo`)
- v2 endpoints maintained for backward compatibility
- New features only in latest versions
- Discovery document always current

### 10. Compliance and Privacy

**GDPR Considerations:**
- OAuth access constitutes data processing
- Need privacy policy and terms of service
- Users can revoke access anytime
- Must delete user data on request

**OAuth Token as PII:**
- Access tokens and refresh tokens are personal data
- Encrypt at rest
- Secure transmission (HTTPS)
- Audit access logs

**Data Retention:**
- Document how long you store OAuth tokens
- Implement token cleanup for inactive users
- Revoke tokens server-side when user deletes account

**Third-Party Access:**
- Users can view apps with access: https://myaccount.google.com/permissions
- Users can revoke access anytime
- App must handle revoked tokens gracefully

---

## Complete Example: Web Application OAuth Flow

### Authorization Request

```javascript
const crypto = require('crypto');

function generateAuthUrl(clientId, redirectUri, state, codeVerifier) {
  const codeChallenge = base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/cloud-platform',
    access_type: 'offline',           // Get refresh token
    prompt: 'consent',                 // Force consent
    state: state,                      // CSRF protection
    code_challenge: codeChallenge,    // PKCE
    code_challenge_method: 'S256'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

### Token Exchange

```javascript
async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    })
  });

  const tokens = await response.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,  // Store securely!
    expires_in: tokens.expires_in,        // 3600 seconds
    id_token: tokens.id_token,            // JWT with user info
    scope: tokens.scope                   // Granted scopes
  };
}
```

### Get User Info

```javascript
async function getUserInfo(accessToken) {
  const response = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const userInfo = await response.json();

  return {
    sub: userInfo.sub,              // Unique user ID
    email: userInfo.email,
    email_verified: userInfo.email_verified,
    name: userInfo.name,
    picture: userInfo.picture,
    given_name: userInfo.given_name,
    family_name: userInfo.family_name,
    locale: userInfo.locale
  };
}
```

### Refresh Access Token

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const tokens = await response.json();

  return {
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope
    // Note: refresh_token NOT returned - keep using existing one
  };
}
```

### Revoke Token

```javascript
async function revokeToken(token) {
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `token=${token}`
  });

  return response.ok;
}
```

---

## Quick Reference Checklist

### Initial Setup
- [ ] Create Google Cloud project
- [ ] Enable required APIs
- [ ] Configure OAuth consent screen (internal/external)
- [ ] Add test users (if external testing)
- [ ] Create OAuth client ID
- [ ] Download and secure client credentials
- [ ] Register redirect URIs

### Security Implementation
- [ ] Store client secret securely (never in code)
- [ ] Implement PKCE for public clients
- [ ] Use state parameter for CSRF protection
- [ ] Validate redirect URIs strictly
- [ ] Implement token refresh logic
- [ ] Handle token revocation gracefully
- [ ] Encrypt tokens at rest
- [ ] Use HTTPS for all callbacks

### Production Readiness
- [ ] Complete OAuth app verification (if external + sensitive scopes)
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Verify authorized domains
- [ ] Test with real users
- [ ] Monitor quota usage
- [ ] Set up error logging
- [ ] Plan for token rotation
- [ ] Document incident response

### Compliance
- [ ] Document data retention policy
- [ ] Implement user data deletion
- [ ] Allow users to revoke access
- [ ] Maintain audit logs
- [ ] GDPR compliance (if EU users)

---

## Resources

### Official Documentation
- **OAuth 2.0 Overview:** https://developers.google.com/identity/protocols/oauth2
- **Web Server Apps:** https://developers.google.com/identity/protocols/oauth2/web-server
- **OpenID Connect:** https://developers.google.com/identity/openid-connect/openid-connect
- **OAuth Scopes:** https://developers.google.com/identity/protocols/oauth2/scopes
- **Service Accounts:** https://developers.google.com/identity/protocols/oauth2/service-account

### Tools
- **Google Cloud Console:** https://console.cloud.google.com
- **OAuth Playground:** https://developers.google.com/oauthplayground
- **API Library:** https://console.cloud.google.com/apis/library
- **OAuth Clients:** https://console.cloud.google.com/apis/credentials

### Support
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/google-oauth
- **Issue Tracker:** https://issuetracker.google.com/issues?q=componentid:187071
- **Community Support:** https://groups.google.com/g/google-oauth

---

**Research Date:** 2025-10-04
**Last Updated:** 2025-10-04
**Maintained By:** Claude Code (AI Project Manager)
