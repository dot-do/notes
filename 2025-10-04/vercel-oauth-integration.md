# Vercel OAuth Integration Plan

**Date:** 2025-10-04
**Status:** Planning
**Author:** Claude Code

## Overview

Integrate Vercel OAuth with the .do platform to enable users to authenticate with their Vercel accounts and deploy applications directly to Vercel through the platform.

## Research Summary

### Vercel OAuth Flow

**Authorization Endpoint:** Create via Integration Console
**Token Endpoint:** `https://api.vercel.com/v2/oauth/access_token`
**API Base URL:** `https://api.vercel.com`

**OAuth 2.0 Flow:**
1. User clicks "Sign in with Vercel" or "Deploy to Vercel"
2. Redirect to Vercel authorization page
3. User authorizes the .do integration
4. Vercel redirects back with authorization code
5. Exchange code for access token via POST to token endpoint
6. Use access token to call Vercel API on behalf of user

**Required Parameters for Token Exchange:**
- `code` - Authorization code from callback
- `client_id` - Vercel client ID
- `client_secret` - Vercel client secret
- `redirect_uri` - Callback URL (must match registered URL)

### Vercel Integration Setup

**Steps to Create Integration:**
1. Go to Vercel Dashboard → Integrations tab
2. Click "Integrations Console" → "Create"
3. Fill out integration form:
   - Integration Name: ".do Platform"
   - URL Slug: "dotdo"
   - Developer Name: "Nathan Clevenger"
   - Contact Emails
   - Short Description
   - Logo
   - Category: "Deployment"
   - Website: https://do.ing
   - Documentation: https://docs.do
   - Privacy Policy: https://do.ing/privacy
4. Set Redirect URL: `https://admin.do/api/auth/callback/vercel` (or `https://oauth.do/callback/vercel`)
5. Set Configuration URL (if needed): `https://admin.do/integrations/vercel/configure`
6. Create at least one product (can be free tier)
7. Accept Vercel's terms
8. Wait for approval

**Credentials:**
- Client ID: Provided after integration creation
- Client Secret: Provided after integration creation

### Vercel API Access

**Authentication Header:**
```
Authorization: Bearer <access_token>
```

**Key Endpoints:**
- `GET /v9/projects` - List user's projects
- `POST /v13/deployments` - Create deployment
- `GET /v13/deployments/:id` - Get deployment status
- `GET /v6/teams` - List user's teams
- `GET /v4/domains` - List domains

## Current .do Auth Architecture

### admin/ (Payload CMS)

**Tech:** better-auth v1.3.0
**Database:** PostgreSQL via better-auth/adapters/postgres
**Current OAuth:** Custom oauth.do provider

**Configuration Location:** `admin/src/lib/better-auth.ts`

**Collections:**
- `users` - User accounts
- `sessions` - Active sessions
- `accounts` - OAuth accounts (oauth.do)
- `verifications` - Email verification tokens
- `tenants` - Multi-tenant workspaces

### workers/auth (Microservice)

**Tech:** WorkOS SDK
**Purpose:** Platform-wide authentication service
**Interfaces:** RPC, HTTP, MCP

**Features:**
- OAuth 2.0 & SSO (Google, Microsoft, GitHub)
- API key management
- JWT session management
- RBAC

**Configuration Location:** `workers/auth/src/workos.ts`

## Integration Strategy

### Architecture Decision

We'll implement Vercel OAuth at **three levels**:

1. **admin/ (better-auth)** - For CMS users to connect Vercel accounts
2. **workers/auth** - For platform-wide Vercel authentication
3. **New: workers/vercel** - Dedicated Vercel API integration service

### 1. Admin Integration (better-auth)

**Goal:** Allow admin users to connect their Vercel accounts for deployments.

**Implementation:**
- Add Vercel as a social provider in better-auth
- Store Vercel access tokens in `accounts` collection
- Link Vercel account to user in admin UI

**File:** `admin/src/lib/better-auth.ts`

```typescript
socialProviders: {
  oauth: { /* existing oauth.do */ },
  vercel: {
    clientId: process.env.VERCEL_CLIENT_ID!,
    clientSecret: process.env.VERCEL_CLIENT_SECRET!,
    authorizationUrl: 'https://vercel.com/oauth/authorize',
    tokenUrl: 'https://api.vercel.com/v2/oauth/access_token',
    userInfoUrl: 'https://api.vercel.com/v2/user',
    scope: 'deployment project team',
  },
}
```

**Callback Route:** `admin/src/app/api/auth/callback/vercel/route.ts`

**Environment Variables:**
```bash
VERCEL_CLIENT_ID=<from-vercel-integration-console>
VERCEL_CLIENT_SECRET=<from-vercel-integration-console>
```

### 2. Workers Auth Integration

**Goal:** Platform-wide Vercel authentication for API services.

**Implementation:**
- Add Vercel OAuth methods to `WorkersService` RPC interface
- Store Vercel tokens in database via db service
- Support OAuth flow for external applications

**Files:**
- `workers/auth/src/oauth-universal.ts` - Add Vercel provider
- `workers/auth/src/oauth-endpoints.ts` - Add Vercel endpoints
- `workers/auth/src/index.ts` - Add Vercel RPC methods

**New RPC Methods:**
```typescript
export class AuthService extends WorkerEntrypoint<Env> {
  // Get Vercel OAuth authorization URL
  async getVercelAuthUrl(redirectUri?: string): Promise<string>

  // Exchange code for Vercel tokens
  async exchangeVercelCode(code: string): Promise<{
    accessToken: string
    userId: string
    teamId?: string
  }>

  // Refresh Vercel access token (if supported)
  async refreshVercelToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
  }>
}
```

**HTTP Endpoints:**
- `GET /vercel/authorize` - Initiate OAuth flow
- `GET /vercel/callback` - Handle callback
- `POST /vercel/refresh` - Refresh token (if supported)

**Database Schema:**
Add to existing `accounts` table:
```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS provider_type TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS team_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS refresh_token TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_provider_type ON accounts(provider_type);
```

### 3. New: workers/vercel Service

**Goal:** Dedicated Vercel API integration for deployments and management.

**Purpose:**
- Deploy projects to Vercel
- Manage domains
- Check deployment status
- List projects and teams
- Proxy Vercel API with authentication

**Architecture:**
```
Client Request
      ↓
┌──────────────┐
│   Gateway    │ ◄── Routes /api/vercel/*
└──────┬───────┘
       │ RPC
       ▼
┌──────────────┐
│    Vercel    │ ◄── Vercel API service
│   Service    │
└──────┬───────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌─────┐
│ DB  │  │ Auth│
└─────┘  └─────┘
```

**RPC Interface:**
```typescript
export class VercelService extends WorkerEntrypoint<Env> {
  // Projects
  async listProjects(userId: string): Promise<Project[]>
  async getProject(userId: string, projectId: string): Promise<Project>

  // Deployments
  async createDeployment(userId: string, options: DeploymentOptions): Promise<Deployment>
  async getDeployment(userId: string, deploymentId: string): Promise<Deployment>
  async listDeployments(userId: string, projectId?: string): Promise<Deployment[]>

  // Domains
  async listDomains(userId: string): Promise<Domain[]>
  async addDomain(userId: string, projectId: string, domain: string): Promise<Domain>

  // Teams
  async listTeams(userId: string): Promise<Team[]>
}
```

**HTTP API:**
```
POST /deploy                    - Create deployment
GET /projects                   - List projects
GET /projects/:id               - Get project
GET /deployments                - List deployments
GET /deployments/:id            - Get deployment
GET /domains                    - List domains
POST /domains                   - Add domain
GET /teams                      - List teams
```

**MCP Tools:**
```typescript
[
  {
    name: 'vercel_deploy',
    description: 'Deploy a project to Vercel',
    inputSchema: { /* ... */ },
  },
  {
    name: 'vercel_list_projects',
    description: 'List Vercel projects',
    inputSchema: { /* ... */ },
  },
  // ... more tools
]
```

**File Structure:**
```
workers/vercel/
├── src/
│   ├── index.ts              # Main entrypoint (RPC + HTTP)
│   ├── api.ts                # Vercel API client
│   ├── deployments.ts        # Deployment logic
│   ├── projects.ts           # Project management
│   ├── domains.ts            # Domain management
│   ├── teams.ts              # Team management
│   ├── mcp.ts                # MCP tools
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Helper functions
├── tests/
│   ├── api.test.ts
│   ├── deployments.test.ts
│   └── projects.test.ts
├── wrangler.jsonc
├── package.json
└── README.md
```

**wrangler.jsonc:**
```jsonc
{
  "name": "vercel",
  "main": "src/index.ts",
  "compatibility_date": "2025-07-08",
  "observability": {
    "enabled": true
  },
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" }
  ],
  "vars": {
    "VERCEL_API_BASE": "https://api.vercel.com"
  }
}
```

**Environment Variables:**
```bash
VERCEL_CLIENT_ID=<client-id>
VERCEL_CLIENT_SECRET=<client-secret>
```

## Implementation Steps

### Phase 1: Setup Vercel Integration

**Estimated Time:** 1-2 hours

1. **Create Vercel Integration:**
   - [ ] Go to Vercel Integrations Console
   - [ ] Fill out integration form
   - [ ] Set redirect URLs:
     - Primary: `https://admin.do/api/auth/callback/vercel`
     - Secondary: `https://oauth.do/callback/vercel`
   - [ ] Create free tier product
   - [ ] Submit for approval
   - [ ] Obtain client ID and secret

2. **Add Environment Variables:**
   ```bash
   # admin/.env
   VERCEL_CLIENT_ID=xxx
   VERCEL_CLIENT_SECRET=xxx

   # workers/auth/.dev.vars
   VERCEL_CLIENT_ID=xxx
   VERCEL_CLIENT_SECRET=xxx
   ```

3. **Update wrangler secrets:**
   ```bash
   cd workers/auth
   wrangler secret put VERCEL_CLIENT_ID
   wrangler secret put VERCEL_CLIENT_SECRET
   ```

### Phase 2: Admin Integration (better-auth)

**Estimated Time:** 2-3 hours

1. **Add Vercel Provider:**
   - [ ] Edit `admin/src/lib/better-auth.ts`
   - [ ] Add Vercel to `socialProviders`
   - [ ] Configure authorization/token URLs
   - [ ] Set appropriate scopes

2. **Create Callback Route:**
   - [ ] Create `admin/src/app/api/auth/callback/vercel/route.ts`
   - [ ] Handle OAuth callback
   - [ ] Store Vercel tokens in `accounts` collection
   - [ ] Link to user account

3. **Add Admin UI:**
   - [ ] Add "Connect Vercel" button in admin
   - [ ] Show connected Vercel accounts
   - [ ] Add "Disconnect" functionality
   - [ ] Display user's Vercel projects

4. **Test:**
   - [ ] Start admin dev server
   - [ ] Navigate to /admin
   - [ ] Click "Connect Vercel"
   - [ ] Complete OAuth flow
   - [ ] Verify account stored in database
   - [ ] Verify access token works

### Phase 3: Workers Auth Integration

**Estimated Time:** 3-4 hours

1. **Add Vercel OAuth Provider:**
   - [ ] Edit `workers/auth/src/oauth-universal.ts`
   - [ ] Add Vercel provider configuration
   - [ ] Implement token exchange
   - [ ] Add token refresh (if supported by Vercel)

2. **Add RPC Methods:**
   - [ ] Edit `workers/auth/src/index.ts`
   - [ ] Add `getVercelAuthUrl()` method
   - [ ] Add `exchangeVercelCode()` method
   - [ ] Add `refreshVercelToken()` method (if applicable)

3. **Add HTTP Endpoints:**
   - [ ] Edit `workers/auth/src/oauth-endpoints.ts`
   - [ ] Add `GET /vercel/authorize` endpoint
   - [ ] Add `GET /vercel/callback` endpoint
   - [ ] Add `POST /vercel/refresh` endpoint

4. **Update Database:**
   - [ ] Add migration for `accounts` table
   - [ ] Add `provider_type` column
   - [ ] Add `team_id` column
   - [ ] Add `refresh_token` column
   - [ ] Create indexes

5. **Write Tests:**
   - [ ] Test OAuth URL generation
   - [ ] Test code exchange
   - [ ] Test token storage
   - [ ] Test token refresh

6. **Deploy:**
   ```bash
   cd workers/auth
   pnpm test
   pnpm deploy
   ```

### Phase 4: Create workers/vercel Service

**Estimated Time:** 6-8 hours

1. **Create Service Structure:**
   ```bash
   cd workers
   mkdir vercel
   cd vercel
   pnpm init
   ```

2. **Install Dependencies:**
   ```bash
   pnpm add hono zod
   pnpm add -D @cloudflare/workers-types vitest
   ```

3. **Create wrangler.jsonc:**
   - [ ] Basic config
   - [ ] Add service bindings (DB, AUTH)
   - [ ] Add secrets

4. **Implement Vercel API Client:**
   - [ ] Create `src/api.ts`
   - [ ] Implement API request wrapper
   - [ ] Add authentication header injection
   - [ ] Add error handling
   - [ ] Add rate limiting

5. **Implement Core Features:**
   - [ ] `src/projects.ts` - Project management
   - [ ] `src/deployments.ts` - Deployment creation and status
   - [ ] `src/domains.ts` - Domain management
   - [ ] `src/teams.ts` - Team management

6. **Implement RPC Interface:**
   - [ ] Create `src/index.ts`
   - [ ] Extend `WorkerEntrypoint`
   - [ ] Add RPC methods for all features
   - [ ] Add proper error handling

7. **Implement HTTP API:**
   - [ ] Add Hono routes
   - [ ] Add authentication middleware
   - [ ] Add request validation (Zod)
   - [ ] Add response formatting

8. **Implement MCP Tools:**
   - [ ] Create `src/mcp.ts`
   - [ ] Define tool schemas
   - [ ] Implement tool handlers
   - [ ] Add to MCP tool registry

9. **Write Tests:**
   - [ ] Unit tests for API client
   - [ ] Integration tests for RPC methods
   - [ ] Integration tests for HTTP endpoints
   - [ ] Mock Vercel API responses

10. **Write Documentation:**
    - [ ] README.md with examples
    - [ ] API documentation
    - [ ] RPC method documentation
    - [ ] MCP tool documentation

11. **Deploy:**
    ```bash
    pnpm test
    pnpm deploy
    ```

### Phase 5: Integration Testing

**Estimated Time:** 2-3 hours

1. **End-to-End OAuth Flow:**
   - [ ] User signs in to admin
   - [ ] User connects Vercel account
   - [ ] Tokens stored correctly
   - [ ] User can deploy via admin UI

2. **API Integration:**
   - [ ] API service can call vercel service
   - [ ] Gateway routes to vercel service
   - [ ] Authentication works correctly
   - [ ] Rate limiting works

3. **MCP Integration:**
   - [ ] MCP server exposes Vercel tools
   - [ ] Tools work correctly
   - [ ] Authentication passed through
   - [ ] Error handling works

### Phase 6: Documentation

**Estimated Time:** 1-2 hours

1. **Update Documentation:**
   - [ ] Update root CLAUDE.md
   - [ ] Update workers/CLAUDE.md
   - [ ] Update admin/CLAUDE.md
   - [ ] Create workers/vercel/README.md
   - [ ] Add examples to docs

2. **Write User Guide:**
   - [ ] How to connect Vercel account
   - [ ] How to deploy to Vercel
   - [ ] How to manage deployments
   - [ ] Troubleshooting guide

## Security Considerations

### Token Storage

**Encryption:**
- Store Vercel access tokens encrypted in database
- Use environment-specific encryption keys
- Implement token rotation if Vercel supports refresh tokens

**Access Control:**
- Only allow users to access their own Vercel tokens
- Implement RBAC for deployment operations
- Admin users can manage all integrations

### API Security

**Rate Limiting:**
- Implement rate limiting on Vercel API calls
- Cache frequently accessed data (projects, teams)
- Respect Vercel's rate limits

**Validation:**
- Validate all inputs with Zod schemas
- Sanitize deployment payloads
- Prevent malicious deployments

**Audit Logging:**
- Log all deployment operations
- Log all API calls to Vercel
- Track which user initiated each operation

## Testing Strategy

### Unit Tests

```typescript
// workers/vercel/tests/api.test.ts
describe('Vercel API Client', () => {
  it('should construct correct API URL', () => {})
  it('should add authentication header', () => {})
  it('should handle API errors', () => {})
  it('should respect rate limits', () => {})
})
```

### Integration Tests

```typescript
// workers/vercel/tests/deployments.test.ts
describe('Deployment Service', () => {
  it('should create deployment with valid token', () => {})
  it('should reject deployment with invalid token', () => {})
  it('should check deployment status', () => {})
  it('should list user deployments', () => {})
})
```

### E2E Tests

```typescript
// admin/tests/e2e/vercel.test.ts
describe('Vercel Integration', () => {
  it('should complete OAuth flow', () => {})
  it('should store tokens correctly', () => {})
  it('should deploy project via admin UI', () => {})
  it('should show deployment status', () => {})
})
```

## Deployment Checklist

### Prerequisites

- [ ] Vercel integration approved
- [ ] Client ID and secret obtained
- [ ] Environment variables set
- [ ] Database migrations run

### Admin Deployment

```bash
cd admin
pnpm install
pnpm build
vercel --prod
```

### Workers Deployment

```bash
cd workers/auth
pnpm test
pnpm deploy

cd ../vercel
pnpm test
pnpm deploy
```

### Gateway Configuration

Add Vercel service to gateway routing:

```typescript
// workers/gateway/src/index.ts
if (url.pathname.startsWith('/api/vercel/')) {
  return env.VERCEL_SERVICE.fetch(request)
}
```

### Post-Deployment

- [ ] Test OAuth flow in production
- [ ] Test deployment creation
- [ ] Monitor logs for errors
- [ ] Set up alerting for failures

## Monitoring

### Metrics to Track

- OAuth flow success rate
- Deployment success rate
- API response times
- Error rates
- Token refresh failures (if applicable)

### Logging

```typescript
// workers/vercel/src/index.ts
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  console.log({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    userId: c.get('userId'),
  })
})
```

### Alerts

- Alert on OAuth failure rate > 5%
- Alert on deployment failure rate > 10%
- Alert on API error rate > 5%
- Alert on token refresh failures

## Future Enhancements

### Phase 7: Advanced Features

1. **Automatic Deployments:**
   - Deploy on git push
   - Preview deployments for PRs
   - Production deployments on merge

2. **Deployment Management:**
   - Rollback to previous deployment
   - Pause/resume deployments
   - Delete deployments

3. **Environment Variables:**
   - Sync env vars to Vercel
   - Manage production/preview secrets
   - Environment variable versioning

4. **Domain Management:**
   - Automatic domain configuration
   - SSL certificate management
   - DNS record management

5. **Analytics:**
   - Deployment analytics dashboard
   - Performance metrics
   - Error tracking

6. **Multi-tenant:**
   - Team-based deployments
   - Organization-scoped tokens
   - Role-based deployment permissions

## References

### Vercel Documentation

- OAuth 2.0 Guide: https://vercel.com/docs/integrations/sign-in-with-vercel
- REST API: https://vercel.com/docs/rest-api
- Integrations: https://vercel.com/docs/integrations
- Creating Integrations: https://vercel.com/docs/integrations/create-integration

### Internal Documentation

- Root CLAUDE.md: `/CLAUDE.md`
- Workers CLAUDE.md: `/workers/CLAUDE.md`
- Admin CLAUDE.md: `/admin/CLAUDE.md`
- Auth Worker README: `/workers/auth/README.md`

### Code Examples

- better-auth social providers: https://better-auth.com/docs/authentication/social
- WorkOS OAuth: https://workos.com/docs/reference/user-management/authentication/oauth
- Hono middleware: https://hono.dev/docs/guides/middleware

## Risks and Mitigations

### Risk: Vercel Integration Not Approved

**Mitigation:**
- Apply early with complete integration details
- Ensure integration provides clear value
- Follow all Vercel guidelines

### Risk: Token Expiration

**Mitigation:**
- Implement token refresh if Vercel supports it
- Prompt user to re-authenticate if token invalid
- Store token expiry time and check before API calls

### Risk: Rate Limiting

**Mitigation:**
- Implement caching for frequently accessed data
- Add request queuing for burst traffic
- Respect Vercel's rate limits
- Show clear error messages to users

### Risk: API Changes

**Mitigation:**
- Version API client code
- Monitor Vercel changelog
- Implement backwards compatibility
- Add feature flags for new features

## Success Criteria

- [ ] Users can sign in with Vercel OAuth
- [ ] Users can deploy projects to Vercel from admin UI
- [ ] Deployments succeed >95% of the time
- [ ] OAuth flow completes <10s
- [ ] API response times <500ms p95
- [ ] Zero security vulnerabilities
- [ ] Comprehensive test coverage (>80%)
- [ ] Complete documentation
- [ ] Production deployment successful

## Timeline

**Total Estimated Time:** 15-23 hours

- Phase 1: Setup (1-2h)
- Phase 2: Admin (2-3h)
- Phase 3: Workers Auth (3-4h)
- Phase 4: Workers Vercel (6-8h)
- Phase 5: Integration Testing (2-3h)
- Phase 6: Documentation (1-2h)

**Target Completion:** 3-5 business days

---

**Next Steps:**
1. Review plan with team
2. Create Vercel integration in console
3. Begin Phase 1 implementation
4. Update this document with progress

**Last Updated:** 2025-10-04
**Status:** Ready for Implementation
