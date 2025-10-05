# AWS Cognito OAuth 2.0 Quick Reference

**Date:** 2025-10-04

---

## Core Endpoints

```
Base URL: https://<domain>.auth.<region>.amazoncognito.com

Authorization:  /oauth2/authorize
Token:          /oauth2/token
UserInfo:       /oauth2/userInfo
Revoke:         /oauth2/revoke
Logout:         /logout

OIDC Discovery: https://cognito-idp.<region>.amazonaws.com/<pool-id>/.well-known/openid-configuration
JWKS:           https://cognito-idp.<region>.amazonaws.com/<pool-id>/.well-known/jwks.json
```

---

## Authorization Code Flow (with PKCE)

### Step 1: Authorization Request

```
GET /oauth2/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  scope=openid%20email%20profile&
  state=RANDOM_STATE&
  code_challenge=SHA256_BASE64URL_HASH&
  code_challenge_method=S256
```

### Step 2: Token Exchange

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=REDIRECT_URI&
code_verifier=ORIGINAL_CODE_VERIFIER
```

### Response

```json
{
  "access_token": "eyJraWQi...",
  "id_token": "eyJraWQi...",
  "refresh_token": "eyJjdHki...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## Client Credentials Flow (M2M)

### Token Request

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=client_credentials&
scope=resource-server/read%20resource-server/write
```

### Response

```json
{
  "access_token": "eyJraWQi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## Refresh Token Flow

### Token Refresh Request

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)

grant_type=refresh_token&
refresh_token=REFRESH_TOKEN&
client_id=CLIENT_ID
```

---

## UserInfo Endpoint

### Request

```http
GET /oauth2/userInfo
Authorization: Bearer ACCESS_TOKEN
```

### Response

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "email_verified": "true",
  "phone_number": "+1234567890",
  "phone_number_verified": "true",
  "username": "user123",
  "custom:organization": "my-company"
}
```

---

## OAuth Scopes

### Standard OIDC Scopes

- `openid` - Required for ID token (includes `sub`)
- `email` - Email address and email_verified
- `profile` - Name, picture, website, gender, birthdate, etc.
- `phone` - Phone number and phone_number_verified
- `address` - Address information

### AWS Cognito Reserved Scope

- `aws.cognito.signin.user.admin` - User pool API access

### Custom Scopes

Format: `resource-server-identifier/scope-name`

Examples:
- `my-api/read`
- `my-api/write`
- `photos/view`
- `photos/upload`

---

## CLI Commands

### Create User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name my-user-pool \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true}" \
  --auto-verified-attributes email \
  --region us-east-1
```

### Create App Client (Confidential)

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_ABC123456 \
  --client-name my-app \
  --generate-secret \
  --allowed-o-auth-flows authorization_code_grant client_credentials \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls https://app.example.com/callback \
  --allowed-o-auth-flows-user-pool-client \
  --region us-east-1
```

### Create Cognito Domain

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_ABC123456 \
  --domain my-app-domain \
  --region us-east-1
```

### Create Custom Domain

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_ABC123456 \
  --domain auth.example.com \
  --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --region us-east-1
```

### Create Resource Server

```bash
aws cognito-idp create-resource-server \
  --user-pool-id us-east-1_ABC123456 \
  --identifier my-api \
  --name "My API" \
  --scopes ScopeName=read,ScopeDescription="Read access" ScopeName=write,ScopeDescription="Write access" \
  --region us-east-1
```

---

## PKCE Implementation

### Generate Code Verifier and Challenge (JavaScript)

```javascript
// Generate random code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

// Base64URL encoding
function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Usage
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store code_verifier securely
sessionStorage.setItem('code_verifier', codeVerifier);

// Build authorization URL
const authUrl = `https://my-app.auth.us-east-1.amazoncognito.com/oauth2/authorize?` +
  `response_type=code&` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `scope=openid%20email%20profile&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256&` +
  `state=${randomState}`;
```

---

## Token Validation (Node.js)

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

// Usage
try {
  const decoded = await verifyToken(accessToken);
  console.log('User ID:', decoded.sub);
  console.log('Email:', decoded.email);
  console.log('Scopes:', decoded.scope);
} catch (error) {
  console.error('Token validation failed:', error);
}
```

---

## API Gateway Integration

### Create Cognito Authorizer

```bash
aws apigateway create-authorizer \
  --rest-api-id abc123 \
  --name Cognito-Authorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_ABC123456 \
  --identity-source method.request.header.Authorization
```

### Access User Info in Lambda

```javascript
exports.handler = async (event) => {
  // Get user claims from authorizer
  const userId = event.requestContext.authorizer.claims.sub;
  const email = event.requestContext.authorizer.claims.email;
  const username = event.requestContext.authorizer.claims['cognito:username'];
  const groups = event.requestContext.authorizer.claims['cognito:groups'];

  return {
    statusCode: 200,
    body: JSON.stringify({
      userId,
      email,
      username,
      groups
    })
  };
};
```

---

## Security Checklist

- ✅ Use Authorization Code Grant with PKCE for public clients
- ✅ Enable refresh token rotation
- ✅ Set short access token expiration (15-60 minutes)
- ✅ Store client secrets in AWS Secrets Manager
- ✅ Validate state parameter to prevent CSRF
- ✅ Verify JWT signature, expiration, issuer, and audience
- ✅ Use HTTPS for all redirect URIs (except localhost)
- ✅ Implement rate limiting and monitoring
- ✅ Request minimum required scopes (least privilege)
- ✅ Enable MFA for sensitive operations
- ✅ Configure advanced security features (compromised credentials)
- ✅ Implement proper logout (revoke refresh token)

---

## Common Issues & Solutions

### "Invalid client error"
- Check client ID is correct
- Verify client secret (if required)
- Ensure app client has OAuth enabled

### "Invalid redirect_uri error"
- Exact match required (including protocol, domain, path, trailing slash)
- Verify URI is whitelisted in app client callback URLs
- Must use HTTPS (except localhost)

### "Invalid scope error"
- Verify scope is enabled for app client
- Check custom scope format: `resource-server/scope-name`
- Ensure resource server exists

### "Token expired"
- Access token expired (default: 1 hour)
- Use refresh token to obtain new access token
- Check token expiration settings in app client

### "Unauthorized" (401)
- Missing or invalid Authorization header
- Token signature validation failed
- Token issuer doesn't match user pool

### "Forbidden" (403)
- Required scopes not present in access token
- User not in required Cognito group
- Custom authorization logic rejected request

---

## Resource Limits

**Token Sizes:**
- ID Token: ~2-4 KB
- Access Token: ~1-3 KB
- Authorization Header: Max 8 KB (API Gateway)

**Rate Limits (per account per region):**
- UserPoolSignIn: 120 requests/second
- GetUser: 120 requests/second
- Token endpoint: 200 requests/second

**User Pool Limits:**
- Max custom attributes: 50
- Max groups per user: 100
- Max app clients: 1,000
- Max resource servers: 25

---

## Cost Estimation

**Free Tier:** 50,000 MAUs (Monthly Active Users)

**Pricing (after free tier):**
- MAUs 50,001-100,000: $0.0055 per MAU
- MAUs > 100,000: $0.0046 per MAU

**Advanced Security:** Additional $0.05 per MAU

**Example:**
- 100,000 MAUs = $275/month
- 500,000 MAUs = $2,145/month
- 1,000,000 MAUs = $4,445/month

---

## Useful Links

**AWS Documentation:**
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [OAuth 2.0 Grants](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html)
- [PKCE Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html)

**Tools:**
- [JWT.io](https://jwt.io) - Decode and inspect tokens
- [AWS CLI Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/cognito-idp/)

**OAuth 2.0 Specs:**
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html)

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-10-04
