# Universal API Layer - Phase 7 Architecture

**Date:** 2025-10-04
**Status:** 🔄 Design Phase
**Estimated Effort:** 2-3 days

## Vision

Enable developers to call **any external API** using natural method names, with AI generating implementation code on-the-fly and handling OAuth flows automatically.

**User Experience:**
```typescript
import { createRpcClient, createRpcProxy } from 'apis.do'

const client = createRpcClient({ baseUrl: 'https://api.do' })
const $ = createRpcProxy(client)

// Call Stripe API (no integration code needed!)
const payment = await $.api.stripe.createPaymentIntent({
  amount: 1000,
  currency: 'usd',
  customer: 'cus_123',
})

// AI automatically:
// 1. Recognizes this is Stripe API
// 2. Checks if OAuth token exists for Stripe
// 3. If missing, returns OAuth prompt URL
// 4. Once authorized, generates code to call Stripe API
// 5. Caches generated code for future calls
// 6. Executes and returns result

// Call GitHub API
const repo = await $.api.github.createRepository({
  name: 'my-new-repo',
  private: true,
})

// Call any API!
const weather = await $.api.openweather.getCurrentWeather({
  city: 'San Francisco',
})
```

## Architecture Overview

```
User Code: $.api.stripe.createPaymentIntent(args)
    ↓
RPC Proxy (detects api.* namespace)
    ↓
Universal API Handler
    ↓
1. Analyze Request
   ├─> AI Worker: analyzeIntegrationRequirements(method, args)
   └─> Returns: { provider: 'stripe', requiresOAuth: true, scopes: ['payments'] }
    ↓
2. Check OAuth Token
   ├─> Auth Worker: getOAuthToken('stripe', userId)
   └─> If missing: return { needsOAuth: true, authUrl: '...' }
    ↓
3. Generate/Retrieve Code
   ├─> Check Cache: generated_api_code table
   ├─> If cached: use existing code
   └─> If not cached:
       ├─> AI Worker: generateAPICode(provider, method, args, apiDocs)
       └─> Store in cache
    ↓
4. Execute Code
   ├─> Code Execution Sandbox
   ├─> Inject OAuth token
   ├─> Enforce timeout (10s)
   └─> Enforce domain whitelist
    ↓
5. Return Result
   └─> Log execution to database
```

## Database Schema

### 1. Integration Registry

```sql
CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  base_url TEXT NOT NULL,
  api_docs_url TEXT,
  oauth_config JSON, -- { authUrl, tokenUrl, scopes, clientId }
  requires_oauth BOOLEAN DEFAULT true,
  capabilities JSON, -- Array of supported operations
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Examples:
INSERT INTO integrations VALUES (
  'stripe_v1',
  'stripe',
  'Stripe Payments',
  'Accept payments and manage subscriptions',
  'https://api.stripe.com/v1',
  'https://stripe.com/docs/api',
  '{"authUrl": "https://connect.stripe.com/oauth/authorize", "tokenUrl": "https://connect.stripe.com/oauth/token", "scopes": ["read_write"]}',
  true,
  '["payments", "subscriptions", "customers", "invoices"]',
  1696000000,
  1696000000
);

INSERT INTO integrations VALUES (
  'github_v3',
  'github',
  'GitHub API',
  'Manage repositories, issues, and pull requests',
  'https://api.github.com',
  'https://docs.github.com/rest',
  '{"authUrl": "https://github.com/login/oauth/authorize", "tokenUrl": "https://github.com/login/oauth/access_token", "scopes": ["repo", "user"]}',
  true,
  '["repos", "issues", "pulls", "users"]',
  1696000000,
  1696000000
);
```

### 2. OAuth Token Storage (Encrypted)

```sql
CREATE TABLE oauth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at INTEGER,
  scope TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
```

**Encryption Strategy:**
- Use Cloudflare Workers crypto API
- Encrypt with user-specific key derived from session
- Store encryption keys in Cloudflare KV (ephemeral)
- Never log decrypted tokens

### 3. Generated Code Cache

```sql
CREATE TABLE generated_api_code (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  args_hash TEXT NOT NULL,
  generated_code TEXT NOT NULL,
  language TEXT DEFAULT 'typescript',
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_success_at INTEGER,
  last_failure_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER, -- TTL: 30 days
  UNIQUE(provider, method, args_hash)
);

CREATE INDEX idx_generated_code_provider ON generated_api_code(provider);
CREATE INDEX idx_generated_code_success ON generated_api_code(success_count DESC);
```

**Cache Invalidation:**
- TTL: 30 days default
- Manual invalidation when provider API changes
- Auto-invalidate if failure_count > 10

### 4. API Execution Log

```sql
CREATE TABLE api_executions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  args JSON,
  cached_code BOOLEAN DEFAULT false,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  error TEXT,
  result_size INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_api_executions_user ON api_executions(user_id);
CREATE INDEX idx_api_executions_provider ON api_executions(provider);
CREATE INDEX idx_api_executions_created ON api_executions(created_at);
```

## AI Worker Methods

### 1. analyzeIntegrationRequirements()

**Purpose:** Analyze method call and identify which external API provider to use.

**Signature:**
```typescript
async analyzeIntegrationRequirements(
  method: string,
  args: any[]
): Promise<{
  provider: string
  requiresOAuth: boolean
  scopes?: string[]
  confidence: number
}>
```

**Example:**
```typescript
await ai.analyzeIntegrationRequirements('createPaymentIntent', [{ amount: 1000, currency: 'usd' }])
// Returns: { provider: 'stripe', requiresOAuth: true, scopes: ['payments'], confidence: 0.95 }
```

**Prompt Template:**
```
Analyze this method call and determine which external API provider it should use:

Method: createPaymentIntent
Arguments: {"amount":1000,"currency":"usd"}

Available providers:
- stripe: Payments, subscriptions, customers
- github: Repositories, issues, pull requests
- openweather: Weather data
- anthropic: Claude AI API
- openai: GPT models

Respond with JSON:
{
  "provider": "stripe",
  "requiresOAuth": true,
  "scopes": ["payments"],
  "confidence": 0.95
}
```

### 2. generateAPICode()

**Purpose:** Generate TypeScript code to call the external API.

**Signature:**
```typescript
async generateAPICode(
  provider: string,
  method: string,
  args: any[],
  apiDocs?: string
): Promise<{
  code: string
  imports: string[]
  requiredScopes: string[]
}>
```

**Example:**
```typescript
await ai.generateAPICode('stripe', 'createPaymentIntent', [{ amount: 1000, currency: 'usd' }])

// Returns:
{
  code: `
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${oauthToken}\`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: args[0].amount.toString(),
        currency: args[0].currency,
      }),
    })

    if (!response.ok) {
      throw new Error(\`Stripe API error: \${response.statusText}\`)
    }

    return await response.json()
  `,
  imports: [],
  requiredScopes: ['payments']
}
```

**Prompt Template:**
```
Generate TypeScript code to call this API:

Provider: stripe
Method: createPaymentIntent
Arguments: {"amount":1000,"currency":"usd"}
API Documentation: [Stripe API docs for payment intents]

Requirements:
- Use fetch() only (no external libraries)
- Include error handling
- Use oauthToken variable for authentication
- Return parsed JSON response

Generate clean, production-ready TypeScript code.
```

### 3. validateGeneratedCode()

**Purpose:** Basic syntax and security validation.

**Checks:**
- Valid TypeScript syntax
- No eval() or Function() constructor
- No file system access
- Only fetch() to whitelisted domains
- No infinite loops
- Timeout enforcement

## Auth Worker OAuth Methods

### 1. getOAuthUrl()

**Purpose:** Generate OAuth authorization URL for a provider.

**Signature:**
```typescript
async getOAuthUrl(
  provider: string,
  scopes: string[],
  state?: string
): Promise<string>
```

**Implementation:**
```typescript
async getOAuthUrl(provider: string, scopes: string[], state?: string): Promise<string> {
  // Get integration config
  const integration = await db.get('integrations', provider)
  if (!integration) throw new Error(`Unknown provider: ${provider}`)

  const oauthConfig = integration.oauth_config
  const clientId = env.OAUTH_CLIENTS[provider].clientId
  const redirectUri = `https://auth.do/oauth/callback/${provider}`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    response_type: 'code',
    state: state || crypto.randomUUID(),
  })

  return `${oauthConfig.authUrl}?${params}`
}
```

### 2. exchangeOAuthCode()

**Purpose:** Exchange authorization code for access token.

**Signature:**
```typescript
async exchangeOAuthCode(
  provider: string,
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }>
```

**Implementation:**
```typescript
async exchangeOAuthCode(provider: string, code: string, userId: string) {
  const integration = await db.get('integrations', provider)
  const oauthConfig = integration.oauth_config
  const clientSecret = env.OAUTH_CLIENTS[provider].clientSecret

  // Exchange code for token
  const response = await fetch(oauthConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.OAUTH_CLIENTS[provider].clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await response.json()

  // Encrypt and store tokens
  const encryptedAccessToken = await encryptToken(tokens.access_token, userId)
  const encryptedRefreshToken = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token, userId)
    : null

  await db.upsert({
    ns: 'oauth_tokens',
    id: `${userId}_${provider}`,
    data: {
      user_id: userId,
      provider: provider,
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
    },
  })

  return { success: true }
}
```

### 3. getOAuthToken()

**Purpose:** Retrieve and decrypt OAuth token for a provider.

**Signature:**
```typescript
async getOAuthToken(
  provider: string,
  userId: string
): Promise<{ token: string | null; needsRefresh: boolean }>
```

### 4. refreshOAuthToken()

**Purpose:** Refresh expired OAuth token.

**Signature:**
```typescript
async refreshOAuthToken(
  provider: string,
  userId: string
): Promise<{ success: boolean; token?: string }>
```

## Code Execution Sandbox

### Security Measures

**1. Isolated Context:**
```typescript
const sandbox = {
  fetch: createRestrictedFetch(allowedDomains),
  oauthToken: decryptedToken,
  args: userArgs,
  // No access to: fs, process, require, import
}
```

**2. Domain Whitelist:**
```typescript
const allowedDomains = [
  'api.stripe.com',
  'api.github.com',
  'api.openweathermap.org',
  'api.anthropic.com',
  'api.openai.com',
]
```

**3. Timeout Enforcement:**
```typescript
const result = await Promise.race([
  executeCode(generatedCode, sandbox),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Execution timeout')), 10000)
  )
])
```

**4. Memory Limits:**
- Max response size: 10 MB
- Max execution memory: 128 MB

**5. Rate Limiting:**
- Max 10 API calls per user per minute
- Max 100 API calls per user per hour

### Execution Flow

```typescript
async function executeUniversalAPI(
  provider: string,
  method: string,
  args: any[],
  userId: string
) {
  // 1. Get OAuth token
  const { token, needsRefresh } = await auth.getOAuthToken(provider, userId)
  if (!token) {
    return { needsOAuth: true, authUrl: await auth.getOAuthUrl(provider, ['read_write']) }
  }

  // 2. Check cache for generated code
  const argsHash = hashArgs(args)
  let cachedCode = await db.get('generated_api_code', `${provider}_${method}_${argsHash}`)

  // 3. Generate code if not cached
  if (!cachedCode) {
    const { code } = await ai.generateAPICode(provider, method, args)
    cachedCode = code

    // Store in cache
    await db.upsert({
      ns: 'generated_api_code',
      id: `${provider}_${method}_${argsHash}`,
      data: {
        provider,
        method,
        args_hash: argsHash,
        generated_code: code,
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      },
    })
  }

  // 4. Execute code in sandbox
  const sandbox = {
    fetch: createRestrictedFetch([getProviderDomain(provider)]),
    oauthToken: token,
    args: args,
  }

  const startTime = Date.now()
  try {
    const result = await Promise.race([
      executeInSandbox(cachedCode, sandbox),
      timeout(10000),
    ])

    // Log success
    await db.upsert({
      ns: 'api_executions',
      data: {
        user_id: userId,
        provider,
        method,
        args,
        success: true,
        latency_ms: Date.now() - startTime,
      },
    })

    // Update success count
    await db.execute(`
      UPDATE generated_api_code
      SET success_count = success_count + 1,
          last_success_at = ${Date.now()}
      WHERE id = '${provider}_${method}_${argsHash}'
    `)

    return result
  } catch (error) {
    // Log failure
    await db.upsert({
      ns: 'api_executions',
      data: {
        user_id: userId,
        provider,
        method,
        args,
        success: false,
        latency_ms: Date.now() - startTime,
        error: String(error),
      },
    })

    // Update failure count
    await db.execute(`
      UPDATE generated_api_code
      SET failure_count = failure_count + 1,
          last_failure_at = ${Date.now()}
      WHERE id = '${provider}_${method}_${argsHash}'
    `)

    throw error
  }
}
```

## RPC Proxy Enhancement

### Universal API Detection

```typescript
// In rpc-proxy.ts apply trap
if (actualService === 'api') {
  // Universal API call: $.api.stripe.createPaymentIntent(...)
  const provider = actualMethod // e.g., 'stripe'
  const apiMethod = args[0] // e.g., 'createPaymentIntent'
  const apiArgs = args.slice(1) // remaining args

  // Route to Universal API handler
  return client.call('universal-api', 'execute', [provider, apiMethod, apiArgs])
}
```

### OAuth Flow Handling

```typescript
try {
  const result = await client.call('universal-api', 'execute', [provider, method, args])

  if (result.needsOAuth) {
    // Return OAuth prompt to user
    console.log(`OAuth required for ${provider}`)
    console.log(`Authorize at: ${result.authUrl}`)

    // In browser context, could redirect:
    // window.location.href = result.authUrl

    throw new Error(`OAuth required: ${result.authUrl}`)
  }

  return result
} catch (error) {
  // Handle OAuth expiry, refresh, etc.
}
```

## Implementation Phases

### Phase 7A: Foundation (Day 1)
- [x] Design architecture document (this file)
- [ ] Create database tables (integrations, oauth_tokens, generated_api_code, api_executions)
- [ ] Implement encryption utilities (encryptToken, decryptToken)
- [ ] Add basic OAuth flow to auth worker (getOAuthUrl, exchangeOAuthCode)
- [ ] Test OAuth with Stripe sandbox

### Phase 7B: AI Code Generation (Day 2)
- [ ] Add AI worker methods (analyzeIntegrationRequirements, generateAPICode)
- [ ] Implement code validation (validateGeneratedCode)
- [ ] Create code execution sandbox
- [ ] Add domain whitelist and security measures
- [ ] Test code generation with sample Stripe calls

### Phase 7C: RPC Integration (Day 2-3)
- [ ] Create universal-api worker service
- [ ] Update rpc-proxy to detect `api.*` calls
- [ ] Implement cache lookup and storage
- [ ] Add execution logging
- [ ] Integrate OAuth flow with user sessions

### Phase 7D: Testing & Polish (Day 3)
- [ ] End-to-end test with Stripe API
- [ ] Add support for GitHub API
- [ ] Add support for OpenWeather API
- [ ] Comprehensive error handling
- [ ] Rate limiting implementation
- [ ] Documentation and examples

## Benefits

### For Developers

**Before (Traditional Integration):**
```typescript
// Install SDK
npm install stripe

// Import
import Stripe from 'stripe'

// Initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Call API
const payment = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
})
```

**After (Universal API):**
```typescript
// No installation needed!
const payment = await $.api.stripe.createPaymentIntent({
  amount: 1000,
  currency: 'usd',
})
// AI handles everything!
```

### Key Advantages

1. **Zero Configuration** - No SDK installation, no API keys in code
2. **Automatic OAuth** - AI handles authentication flows
3. **Any API** - Not limited to SDKs, works with any REST API
4. **Intelligent Caching** - Generated code reused across calls
5. **Self-Healing** - Failed generations automatically retried
6. **Type Safe** - TypeScript generated code maintains type safety
7. **Cost Efficient** - Only pay for AI when code is generated (cached after)

## Security Considerations

### Threat Model

**Threats:**
1. Token theft via logged code
2. Malicious code injection
3. API abuse via Universal API
4. Cost explosion from excessive generation
5. Data exfiltration via generated code

**Mitigations:**
1. **Encryption at Rest** - All tokens encrypted in database
2. **Code Validation** - Syntax and security checks before execution
3. **Domain Whitelist** - Only approved domains accessible
4. **Rate Limiting** - Per-user execution limits
5. **Sandboxed Execution** - Isolated context with no filesystem access
6. **Audit Logging** - All executions logged with full metadata
7. **Cost Limits** - Max cost per call (default: $0.10)
8. **Timeout Enforcement** - Max 10s execution time

### OAuth Security

**Best Practices:**
- Never log decrypted tokens
- Rotate encryption keys regularly
- Use short-lived tokens (1 hour) with refresh
- Implement token revocation
- Audit all OAuth grants
- Alert on suspicious activity

## Success Metrics

### Phase 7 Complete When:

- [ ] 3+ integrations working (Stripe, GitHub, OpenWeather)
- [ ] End-to-end OAuth flow functional
- [ ] Code generation cache hit rate >80%
- [ ] Average API call latency <5s (first call), <500ms (cached)
- [ ] Zero token leaks in logs
- [ ] 95%+ success rate for cached code execution
- [ ] Comprehensive documentation with examples

### KPIs to Track:

- API calls per day
- Cache hit rate
- OAuth completion rate
- Code generation success rate
- Average latency (cached vs. uncached)
- Cost per API call
- User satisfaction (NPS)

## Next Steps

1. **Create Database Tables** - Add 4 new tables to db worker schema
2. **Implement Encryption** - Token encryption/decryption utilities
3. **OAuth Foundation** - Basic OAuth flow in auth worker
4. **Test with Stripe** - Validate OAuth flow with Stripe sandbox
5. **AI Code Generation** - Implement AI worker methods
6. **Sandbox Execution** - Secure code execution environment
7. **RPC Integration** - Universal API handler service
8. **End-to-End Testing** - Full flow with real APIs

---

**Status:** Architecture design complete, ready for implementation
**Estimated Timeline:** 2-3 days for MVP with 3 integrations
**Risk Level:** Medium (OAuth security, code execution sandbox)
**Dependencies:** Phase 6 (AI fallback event storage) complete ✅
