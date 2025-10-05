# AWS Cognito OAuth 2.0 Integration Guide

**Date:** 2025-10-04
**Purpose:** Comprehensive guide for setting up AWS Cognito OAuth 2.0 integration for third-party applications

---

## Table of Contents

1. [Overview](#overview)
2. [OAuth 2.0 Endpoints](#oauth-20-endpoints)
3. [User Pool Setup](#user-pool-setup)
4. [App Client Configuration](#app-client-configuration)
5. [OAuth Scopes](#oauth-scopes)
6. [OAuth Grant Types](#oauth-grant-types)
7. [Domain Configuration](#domain-configuration)
8. [Resource Servers & Custom Scopes](#resource-servers--custom-scopes)
9. [API Gateway Integration](#api-gateway-integration)
10. [Security Best Practices](#security-best-practices)
11. [Special Considerations](#special-considerations)

---

## Overview

Amazon Cognito provides OAuth 2.0 and OpenID Connect (OIDC) support for user authentication and authorization. When you set up a user pool domain, Cognito creates all necessary OAuth endpoints automatically.

**Key Benefits:**
- Standard OAuth 2.0 and OIDC compliance
- Built-in token management and validation
- Integration with AWS services (API Gateway, Lambda, etc.)
- Support for social and enterprise identity providers
- Machine-to-machine (M2M) authentication

---

## OAuth 2.0 Endpoints

All endpoints use your configured domain as the base URL.

### Endpoint URL Format

**Amazon Cognito Domain:**
```
https://<your-domain>.auth.<region>.amazoncognito.com
```

**Custom Domain:**
```
https://<your-custom-domain>
```

### Core Endpoints

#### 1. Authorization Endpoint
**URL:** `/oauth2/authorize`
**Method:** HTTPS GET only
**Purpose:** Initiates OAuth 2.0 authorization flow

**Full URL Example:**
```
https://my-app.auth.us-east-1.amazoncognito.com/oauth2/authorize
```

**Required Parameters:**
- `response_type` - `code` or `token`
- `client_id` - Your app client ID
- `redirect_uri` - Pre-registered callback URL
- `scope` - Space-separated list of scopes
- `state` - CSRF protection token (recommended)

**With PKCE (Recommended for public clients):**
- `code_challenge` - SHA256 hash of code_verifier (base64url encoded)
- `code_challenge_method` - `S256`

**Example Authorization Request:**
```
https://my-app.auth.us-east-1.amazoncognito.com/oauth2/authorize?
  response_type=code&
  client_id=1example23456789&
  redirect_uri=https://www.example.com/callback&
  scope=openid%20email%20profile&
  state=random_state_string&
  code_challenge=Eh0mg-OZv7BAyo-tdv_vYamx1boOYDulDklyXoMDtLg&
  code_challenge_method=S256
```

#### 2. Token Endpoint
**URL:** `/oauth2/token`
**Method:** HTTPS POST
**Purpose:** Exchange authorization code for tokens or refresh access tokens

**Full URL Example:**
```
https://my-app.auth.us-east-1.amazoncognito.com/oauth2/token
```

**Authorization Code Grant Request:**
```http
POST /oauth2/token HTTP/1.1
Host: my-app.auth.us-east-1.amazoncognito.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=https://www.example.com/callback&
code_verifier=ORIGINAL_CODE_VERIFIER
```

**Client Credentials Grant Request:**
```http
POST /oauth2/token HTTP/1.1
Host: my-app.auth.us-east-1.amazoncognito.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=client_credentials&
scope=resource-server/read%20resource-server/write
```

**Refresh Token Request:**
```http
POST /oauth2/token HTTP/1.1
Host: my-app.auth.us-east-1.amazoncognito.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=refresh_token&
refresh_token=REFRESH_TOKEN&
client_id=CLIENT_ID
```

**Response:**
```json
{
  "access_token": "eyJraWQiOiI...",
  "id_token": "eyJraWQiOiI...",
  "refresh_token": "eyJjdHkiOiJ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### 3. UserInfo Endpoint
**URL:** `/oauth2/userInfo`
**Method:** GET or POST
**Purpose:** Retrieve user attributes using access token

**Full URL Example:**
```
https://my-app.auth.us-east-1.amazoncognito.com/oauth2/userInfo
```

**Request:**
```http
GET /oauth2/userInfo HTTP/1.1
Host: my-app.auth.us-east-1.amazoncognito.com
Authorization: Bearer ACCESS_TOKEN
```

**Response:**
```json
{
  "sub": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "email_verified": "true",
  "email": "user@example.com",
  "username": "user123",
  "phone_number_verified": "true",
  "phone_number": "+1234567890",
  "custom:organization": "my-company"
}
```

**Important Notes:**
- Requires access token with at least `openid` scope
- Returns attributes based on token scopes
- `email_verified` and `phone_number_verified` are returned as strings
- Custom attributes are included if requested scopes allow
- Counts toward GetUser API rate limits

#### 4. OpenID Configuration Endpoint (Discovery)
**URL:** `/.well-known/openid-configuration`
**Method:** GET
**Purpose:** OIDC discovery document

**Full URL Example:**
```
https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456/.well-known/openid-configuration
```

**Response Contains:**
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`
- `issuer`
- `response_types_supported`
- `scopes_supported`
- `token_endpoint_auth_methods_supported`
- `id_token_signing_alg_values_supported`
- `subject_types_supported`

**Note:** This endpoint uses the Cognito IDP domain format, not your custom domain.

#### 5. JWKS Endpoint
**URL:** `/.well-known/jwks.json`
**Method:** GET
**Purpose:** Public keys for JWT signature verification

**Full URL Example:**
```
https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456/.well-known/jwks.json
```

#### 6. Revoke Endpoint
**URL:** `/oauth2/revoke`
**Method:** POST
**Purpose:** Revoke refresh tokens

**Request:**
```http
POST /oauth2/revoke HTTP/1.1
Host: my-app.auth.us-east-1.amazoncognito.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

token=REFRESH_TOKEN&
token_type_hint=refresh_token
```

#### 7. Logout Endpoint
**URL:** `/logout`
**Method:** GET
**Purpose:** Sign out user and clear session

**Full URL Example:**
```
https://my-app.auth.us-east-1.amazoncognito.com/logout?
  client_id=CLIENT_ID&
  logout_uri=https://www.example.com/logout-callback
```

---

## User Pool Setup

### Prerequisites

1. AWS Account with appropriate IAM permissions
2. Region selection (e.g., us-east-1)
3. Understanding of OAuth 2.0 flows

### Step-by-Step User Pool Creation

#### 1. Create User Pool

**Via AWS Console:**
1. Navigate to Amazon Cognito service
2. Choose "User pools" → "Create user pool"
3. Configure sign-in options (email, phone, username)
4. Set password policy requirements
5. Enable MFA (optional but recommended)
6. Configure email/SMS delivery
7. Add custom attributes if needed
8. Review and create

**Via AWS CLI:**
```bash
aws cognito-idp create-user-pool \
  --pool-name my-user-pool \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email \
  --mfa-configuration OPTIONAL \
  --region us-east-1
```

**Response:**
```json
{
  "UserPool": {
    "Id": "us-east-1_ABC123456",
    "Name": "my-user-pool",
    "Arn": "arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_ABC123456",
    ...
  }
}
```

#### 2. Configure User Pool Settings

**Required Settings:**
- **Password Policy:** Minimum length, character requirements
- **MFA:** Optional, required, or off
- **Email/SMS Configuration:** SES or Cognito default
- **Auto-verification:** Email and/or phone number
- **Custom Attributes:** Additional user properties (cannot be modified after creation)

**Optional Settings:**
- Account recovery options
- User invitation templates
- Pre/post authentication Lambda triggers
- Advanced security features (compromised credentials)

---

## App Client Configuration

App clients define how applications interact with your user pool.

### Creating App Clients

#### Via AWS Console

1. Navigate to your user pool
2. Select "App integration" → "App clients and analytics"
3. Click "Create app client"
4. Choose app client type:
   - **Public client** - No client secret (SPAs, mobile apps)
   - **Confidential client** - With client secret (server-side apps)

5. Configure app client settings:
   - App client name
   - Authentication flows
   - OAuth 2.0 grant types
   - Scopes
   - Callback URLs
   - Sign-out URLs
   - Token expiration times

6. Click "Create app client"

#### Via AWS CLI

**Create Confidential Client (with secret):**
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-name my-backend-app \
  --generate-secret \
  --allowed-o-auth-flows authorization_code_grant client_credentials \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls https://www.example.com/callback \
  --logout-urls https://www.example.com/logout \
  --supported-identity-providers COGNITO \
  --allowed-o-auth-flows-user-pool-client \
  --region us-east-1
```

**Create Public Client (no secret):**
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-name my-spa-app \
  --no-generate-secret \
  --allowed-o-auth-flows authorization_code_grant implicit \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls https://www.example.com/callback \
  --logout-urls https://www.example.com/logout \
  --supported-identity-providers COGNITO \
  --allowed-o-auth-flows-user-pool-client \
  --region us-east-1
```

**Response:**
```json
{
  "UserPoolClient": {
    "ClientId": "1example23456789",
    "ClientName": "my-backend-app",
    "ClientSecret": "SECRET_VALUE_HERE",
    "UserPoolId": "us-east-1_ABC123456",
    ...
  }
}
```

### App Client Configuration Options

#### Authentication Flows

**ALLOW_ADMIN_USER_PASSWORD_AUTH:**
- Server-side authentication with username/password
- Requires secure server environment

**ALLOW_CUSTOM_AUTH:**
- Custom authentication challenges
- Lambda trigger-based authentication

**ALLOW_USER_PASSWORD_AUTH:**
- Direct username/password authentication
- Not recommended for public clients

**ALLOW_USER_SRP_AUTH:**
- Secure Remote Password protocol
- More secure than direct password auth

**ALLOW_REFRESH_TOKEN_AUTH:**
- Enable refresh token flow
- Required for long-lived sessions

#### OAuth 2.0 Settings

**Enable OAuth 2.0:**
Must be enabled to use:
- Callback URLs
- Logout URLs
- OAuth 2.0 scopes
- OAuth 2.0 grant types

**Grant Types:**
- Authorization code grant (most secure)
- Implicit grant (deprecated, avoid if possible)
- Client credentials grant (M2M)

**Important:** Cannot enable client credentials in the same app client as authorization code or implicit grants.

#### Token Expiration

**ID Token Expiration:** 5 minutes - 24 hours (default: 1 hour)
**Access Token Expiration:** 5 minutes - 24 hours (default: 1 hour)
**Refresh Token Expiration:** 1 hour - 3650 days (default: 30 days)

**Recommendation:**
- Short-lived access tokens (15-60 minutes)
- Enable refresh token rotation
- Longer refresh token expiration (30-90 days)

#### Callback & Logout URLs

**Requirements:**
- Must use HTTPS (except `http://localhost` for testing)
- Exact match required (no wildcards)
- Multiple URLs supported (comma-separated)
- Deep links supported (e.g., `myapp://callback`)

**Examples:**
```
https://www.example.com/callback
https://app.example.com/auth/callback
http://localhost:3000/callback
myapp://oauth/callback
```

---

## OAuth Scopes

Scopes define what user information and permissions an access token contains.

### Standard OpenID Connect Scopes

#### `openid` (Required for ID tokens)
- **Purpose:** Request OIDC ID token
- **Returns:** `sub` claim (user's unique identifier)
- **Required:** Must be present to receive ID token

#### `email`
- **Purpose:** Request email address
- **Returns in ID token:** `email`, `email_verified`
- **UserInfo endpoint:** Includes email attributes
- **Requirement:** Must also request `openid` scope

#### `profile`
- **Purpose:** Request profile information
- **Returns in ID token:**
  - `name`
  - `family_name`
  - `given_name`
  - `middle_name`
  - `nickname`
  - `preferred_username`
  - `profile` (URL)
  - `picture` (URL)
  - `website` (URL)
  - `gender`
  - `birthdate`
  - `zoneinfo`
  - `locale`
  - `updated_at`
- **UserInfo endpoint:** Includes all profile attributes
- **Requirement:** Must also request `openid` scope

#### `phone`
- **Purpose:** Request phone number
- **Returns in ID token:** `phone_number`, `phone_number_verified`
- **UserInfo endpoint:** Includes phone attributes
- **Requirement:** Must also request `openid` scope

#### `address`
- **Purpose:** Request address information
- **Returns:** Address object with street, city, state, postal code, country
- **Requirement:** Must also request `openid` scope

### AWS Cognito Reserved Scopes

#### `aws.cognito.signin.user.admin`
- **Purpose:** Grant access to user pool API operations
- **Use cases:**
  - Update user attributes
  - Change password
  - Manage MFA settings
  - Device management
- **Token type:** Access token only
- **Note:** Does NOT affect userInfo endpoint response

### Custom Scopes

Custom scopes are defined via resource servers (see Resource Servers section).

**Format:** `resource-server-identifier/scope-name`

**Examples:**
- `my-api/read`
- `my-api/write`
- `photos/view`
- `photos/upload`

### Scope Behavior

**Default Behavior:**
If you don't specify scopes in the authorization request, Cognito returns all scopes enabled for the app client.

**Scope Filtering:**
Amazon Cognito ignores scopes in the request that aren't allowed for the app client.

**UserInfo Endpoint:**
The scopes in the access token determine which attributes are returned from the userInfo endpoint.

**Authorization Request Example:**
```
https://my-app.auth.us-east-1.amazoncognito.com/oauth2/authorize?
  response_type=code&
  client_id=1example23456789&
  redirect_uri=https://www.example.com/callback&
  scope=openid%20email%20profile%20phone%20aws.cognito.signin.user.admin
```

---

## OAuth Grant Types

AWS Cognito supports multiple OAuth 2.0 grant types for different use cases.

### 1. Authorization Code Grant (Recommended)

**Most secure grant type** - Tokens never exposed to user agent.

#### When to Use
- Server-side web applications
- Applications that can securely store client secret
- When refresh tokens are needed

#### Flow Overview

1. **Authorization Request:**
```
GET /oauth2/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=openid%20email%20profile&
  state=STATE_VALUE
```

2. **User Authentication:** User signs in via Cognito hosted UI

3. **Authorization Response:**
```
https://www.example.com/callback?
  code=AUTHORIZATION_CODE&
  state=STATE_VALUE
```

4. **Token Request:**
```http
POST /oauth2/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=REDIRECT_URI
```

5. **Token Response:**
```json
{
  "access_token": "eyJra...",
  "id_token": "eyJra...",
  "refresh_token": "eyJjd...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### With PKCE (Proof Key for Code Exchange)

**Recommended for public clients (SPAs, mobile apps)**

**Additional Steps:**

1. Generate `code_verifier` (random string)
2. Calculate `code_challenge` = BASE64URL(SHA256(code_verifier))
3. Include in authorization request:
```
code_challenge=CODE_CHALLENGE&
code_challenge_method=S256
```
4. Include `code_verifier` in token request:
```
code_verifier=ORIGINAL_CODE_VERIFIER
```

**Implementation:**
```javascript
// Generate code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

// Store code_verifier in sessionStorage
sessionStorage.setItem('code_verifier', codeVerifier);
```

### 2. Implicit Grant (Deprecated - Avoid)

**Security concerns** - Tokens exposed in URL fragment.

#### When to Use
- **DON'T USE** - deprecated in OAuth 2.1
- Use authorization code grant with PKCE instead

#### Flow Overview (for reference only)

1. **Authorization Request:**
```
GET /oauth2/authorize?
  response_type=token&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=openid%20email
```

2. **Authorization Response:**
```
https://www.example.com/callback#
  access_token=ACCESS_TOKEN&
  id_token=ID_TOKEN&
  token_type=Bearer&
  expires_in=3600
```

**Problems:**
- Tokens visible in browser history
- No refresh tokens
- Cannot authenticate client
- Vulnerable to XSS attacks

### 3. Client Credentials Grant (Machine-to-Machine)

**Server-to-server authentication** without user context.

#### When to Use
- Backend services
- Microservices communication
- Scheduled jobs
- API-to-API authentication

#### Requirements
- Must have client secret
- Cannot be enabled with authorization code or implicit grants
- Only supports custom scopes from resource servers
- No ID token or refresh token issued

#### Flow Overview

1. **Token Request:**
```http
POST /oauth2/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=client_credentials&
scope=my-api/read%20my-api/write
```

2. **Token Response:**
```json
{
  "access_token": "eyJra...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Access Token Contents:**
```json
{
  "sub": "CLIENT_ID",
  "token_use": "access",
  "scope": "my-api/read my-api/write",
  "auth_time": 1234567890,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456",
  "exp": 1234571490,
  "iat": 1234567890,
  "version": 2,
  "jti": "abc123...",
  "client_id": "CLIENT_ID"
}
```

#### Security Considerations

- Store client credentials in secure secret management (AWS Secrets Manager)
- Rotate credentials regularly
- Use least-privilege scopes
- Monitor token usage
- Implement rate limiting

### 4. Refresh Token Grant

**Obtain new access tokens** without re-authenticating user.

#### When to Use
- Long-lived sessions
- Mobile applications
- Persist user login state

#### Flow Overview

1. **Refresh Token Request:**
```http
POST /oauth2/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=refresh_token&
refresh_token=REFRESH_TOKEN&
client_id=CLIENT_ID
```

2. **Token Response:**
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "id_token": "NEW_ID_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Note:** New refresh token may be issued if rotation is enabled.

#### Refresh Token Rotation

**Enable in app client settings:**
- Automatically invalidates old refresh token
- Issues new refresh token with each use
- Detects token replay attacks
- Recommended for production

**Configuration:**
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-id CLIENT_ID \
  --enable-token-revocation \
  --enable-propagate-additional-user-context-data
```

---

## Domain Configuration

A domain is required to use OAuth 2.0 endpoints.

### Amazon Cognito Domain (Prefix Domain)

**Format:** `https://<your-prefix>.auth.<region>.amazoncognito.com`

#### Setup via Console

1. Navigate to user pool
2. Select "App integration" → "Domain name"
3. Choose "Use a Cognito domain"
4. Enter domain prefix (must be globally unique)
5. Check availability
6. Save changes

#### Setup via CLI

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_ABC123456 \
  --domain my-unique-app-name \
  --region us-east-1
```

**Response:**
```json
{
  "CloudFrontDomain": "d111111abcdef8.cloudfront.net"
}
```

**Verification:**
Visit `https://my-unique-app-name.auth.us-east-1.amazoncognito.com/.well-known/openid-configuration`

#### Availability

- Domain prefix must be globally unique across all AWS accounts
- Check availability before creating
- Cannot be changed after creation (must delete and recreate)

### Custom Domain

**Format:** `https://<your-custom-domain>`

#### Prerequisites

1. **Own the domain** (registered with Route 53 or external registrar)
2. **ACM certificate** in **US East (N. Virginia)** region
3. **Certificate validation** completed

**Important:** ACM certificate MUST be in us-east-1, regardless of user pool region.

#### Setup Steps

**1. Request/Import ACM Certificate (in us-east-1):**

```bash
aws acm request-certificate \
  --domain-name auth.example.com \
  --validation-method DNS \
  --region us-east-1
```

**2. Validate Certificate:**

Add DNS CNAME records provided by ACM to prove domain ownership.

**3. Create Custom Domain:**

Via Console:
1. Navigate to "App integration" → "Domain name"
2. Choose "Use your own domain"
3. Enter domain name (e.g., auth.example.com)
4. Select ACM certificate
5. Save changes

Via CLI:
```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_ABC123456 \
  --domain auth.example.com \
  --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --region us-east-1
```

**4. Create DNS Record:**

Cognito returns a CloudFront distribution domain. Create an A record (ALIAS) or CNAME:

**Route 53:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "auth.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d111111abcdef8.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

**External DNS:**
```
Type: CNAME
Name: auth.example.com
Value: d111111abcdef8.cloudfront.net
TTL: 300
```

#### Propagation Times

- **New custom domain:** Up to 1 hour
- **Domain changes:** Up to 5 minutes
- **DNS propagation:** Varies (15 minutes - 48 hours)

#### OpenID Configuration

**Important:** The OIDC discovery endpoint uses the Cognito IDP format, not the custom domain:

```
https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456/.well-known/openid-configuration
```

The `iss` claim in tokens also uses the Cognito IDP format, not the custom domain.

**Custom domain endpoints:**
```
https://auth.example.com/oauth2/authorize
https://auth.example.com/oauth2/token
https://auth.example.com/oauth2/userInfo
https://auth.example.com/logout
```

#### Differences: Prefix vs Custom Domain

| Feature | Prefix Domain | Custom Domain |
|---------|---------------|---------------|
| Setup Complexity | Simple | Moderate |
| Cost | Free | ACM certificate free, CloudFront costs apply |
| SSL Certificate | Automatic | Manual (ACM required) |
| Branding | Limited | Full control |
| OIDC Discovery | Full support | Limited (issuer unchanged) |
| Propagation Time | Instant | Up to 1 hour |

---

## Resource Servers & Custom Scopes

Resource servers define OAuth 2.0 API servers with custom authorization scopes.

### Overview

**Resource Server:** An OAuth 2.0 API server that validates access tokens and enforces scope-based authorization.

**Custom Scopes:** Application-specific permissions for fine-grained access control.

### Use Cases

- API authorization
- Machine-to-machine authentication
- Microservices authorization
- Multi-tenant applications
- Fine-grained permissions

### Creating Resource Servers

#### Via Console

1. Navigate to user pool
2. Select "App integration" → "Resource servers"
3. Click "Create resource server"
4. Configure:
   - **Resource server name:** Friendly name
   - **Resource server identifier:** Unique identifier (e.g., `my-api`)
   - **Custom scopes:** Define scope name and description

5. Save resource server

#### Via CLI

```bash
aws cognito-idp create-resource-server \
  --user-pool-id us-east-1_ABC123456 \
  --identifier my-api \
  --name "My API" \
  --scopes \
    ScopeName=read,ScopeDescription="Read access" \
    ScopeName=write,ScopeDescription="Write access" \
    ScopeName=delete,ScopeDescription="Delete access" \
  --region us-east-1
```

**Response:**
```json
{
  "ResourceServer": {
    "UserPoolId": "us-east-1_ABC123456",
    "Identifier": "my-api",
    "Name": "My API",
    "Scopes": [
      {
        "ScopeName": "read",
        "ScopeDescription": "Read access"
      },
      {
        "ScopeName": "write",
        "ScopeDescription": "Write access"
      },
      {
        "ScopeName": "delete",
        "ScopeDescription": "Delete access"
      }
    ]
  }
}
```

### Custom Scope Format

**Format:** `<resource-server-identifier>/<scope-name>`

**Examples:**
- `my-api/read`
- `my-api/write`
- `my-api/delete`
- `photos-api/view`
- `photos-api/upload`
- `admin-api/users.read`
- `admin-api/users.write`

### Configuring App Client Scopes

After creating resource server, enable custom scopes in app clients:

**Via Console:**
1. Navigate to app client
2. Edit "Hosted UI" settings
3. Select custom scopes from resource servers
4. Save changes

**Via CLI:**
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-id CLIENT_ID \
  --allowed-o-auth-scopes \
    openid email profile \
    my-api/read my-api/write \
  --region us-east-1
```

### Authorization Request with Custom Scopes

```
GET /oauth2/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=openid%20email%20my-api/read%20my-api/write
```

### Access Token with Custom Scopes

```json
{
  "sub": "user-uuid",
  "cognito:groups": ["admin"],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456",
  "cognito:username": "user123",
  "origin_jti": "abc-123",
  "aud": "CLIENT_ID",
  "event_id": "event-123",
  "token_use": "access",
  "auth_time": 1234567890,
  "exp": 1234571490,
  "iat": 1234567890,
  "jti": "jti-123",
  "email": "user@example.com",
  "scope": "openid email my-api/read my-api/write"
}
```

### Client Credentials Grant with Custom Scopes

**Only custom scopes allowed** - cannot use openid, email, profile, phone, etc.

```http
POST /oauth2/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=client_credentials&
scope=my-api/read%20my-api/write
```

### Multi-Tenant Scopes

Use custom scopes for tenant isolation:

**Pattern:** `<resource-server>/tenant-<tenant-id>.<permission>`

**Examples:**
- `my-api/tenant-abc123.read`
- `my-api/tenant-abc123.write`
- `my-api/tenant-xyz789.admin`

**Implementation:**
1. Create scopes per tenant dynamically
2. Assign scopes to users via groups
3. Validate scopes in API

---

## API Gateway Integration

Integrate AWS Cognito with API Gateway for API authorization.

### Overview

API Gateway supports Amazon Cognito user pools as authorizers, validating JWT tokens and enforcing scope-based access control.

### Setup Steps

#### 1. Create Cognito Authorizer in API Gateway

**Via Console:**
1. Open API Gateway console
2. Select your API
3. Choose "Authorizers" → "Create authorizer"
4. Configure:
   - **Name:** Cognito-Authorizer
   - **Type:** Cognito
   - **Cognito user pool:** Select your user pool
   - **Token source:** `Authorization` (header name)
   - **Token validation:** (optional) regex pattern

5. Create authorizer

**Via CLI:**
```bash
aws apigateway create-authorizer \
  --rest-api-id abc123 \
  --name Cognito-Authorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_ABC123456 \
  --identity-source method.request.header.Authorization \
  --region us-east-1
```

#### 2. Attach Authorizer to API Methods

**Via Console:**
1. Select API resource/method
2. Choose "Method Request"
3. Edit "Authorization"
4. Select Cognito authorizer
5. (Optional) Add OAuth scopes
6. Save changes

**Via CLI:**
```bash
aws apigateway update-method \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method GET \
  --patch-operations \
    op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
    op=replace,path=/authorizerId,value=AUTHORIZER_ID
```

#### 3. Configure Scopes (Optional)

Enforce specific OAuth scopes for each method:

**Via Console:**
1. Method Request → Authorization scopes
2. Add required scopes (e.g., `my-api/read`)
3. API Gateway validates access token contains required scopes

**Via CLI:**
```bash
aws apigateway update-method \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method GET \
  --patch-operations \
    op=add,path=/authorizationScopes,value=my-api/read
```

### Token Validation

API Gateway validates:
1. **Token signature** using JWKS from Cognito
2. **Token expiration** (exp claim)
3. **Issuer** (iss claim matches user pool)
4. **Audience** (aud claim matches app client ID)
5. **OAuth scopes** (if configured)

### Accessing User Information in Backend

#### Lambda Integration

User claims are available in the `event.requestContext.authorizer` object:

```javascript
exports.handler = async (event) => {
  // Access user information
  const userId = event.requestContext.authorizer.claims.sub;
  const email = event.requestContext.authorizer.claims.email;
  const username = event.requestContext.authorizer.claims['cognito:username'];
  const groups = event.requestContext.authorizer.claims['cognito:groups'];

  // Access custom claims
  const orgId = event.requestContext.authorizer.claims['custom:organization_id'];

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello ${username}`,
      userId: userId,
      email: email
    })
  };
};
```

#### HTTP Integration

Use mapping templates to pass claims to backend:

**Integration Request Mapping:**
```json
{
  "userId": "$context.authorizer.claims.sub",
  "email": "$context.authorizer.claims.email",
  "username": "$context.authorizer.claims['cognito:username']",
  "groups": "$context.authorizer.claims['cognito:groups']"
}
```

**HTTP Headers:**
```
X-User-Id: $context.authorizer.claims.sub
X-User-Email: $context.authorizer.claims.email
X-User-Groups: $context.authorizer.claims['cognito:groups']
```

### Testing

**Via API Gateway Test Console:**
1. Navigate to method
2. Click "Test"
3. Add Authorization header: `Bearer ACCESS_TOKEN`
4. Execute test
5. Verify 200 response (or 401/403 if unauthorized)

**Via curl:**
```bash
curl -X GET https://abc123.execute-api.us-east-1.amazonaws.com/prod/resource \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Error Responses

**401 Unauthorized:**
- Missing Authorization header
- Invalid token format
- Token signature validation failed
- Token expired

**403 Forbidden:**
- Required scopes not present in token
- User not authorized for resource

---

## Security Best Practices

### 1. Use Authorization Code Grant with PKCE

**Why:** Most secure OAuth flow, prevents authorization code interception.

**For:**
- Single-page applications (SPAs)
- Mobile applications
- Public clients

**Implementation:**
- Generate `code_verifier` (random string)
- Calculate `code_challenge` = SHA256(code_verifier)
- Store `code_verifier` securely (sessionStorage, secure storage)
- Include `code_challenge` in authorization request
- Include `code_verifier` in token request

### 2. Enable Refresh Token Rotation

**Why:** Detects token replay attacks, limits exposure.

**Configuration:**
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-id CLIENT_ID \
  --enable-token-revocation \
  --prevent-user-existence-errors ENABLED
```

**Behavior:**
- New refresh token issued on each use
- Old refresh token invalidated
- If old token is reused, all tokens revoked

### 3. Short-Lived Access Tokens

**Recommendation:**
- Access tokens: 15-60 minutes
- ID tokens: 15-60 minutes
- Refresh tokens: 30-90 days

**Why:** Limits damage if tokens are compromised.

**Implementation:**
Configure in app client token expiration settings.

### 4. Secure Credential Storage

**Client ID:** Can be public (for public clients)

**Client Secret:** Must be protected:
- **NEVER** hardcode in source code
- **NEVER** expose in client-side JavaScript
- **Use:** Environment variables, AWS Secrets Manager, Parameter Store

**Example (Node.js):**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getClientSecret() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'cognito-client-secret'
  }).promise();

  return JSON.parse(data.SecretString).clientSecret;
}
```

### 5. Use State Parameter

**Why:** Prevents CSRF attacks in OAuth flows.

**Implementation:**
```javascript
// Generate random state
const state = crypto.randomUUID();

// Store state (sessionStorage, cookie with HttpOnly/Secure/SameSite)
sessionStorage.setItem('oauth_state', state);

// Include in authorization request
const authUrl = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

// Validate state in callback
const urlParams = new URLSearchParams(window.location.search);
const returnedState = urlParams.get('state');
const storedState = sessionStorage.getItem('oauth_state');

if (returnedState !== storedState) {
  throw new Error('Invalid state parameter - possible CSRF attack');
}
```

### 6. Validate JWT Tokens

**Server-side validation required:**

1. **Verify signature** using public keys from JWKS endpoint
2. **Check expiration** (exp claim)
3. **Verify issuer** (iss claim)
4. **Verify audience** (aud claim)
5. **Check token_use** claim (access or id)

**Example (Node.js with jsonwebtoken):**
```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123456',
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}
```

### 7. Implement Rate Limiting

**Protect against:**
- Brute force attacks
- Token enumeration
- API abuse

**Implementation:**
- AWS WAF rate limiting
- API Gateway throttling
- Custom Lambda authorizers with DynamoDB tracking

### 8. Monitor and Alert

**CloudWatch Metrics:**
- Failed authentication attempts
- Token validation failures
- Unusual API access patterns
- Excessive token refresh requests

**CloudTrail Events:**
- User pool configuration changes
- App client modifications
- Token revocations

### 9. Least Privilege Scopes

**Principle:** Request only the scopes needed for the application's functionality.

**Bad:**
```
scope=openid email profile phone address aws.cognito.signin.user.admin my-api/*
```

**Good:**
```
scope=openid email my-api/read
```

### 10. Secure Redirect URIs

**Requirements:**
- Use HTTPS (except localhost)
- Exact match (no wildcards)
- Whitelist specific URIs only

**Avoid:**
- `https://*.example.com` (not supported)
- `https://example.com/*` (not supported)
- HTTP in production

---

## Special Considerations

### 1. Token Size Limitations

**Issue:** JWTs can become large with many claims/scopes.

**Limits:**
- **Authorization header:** 8 KB (API Gateway)
- **Lambda event:** 6 MB
- **Browser URLs:** 2 KB (varies by browser)

**Solutions:**
- Minimize custom attributes
- Use short scope names
- Store large data server-side, reference by ID
- Use access tokens instead of ID tokens for authorization

### 2. Social Identity Providers

Cognito supports federated login with:
- Amazon
- Facebook
- Google
- Apple
- SAML providers
- OpenID Connect providers

**Setup:**
1. Configure identity provider in Cognito
2. Add provider to app client "Hosted UI" settings
3. Users can sign in via social provider
4. Cognito issues tokens after successful authentication

**Authorization Request:**
```
GET /oauth2/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  identity_provider=Google&
  scope=openid%20email%20profile
```

### 3. Custom Attributes

**Cannot be modified after creation** - plan carefully.

**Naming:** Must start with `custom:`

**Example:**
- `custom:organization_id`
- `custom:subscription_tier`
- `custom:tenant_id`

**Access in Tokens:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "custom:organization_id": "org-123",
  "custom:subscription_tier": "premium"
}
```

### 4. Groups

Assign users to groups for role-based access control.

**Benefits:**
- Manage permissions at group level
- Include group membership in tokens
- Simplify authorization logic

**Token Claims:**
```json
{
  "cognito:groups": ["admin", "editor"],
  ...
}
```

**API Authorization:**
```javascript
const groups = event.requestContext.authorizer.claims['cognito:groups'];
if (!groups || !groups.includes('admin')) {
  return { statusCode: 403, body: 'Forbidden' };
}
```

### 5. Pre-Token Generation Lambda Trigger

Customize tokens before they're issued:
- Add/modify claims
- Suppress attributes
- Override scopes
- Implement custom authorization logic

**Example:**
```javascript
exports.handler = async (event) => {
  // Add custom claims
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:tenant_id': 'tenant-123',
        'custom:role': 'admin'
      },
      claimsToSuppress: ['email_verified'],
      groupOverrideDetails: {
        groupsToOverride: ['premium_users']
      }
    }
  };

  return event;
};
```

### 6. Advanced Security Features

**Compromised Credentials Detection:**
- Cognito checks against known breached credentials
- Configurable actions (block, notify, allow with MFA)

**Adaptive Authentication:**
- Risk-based authentication
- Requires additional verification for suspicious activity

**Configuration:**
```bash
aws cognito-idp set-risk-configuration \
  --user-pool-id us-east-1_ABC123456 \
  --compromised-credentials-risk-configuration \
    EventFilter=SIGN_IN,SIGN_UP,Actions={EventAction=BLOCK}
```

### 7. CORS Configuration

For browser-based applications:

**API Gateway CORS:**
```json
{
  "AllowOrigins": ["https://app.example.com"],
  "AllowMethods": ["GET", "POST", "OPTIONS"],
  "AllowHeaders": ["Authorization", "Content-Type"],
  "MaxAge": 3600
}
```

**Cognito Hosted UI:** CORS automatically configured for callback URLs.

### 8. Logout Behavior

**Cognito Logout:**
- Invalidates session cookies
- Does NOT revoke tokens
- Tokens remain valid until expiration

**Complete Logout:**
1. Call `/logout` endpoint
2. Revoke refresh token via `/oauth2/revoke`
3. Clear local storage/session storage
4. Redirect to logout callback URL

**Example:**
```javascript
// 1. Revoke refresh token
await fetch('https://my-app.auth.us-east-1.amazoncognito.com/oauth2/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `token=${refreshToken}&client_id=${clientId}`
});

// 2. Clear local tokens
localStorage.removeItem('access_token');
localStorage.removeItem('id_token');
localStorage.removeItem('refresh_token');

// 3. Cognito logout
window.location.href = `https://my-app.auth.us-east-1.amazoncognito.com/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
```

### 9. Multi-Region Considerations

**User Pools are Regional:**
- Cannot replicate across regions
- Must create separate user pools per region

**Global Application:**
- Use Amazon CloudFront for global distribution
- Implement user pool routing based on geography
- Replicate user data across regions (if needed)

### 10. Cost Optimization

**Free Tier:**
- 50,000 MAUs (Monthly Active Users) free

**Pricing:**
- $0.0055 per MAU for MAUs 50,001-100,000
- $0.0046 per MAU for MAUs > 100,000
- Advanced security features: Additional cost

**Optimization:**
- Cache tokens client-side (reduce token requests)
- Use longer token expiration (balance security vs cost)
- Implement token refresh only when needed
- Monitor MAU counts

### 11. Migration from Other Auth Systems

**Cognito supports:**
- CSV import
- User migration Lambda trigger (just-in-time migration)
- AWS DMS for database migration

**User Migration Trigger:**
```javascript
exports.handler = async (event) => {
  if (event.triggerSource === 'UserMigration_Authentication') {
    // Validate credentials against legacy system
    const user = await legacyAuth(event.userName, event.request.password);

    if (user) {
      event.response.userAttributes = {
        email: user.email,
        email_verified: 'true'
      };
      event.response.finalUserStatus = 'CONFIRMED';
      event.response.messageAction = 'SUPPRESS';
    }
  }

  return event;
};
```

### 12. Debugging and Troubleshooting

**Common Issues:**

**"Invalid client error":**
- Client ID incorrect
- Client secret missing/incorrect
- App client not configured for OAuth

**"Invalid redirect_uri error":**
- Redirect URI not whitelisted in app client
- URI must match exactly (including trailing slash)

**"Invalid scope error":**
- Scope not enabled for app client
- Custom scope format incorrect
- Resource server not configured

**"Token expired":**
- Access token expired (check exp claim)
- Refresh token expired
- Token revoked

**Debugging Tools:**
- JWT.io - Decode and inspect tokens
- AWS CloudWatch Logs - Lambda execution logs
- AWS CloudTrail - API call history
- API Gateway execution logs

---

## Summary

AWS Cognito provides a comprehensive OAuth 2.0 and OpenID Connect implementation with:

✅ **Standard OAuth 2.0 endpoints** (authorize, token, userInfo, revoke)
✅ **Multiple grant types** (authorization code, client credentials, refresh token)
✅ **Custom domains** with SSL certificates
✅ **Resource servers** for custom scopes and API authorization
✅ **API Gateway integration** for serverless APIs
✅ **Advanced security features** (PKCE, token rotation, compromised credential detection)
✅ **Extensive customization** (Lambda triggers, custom attributes, groups)

### Quick Reference

**Authorization Endpoint:**
```
https://<domain>.auth.<region>.amazoncognito.com/oauth2/authorize
```

**Token Endpoint:**
```
https://<domain>.auth.<region>.amazoncognito.com/oauth2/token
```

**UserInfo Endpoint:**
```
https://<domain>.auth.<region>.amazoncognito.com/oauth2/userInfo
```

**OpenID Configuration:**
```
https://cognito-idp.<region>.amazonaws.com/<user-pool-id>/.well-known/openid-configuration
```

**JWKS Endpoint:**
```
https://cognito-idp.<region>.amazonaws.com/<user-pool-id>/.well-known/jwks.json
```

### Recommended Setup

1. Create user pool with MFA enabled
2. Configure custom domain with ACM certificate
3. Create confidential app client with client secret
4. Enable authorization code grant + client credentials grant
5. Configure PKCE for public clients
6. Enable refresh token rotation
7. Set short token expiration (15-60 minutes)
8. Create resource servers for API authorization
9. Integrate with API Gateway using Cognito authorizer
10. Implement proper token validation in backend

---

## Additional Resources

**AWS Documentation:**
- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [OAuth 2.0 Grants in Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html)
- [Using PKCE in Authorization Code Grants](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html)

**AWS Security Blog:**
- [How to use OAuth 2.0 in Amazon Cognito](https://aws.amazon.com/blogs/security/how-to-use-oauth-2-0-in-amazon-cognito-learn-about-the-different-oauth-2-0-grants/)
- [Monitor and secure machine-to-machine authorization](https://aws.amazon.com/blogs/security/how-to-monitor-optimize-and-secure-amazon-cognito-machine-to-machine-authorization/)

**OAuth 2.0 Specifications:**
- [RFC 6749 - OAuth 2.0 Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-04
**Author:** Claude (AI Assistant)
