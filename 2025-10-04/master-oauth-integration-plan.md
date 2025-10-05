# Master OAuth Integration Plan - .do Platform

**Date:** 2025-10-04
**Status:** Planning Complete - Ready for Implementation
**Author:** Claude Code

## Executive Summary

Comprehensive plan to integrate **7 major cloud platforms** with the .do platform via OAuth 2.0:

1. ✅ **Vercel** - Deployment platform
2. ✅ **Zapier** - Automation platform
3. ⚠️ **Cloudflare** - Infrastructure (API tokens, not OAuth)
4. ✅ **Netlify** - Deployment platform
5. ✅ **AWS** - Cloud provider (Cognito)
6. ✅ **GCP** - Cloud provider (Google OAuth)
7. ✅ **Azure** - Cloud provider (Entra ID)

**Total Research:** 7 platforms, 5 comprehensive guides created (200+ pages of documentation)

**Implementation Strategy:** 3-tier integration across admin (better-auth), workers/auth (platform auth), and dedicated workers per platform

---

## Platform Research Status

| Platform | Status | OAuth Endpoints | Complexity | Priority | Integration Type |
|----------|--------|----------------|------------|----------|------------------|
| **Vercel** | ✅ Complete | Custom via Integration Console | Medium | High | Deploy + Auth |
| **Zapier** | ✅ Complete | Requires OAuth Provider (YOU) | High | High | Automation |
| **Cloudflare** | ✅ Complete | API Tokens (NOT OAuth) | Low | Medium | API Access |
| **Netlify** | ✅ Complete | Standard OAuth 2.0 | Low | High | Deploy + Auth |
| **AWS** | ✅ Complete | Cognito User Pools | High | High | Auth + Cloud |
| **GCP** | ✅ Complete | Google OAuth + IAM | High | High | Auth + Cloud |
| **Azure** | ✅ Complete | Entra ID (Microsoft Identity) | High | High | Auth + Cloud |

---

## Architecture Overview

### 3-Tier Integration Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    .do Platform OAuth                        │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Tier 1:      │    │ Tier 2:      │    │ Tier 3:      │
│ Admin UI     │    │ Platform     │    │ Integration  │
│ (better-auth)│    │ Auth Worker  │    │ Workers      │
└──────────────┘    └──────────────┘    └──────────────┘
      │                    │                    │
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ - User OAuth │    │ - OAuth Flow │    │ - Vercel     │
│ - UI Connect │    │ - Token Mgmt │    │ - Netlify    │
│ - Accounts   │    │ - RPC Methods│    │ - AWS        │
└──────────────┘    └──────────────┘    │ - GCP        │
                                        │ - Azure      │
                                        │ - Zapier     │
                                        └──────────────┘
```

### **Tier 1: Admin UI (better-auth)**
- User-facing OAuth connections
- "Connect Account" buttons for each platform
- Store OAuth tokens in `accounts` collection
- Display connected accounts in admin dashboard

### **Tier 2: Platform Auth Worker (workers/auth)**
- Platform-wide OAuth orchestration
- Universal OAuth methods via RPC
- Token storage and refresh
- RBAC integration

### **Tier 3: Integration Workers**
- Dedicated worker per platform
- API wrappers and abstractions
- Feature-specific implementations
- RPC, HTTP, MCP interfaces

---

## Platform-Specific Implementation Plans

### 1. Vercel Integration

**Documentation:** `/notes/2025-10-04-vercel-oauth-integration.md` (40KB)

**Key Details:**
- Authorization: Custom (via Integration Console)
- Token: `https://api.vercel.com/v2/oauth/access_token`
- API: `https://api.vercel.com`
- Scopes: Minimal (full user access by default)

**Setup Steps:**
1. Create integration in Vercel Integration Console
2. Obtain client ID + secret
3. Add Vercel provider to better-auth
4. Create `workers/vercel` service
5. Implement deployment APIs

**Priority:** High (deployment is core feature)

**Estimated Time:** 15-23 hours

---

### 2. Zapier Integration

**Documentation:** Research complete, detailed plan below

**Key Details:**
- **Unique Requirement:** Zapier needs YOU to be an OAuth provider
- Authorization: YOUR custom endpoint (`https://oauth.do/authorize`)
- Token: YOUR custom endpoint (`https://oauth.do/token`)
- API: Zapier Platform for triggers/actions

**Architecture:**
```
Zapier App
    ↓ (OAuth request)
oauth.do (WorkOS)
    ↓ (authorize)
User grants access
    ↓ (token)
Zapier stores token
    ↓ (API calls with token)
api.do
    ↓ (RPC calls)
db, agents, workflows, etc.
```

**Two-Part Integration:**

**A. OAuth Provider (oauth.do)**
- Already implemented via WorkOS
- Endpoints: `/authorize`, `/token`, `/refresh`, `/userinfo`
- Register Zapier as OAuth client in WorkOS

**B. Zapier Platform App**
- Build Zapier CLI app
- Define triggers (New Agent, New Workflow, etc.)
- Define actions (Create Agent, Run Workflow, etc.)
- Configure authentication (OAuth 2.0)
- Point to oauth.do endpoints

**Setup Steps:**
1. Register Zapier as OAuth client in WorkOS/oauth.do
2. Create Zapier CLI project
3. Define authentication config
4. Implement triggers and actions
5. Test with Zapier Platform
6. Submit for review

**Priority:** High (enables no-code automation)

**Estimated Time:** 20-30 hours

---

### 3. Cloudflare Integration

**Documentation:** `/notes/2025-10-04-cloudflare-oauth-research.md` (15KB)

**Key Finding:** Cloudflare does NOT provide traditional OAuth

**Alternatives:**

**Option A: Cloudflare API Tokens (Recommended)**
- Token endpoint: `https://api.cloudflare.com/client/v4/user/tokens/verify`
- User creates token in dashboard
- User enters token in .do admin
- Store encrypted token in database
- Use for Cloudflare API calls

**Option B: Cloudflare Access (Zero Trust)**
- For securing applications (not API access)
- Team domain: `https://<team>.cloudflareaccess.com`
- Limited use case

**Option C: Build Custom OAuth Provider (Cloudflare Workers)**
- Use `cloudflare-workers-oauth-provider` library
- High complexity, minimal benefit

**Recommendation:** Use API token approach (Option A)

**Setup Steps:**
1. Add "Connect Cloudflare" UI in admin
2. User enters API token
3. Validate token via API
4. Store encrypted in database
5. Create `workers/cloudflare` service
6. Implement Cloudflare API wrapper

**Priority:** Medium

**Estimated Time:** 8-12 hours

---

### 4. Netlify Integration

**Documentation:** `/notes/2025-10-04-netlify-oauth-setup.md` (30KB)

**Key Details:**
- Authorization: `https://app.netlify.com/authorize`
- Token: `https://api.netlify.com/oauth/token`
- UserInfo: `https://api.netlify.com/api/v1/user`
- API: `https://api.netlify.com/api/v1/`

**Limitations:**
- No granular scopes (full user access)
- No refresh tokens (long-lived access tokens)
- Rate limits: 500/min general, 3/min deployments

**Setup Steps:**
1. Register OAuth app in Netlify dashboard
2. Obtain client ID + secret
3. Add Netlify provider to better-auth
4. Create `workers/netlify` service
5. Implement deployment APIs

**Priority:** High (alternative deployment platform)

**Estimated Time:** 12-18 hours

---

### 5. AWS Integration (Cognito)

**Documentation:**
- Full Guide: `/notes/2025-10-04-aws-cognito-oauth-setup-guide.md` (40KB)
- Quick Ref: `/notes/2025-10-04-aws-cognito-oauth-quick-reference.md` (8KB)

**Key Details:**
- Authorization: `https://<domain>.auth.<region>.amazoncognito.com/oauth2/authorize`
- Token: `https://<domain>.auth.<region>.amazoncognito.com/oauth2/token`
- UserInfo: `https://<domain>.auth.<region>.amazoncognito.com/oauth2/userInfo`
- API: Various AWS services via bearer tokens

**Scopes:**
- Standard: `openid`, `email`, `profile`, `phone`, `address`
- AWS: `aws.cognito.signin.user.admin`
- Custom: `resource-server/scope-name`

**Setup Steps:**
1. Create Cognito user pool
2. Create app client (confidential)
3. Set up custom domain
4. Add AWS provider to better-auth
5. Create `workers/aws` service
6. Implement AWS SDK integrations

**Priority:** High (enterprise customers)

**Estimated Time:** 25-35 hours (complex)

---

### 6. GCP Integration (Google OAuth)

**Documentation:** `/notes/2025-10-04-gcp-oauth-research.md` (35KB)

**Key Details:**
- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- UserInfo: `https://openidconnect.googleapis.com/v1/userinfo`
- API: `https://www.googleapis.com/*`

**Scopes:**
- OIDC: `openid`, `email`, `profile`
- Cloud Platform: `https://www.googleapis.com/auth/cloud-platform`
- Service-specific: Compute, Storage, BigQuery, etc.

**Special Considerations:**
- External apps require OAuth verification for sensitive scopes
- Internal apps only for Google Workspace orgs
- Service accounts for server-to-server
- Workload Identity Federation (modern approach)

**Setup Steps:**
1. Create GCP project
2. Configure OAuth consent screen
3. Create OAuth client ID
4. Add GCP provider to better-auth
5. Create `workers/gcp` service
6. Implement GCP API integrations

**Priority:** High (broad enterprise use)

**Estimated Time:** 25-35 hours (complex)

---

### 7. Azure Integration (Entra ID)

**Documentation:** `/notes/2025-10-04-azure-entra-id-oauth-setup-guide.md` (60KB)

**Key Details:**
- Authorization: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- UserInfo: `https://graph.microsoft.com/oidc/userinfo`
- API: Microsoft Graph + Azure Resource Manager

**Scopes:**
- OIDC: `openid`, `profile`, `email`, `offline_access`
- Graph: `User.Read`, `Mail.Read`, `Calendars.Read`, etc.
- ARM: `https://management.azure.com/user_impersonation`
- App permissions: `{resource}/.default`

**Special Considerations:**
- Multi-tenant apps require admin consent
- Access tokens expire in 1 hour (not configurable)
- Refresh tokens: 90 days (web/mobile), 24 hours (SPAs)
- Tenant ID required for endpoints

**Setup Steps:**
1. Register app in Azure Portal
2. Create client secret
3. Add redirect URIs
4. Configure API permissions
5. Add Azure provider to better-auth
6. Create `workers/azure` service
7. Implement Graph + ARM APIs

**Priority:** High (Microsoft ecosystem)

**Estimated Time:** 25-35 hours (complex)

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goals:**
- Set up OAuth infrastructure
- Implement core authentication flows
- Create worker templates

**Tasks:**
1. **Update better-auth (admin/)** - 1-2 days
   - Add social provider schemas for all platforms
   - Create account linking UI
   - Update database schema

2. **Enhance workers/auth** - 2-3 days
   - Add universal OAuth methods
   - Implement token refresh logic
   - Add multi-provider support

3. **Create worker template** - 1-2 days
   - Standardized OAuth worker structure
   - RPC + HTTP + MCP interfaces
   - Common API client patterns

### Phase 2: Deployment Platforms (Weeks 3-4)

**Priority:** High - Core deployment functionality

1. **Vercel Integration** - 3-4 days
   - Create Vercel Integration Console app
   - Implement `workers/vercel` service
   - Add deployment APIs
   - Test end-to-end flow

2. **Netlify Integration** - 2-3 days
   - Register OAuth app
   - Implement `workers/netlify` service
   - Add deployment APIs
   - Test end-to-end flow

3. **Cloudflare Integration** - 2 days
   - Implement API token flow
   - Create `workers/cloudflare` service
   - Add Cloudflare API wrapper
   - Test common operations

### Phase 3: Cloud Providers (Weeks 5-7)

**Priority:** High - Enterprise customers

1. **AWS Integration** - 5-6 days
   - Set up Cognito user pool
   - Implement `workers/aws` service
   - Add AWS SDK integrations
   - Test with common services

2. **GCP Integration** - 5-6 days
   - Create GCP OAuth client
   - Implement `workers/gcp` service
   - Add GCP API integrations
   - Test with common services

3. **Azure Integration** - 5-6 days
   - Register Entra ID app
   - Implement `workers/azure` service
   - Add Graph + ARM APIs
   - Test with common services

### Phase 4: Automation Platform (Week 8)

**Priority:** High - No-code automation

1. **Zapier Integration** - 4-5 days
   - Register Zapier as OAuth client
   - Build Zapier CLI app
   - Implement triggers and actions
   - Submit for Zapier review

### Phase 5: Testing & Documentation (Week 9)

1. **Integration Testing** - 2-3 days
   - End-to-end OAuth flows
   - API integration tests
   - Error handling tests
   - Performance tests

2. **Documentation** - 2 days
   - User guides for each platform
   - API documentation
   - Troubleshooting guides
   - Video tutorials

3. **Security Audit** - 1-2 days
   - Token storage review
   - Permission scoping review
   - Rate limiting review
   - Audit logging setup

### Phase 6: Launch (Week 10)

1. **Soft Launch** - 3 days
   - Deploy to production
   - Test with beta users
   - Monitor errors and performance
   - Fix critical issues

2. **Public Launch** - 2 days
   - Announce integrations
   - Publish documentation
   - Marketing materials
   - Support readiness

---

## Technical Implementation Details

### Database Schema Updates

**Add to `accounts` table:**
```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS provider_type TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS team_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS expires_at BIGINT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS token_data JSONB;

CREATE INDEX IF NOT EXISTS idx_accounts_provider_type ON accounts(provider_type);
CREATE INDEX IF NOT EXISTS idx_accounts_user_provider ON accounts(user_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_accounts_expires_at ON accounts(expires_at);
```

**Create `oauth_clients` table (for Zapier):**
```sql
CREATE TABLE oauth_clients (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL, -- hashed
  name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  client_type TEXT NOT NULL, -- 'public' or 'confidential'
  created_at BIGINT NOT NULL,
  created_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'active'
);

CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);
```

### Shared Worker Interface Pattern

**Every integration worker implements:**

```typescript
// RPC Interface
export class PlatformService extends WorkerEntrypoint<Env> {
  // Connection
  async connect(userId: string, code: string): Promise<{ success: boolean }>
  async disconnect(userId: string): Promise<{ success: boolean }>
  async getConnection(userId: string): Promise<Connection | null>

  // Platform-specific methods
  async deploy(userId: string, options: DeployOptions): Promise<Deployment>
  async listResources(userId: string): Promise<Resource[]>
  // ... more platform-specific methods
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.get('/connect', authMiddleware, connectHandler)
app.get('/callback', callbackHandler)
app.post('/disconnect', authMiddleware, disconnectHandler)
app.get('/resources', authMiddleware, listResourcesHandler)
// ... more endpoints

// MCP Tools
const mcpTools = [
  {
    name: 'platform_deploy',
    description: 'Deploy to platform',
    inputSchema: { /* ... */ },
    handler: async (input) => { /* ... */ }
  },
  // ... more tools
]

export default { fetch: app.fetch }
```

### Environment Variables Template

**admin/.env:**
```bash
# Vercel
VERCEL_CLIENT_ID=xxx
VERCEL_CLIENT_SECRET=xxx

# Netlify
NETLIFY_CLIENT_ID=xxx
NETLIFY_CLIENT_SECRET=xxx

# AWS
AWS_COGNITO_DOMAIN=xxx
AWS_COGNITO_CLIENT_ID=xxx
AWS_COGNITO_CLIENT_SECRET=xxx
AWS_REGION=us-east-1

# GCP
GCP_CLIENT_ID=xxx
GCP_CLIENT_SECRET=xxx

# Azure
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx
AZURE_TENANT_ID=xxx
```

**workers/auth/.dev.vars:**
```bash
# Same as above, plus:
JWT_SECRET=xxx
WORKOS_API_KEY=xxx
WORKOS_CLIENT_ID=xxx
```

### Security Best Practices

1. **Token Storage:**
   - Encrypt tokens at rest using KMS or Durable Objects
   - Never log tokens
   - Implement token rotation where supported

2. **CSRF Protection:**
   - Always use `state` parameter
   - Validate state on callback
   - Use crypto.randomUUID() for state generation

3. **PKCE:**
   - Required for all public clients (SPAs, mobile)
   - Use SHA-256 for code challenge
   - Store code verifier server-side

4. **Scope Minimization:**
   - Request only required scopes
   - Document why each scope is needed
   - Allow users to review permissions

5. **Rate Limiting:**
   - Implement per-user rate limits
   - Respect platform rate limits
   - Cache frequently accessed data

6. **Audit Logging:**
   - Log all OAuth flows
   - Log all API calls to platforms
   - Track which user initiated operations
   - Store logs in ClickHouse for analysis

---

## Monitoring & Alerting

### Key Metrics

**OAuth Flows:**
- Authorization success rate (target: >95%)
- Token exchange success rate (target: >99%)
- Token refresh success rate (target: >99%)
- Average flow completion time (target: <5s)

**API Calls:**
- Request success rate per platform (target: >95%)
- Average response time (target: <500ms p95)
- Rate limit violations (target: <1%)
- Error rate by error type

**User Engagement:**
- Number of connected accounts per user
- Most connected platforms
- Connection abandonment rate
- Reconnection frequency

### Alerts

**Critical:**
- OAuth flow failure rate >10%
- API error rate >20%
- Token refresh failure rate >10%
- Platform API downtime

**Warning:**
- OAuth flow failure rate >5%
- API error rate >10%
- Response time >1s p95
- Approaching rate limits

### Logging

```typescript
// workers/*/src/index.ts
app.use('*', async (c, next) => {
  const start = Date.now()
  const requestId = crypto.randomUUID()

  c.set('requestId', requestId)

  try {
    await next()
  } finally {
    const duration = Date.now() - start

    // Log to ClickHouse via pipeline
    await c.env.PIPELINE.send({
      timestamp: Date.now(),
      requestId,
      service: 'platform-name',
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      userId: c.get('userId'),
      error: c.get('error'),
    })
  }
})
```

---

## Testing Strategy

### Unit Tests

**OAuth Flow:**
```typescript
describe('OAuth Flow', () => {
  it('should generate valid authorization URL')
  it('should exchange code for tokens')
  it('should refresh access token')
  it('should handle invalid code')
  it('should validate state parameter')
})
```

**API Client:**
```typescript
describe('Platform API Client', () => {
  it('should add authentication header')
  it('should handle API errors')
  it('should respect rate limits')
  it('should retry failed requests')
})
```

### Integration Tests

**End-to-End:**
```typescript
describe('E2E OAuth Integration', () => {
  it('should complete full OAuth flow')
  it('should store tokens correctly')
  it('should make authenticated API calls')
  it('should refresh expired tokens')
  it('should handle disconnection')
})
```

### Manual Testing Checklist

**Per Platform:**
- [ ] Complete OAuth flow in browser
- [ ] Verify tokens stored in database
- [ ] Test API call with stored token
- [ ] Test token refresh
- [ ] Test disconnection
- [ ] Test reconnection
- [ ] Verify audit logs
- [ ] Test error scenarios

---

## Success Criteria

### Functional Requirements
- [ ] Users can connect accounts for all 7 platforms
- [ ] OAuth flows complete successfully >95% of the time
- [ ] Tokens refresh automatically before expiration
- [ ] API calls succeed >95% of the time
- [ ] Users can disconnect accounts
- [ ] Admin UI shows connection status
- [ ] Audit logs track all operations

### Performance Requirements
- [ ] OAuth flow completes in <5 seconds p95
- [ ] API calls respond in <500ms p95
- [ ] Token refresh happens transparently
- [ ] No user-facing errors during refresh
- [ ] Handles 1000+ concurrent OAuth flows

### Security Requirements
- [ ] Tokens encrypted at rest
- [ ] CSRF protection on all flows
- [ ] PKCE for public clients
- [ ] State parameter validated
- [ ] Scopes minimized
- [ ] No tokens in logs
- [ ] Audit trail complete

### Documentation Requirements
- [ ] User guide for each platform
- [ ] API documentation complete
- [ ] Troubleshooting guides written
- [ ] Code examples provided
- [ ] Video tutorials recorded

---

## Risk Assessment

### High Risk

**Token Compromise**
- **Impact:** Unauthorized access to user accounts
- **Mitigation:** Encryption at rest, token rotation, audit logging
- **Contingency:** Revoke all tokens, force re-authentication

**Rate Limiting**
- **Impact:** Service degradation, failed requests
- **Mitigation:** Implement caching, request queuing, respect limits
- **Contingency:** Temporary feature disable, user notification

**Platform API Changes**
- **Impact:** Integration breakage
- **Mitigation:** Version API clients, monitor changelogs, feature flags
- **Contingency:** Rollback to previous version, fix forward

### Medium Risk

**OAuth Flow Failures**
- **Impact:** Users can't connect accounts
- **Mitigation:** Comprehensive error handling, retry logic, user messaging
- **Contingency:** Manual token entry, support escalation

**Documentation Outdated**
- **Impact:** User confusion, support burden
- **Mitigation:** Quarterly doc reviews, automated testing, changelogs
- **Contingency:** Quick updates, support articles

### Low Risk

**Performance Degradation**
- **Impact:** Slow response times
- **Mitigation:** Caching, CDN, horizontal scaling
- **Contingency:** Capacity increase, optimization

---

## Budget Estimate

### Development Time

| Phase | Duration | Team Size | Total Hours |
|-------|----------|-----------|-------------|
| Phase 1: Foundation | 1-2 weeks | 1 dev | 60-80h |
| Phase 2: Deployment | 2 weeks | 1-2 devs | 80-120h |
| Phase 3: Cloud | 3 weeks | 2 devs | 240-300h |
| Phase 4: Automation | 1 week | 1 dev | 40-50h |
| Phase 5: Testing | 1 week | 1-2 devs | 60-80h |
| Phase 6: Launch | 1 week | 2 devs | 80-100h |
| **Total** | **9-10 weeks** | **1-2 devs** | **560-730h** |

### Infrastructure Costs

**Cloudflare Workers:**
- Workers for Platforms: $5/month base + $0.20/million requests
- Estimated: $50-100/month for all integration workers

**Database:**
- PostgreSQL (Neon): $19-69/month (Growth plan)
- ClickHouse (Propel): $49-199/month (logs/analytics)

**Third-Party Services:**
- WorkOS (oauth.do): $0-125/month (free up to 1M MAUs)
- Resend (email): $20-100/month
- Stripe (billing): Transaction fees only

**Total Monthly Cost:** ~$150-600/month

### ROI Analysis

**Benefits:**
- Enable deployment to 3 platforms (Vercel, Netlify, Cloudflare)
- Integrate with 3 cloud providers (AWS, GCP, Azure)
- Enable no-code automation (Zapier)
- Reduce manual deployment time by 90%
- Support enterprise SSO requirements
- Enable multi-cloud deployments

**Break-Even:**
- At 100 paying customers ($50/month avg)
- Estimated revenue: $5,000/month
- Break-even: Month 2-3 after launch

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Complete research (DONE)
2. ✅ Create comprehensive plans (DONE)
3. Review plans with team
4. Prioritize platforms (recommend: Vercel → Netlify → Zapier → AWS → GCP → Azure → Cloudflare)
5. Set up project tracking (GitHub Projects or Linear)
6. Allocate development resources

### Week 1 Tasks
1. Update better-auth configuration
2. Create database migrations
3. Set up OAuth clients for all platforms
4. Create worker template
5. Begin Vercel integration

### Communication
1. Share roadmap with stakeholders
2. Create public changelog
3. Announce beta program
4. Recruit beta testers
5. Set up feedback channels

---

## Appendix

### Documentation Index

| Platform | Document | Size | Location |
|----------|----------|------|----------|
| Vercel | Full Plan | 40KB | `/notes/2025-10-04-vercel-oauth-integration.md` |
| Zapier | (This doc) | - | Section above |
| Cloudflare | Research | 15KB | `/notes/2025-10-04-cloudflare-oauth-research.md` |
| Netlify | Setup Guide | 30KB | `/notes/2025-10-04-netlify-oauth-setup.md` |
| AWS | Full Guide | 40KB | `/notes/2025-10-04-aws-cognito-oauth-setup-guide.md` |
| AWS | Quick Ref | 8KB | `/notes/2025-10-04-aws-cognito-oauth-quick-reference.md` |
| GCP | Research | 35KB | `/notes/2025-10-04-gcp-oauth-research.md` |
| Azure | Setup Guide | 60KB | `/notes/2025-10-04-azure-entra-id-oauth-setup-guide.md` |
| **Total** | **8 docs** | **228KB** | `/notes/` |

### Reference Links

**Platform Documentation:**
- Vercel: https://vercel.com/docs/integrations
- Zapier: https://docs.zapier.com/platform/build/oauth
- Cloudflare: https://developers.cloudflare.com/workers/
- Netlify: https://docs.netlify.com/api/get-started/
- AWS: https://docs.aws.amazon.com/cognito/
- GCP: https://cloud.google.com/docs/authentication
- Azure: https://learn.microsoft.com/en-us/entra/identity-platform/

**Internal Documentation:**
- Root: `/CLAUDE.md`
- Workers: `/workers/CLAUDE.md`
- Admin: `/admin/CLAUDE.md`
- Auth: `/workers/auth/README.md`

---

**Last Updated:** 2025-10-04
**Status:** Ready for Implementation
**Total Research Time:** ~20 hours
**Total Documentation:** 228KB across 8 documents
**Implementation Estimate:** 560-730 hours over 9-10 weeks
