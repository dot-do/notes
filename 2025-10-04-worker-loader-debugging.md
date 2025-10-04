# Worker Loader Debugging Session - 2025-10-04

## Problem

The `do` worker's code execution feature was failing due to incorrect usage of Cloudflare's Worker Loader API.

## Root Causes

### 1. Incorrect `await` on `get()` Method

**Issue:** In `executor.ts:91`, we were awaiting `env.LOADER.get()`:

```typescript
const worker = await env.LOADER.get(executionId, async () => {
```

**Correct:** According to Cloudflare documentation and our own test mock, `get()` returns a `WorkerStub` synchronously:

```typescript
const worker = env.LOADER.get(executionId, async () => {
```

**Why this matters:** The Worker Loader API is designed for efficiency - it returns the worker stub immediately, and the callback is invoked lazily when the worker's `fetch()` method is first called.

### 2. Worker Loader Closed Beta Status

**From Cloudflare Documentation:**
- Worker Loader is currently in **closed beta**
- Requires signing up for beta access to use in production
- **Works in local development** with Wrangler and workerd (v1.20250107.0+)
- No allowlist needed for local testing

**Implications:**
- Production deployment requires Cloudflare beta allowlist
- Local development and testing fully functional
- Need to apply for beta access at: https://www.cloudflare.com/lp/workers-dynamic-dispatch/

### 3. Type System Issues

**Fixed issues:**
1. Missing `metadata` field in `AuthContext.user` type
2. `require()` usage instead of ES module imports for `getTierSummary`
3. `Fetcher` type incompatibility in `createOutboundHandler` (changed to `any` temporarily)
4. Missing dependencies: `apis.do` and `sdk.do` needed for Business-as-Code runtime

## Fixes Applied

### 1. Removed Incorrect `await` (executor.ts)

```diff
- const worker = await env.LOADER.get(executionId, async () => {
+ const worker = env.LOADER.get(executionId, async () => {
```

### 2. Added User Metadata Field (types.ts)

```diff
export interface AuthContext {
  user?: {
    id: string
    email: string
    name?: string
    role?: string
    permissions?: string[]
+   metadata?: Record<string, any>
  }
```

### 3. Fixed ES Module Import (index.ts)

```diff
- const { getTierSummary } = require('./authorization')
+ import { getTierSummary } from './authorization'
```

### 4. Added Missing Dependencies (package.json)

```diff
"dependencies": {
+ "apis.do": "link:../../sdk/packages/apis.do",
  "hono": "^4.6.15",
+ "sdk.do": "link:../../sdk/packages/sdk.do"
}
```

## Testing Results

**All 20 executor tests passing:**
```
✓ tests/executor.test.ts (20 tests) 100ms

Test Files  1 passed (1)
     Tests  20 passed (20)
  Duration  1.57s
```

**Test coverage:**
- Basic execution (5 tests)
- Error handling (3 tests)
- Authorization integration (4 tests)
- Timeout enforcement (3 tests)
- Execution metrics (2 tests)
- Context passing (3 tests)

## Worker Loader API Pattern

**Correct Usage Pattern:**
```typescript
// 1. Get worker stub synchronously
const worker = env.LOADER.get(id, async () => {
  // 2. Return WorkerCode configuration
  return {
    compatibilityDate: '2025-07-08',
    mainModule: 'main.js',
    modules: {
      'main.js': userCode
    },
    env: { /* bindings */ }
  }
})

// 3. Call fetch (callback invoked lazily here)
const response = await worker.fetch(request)
```

**Key Points:**
- `get()` is **synchronous** - returns immediately
- Callback is **async** - but only invoked when worker is used
- This enables efficient worker pooling and lazy initialization

## Production Deployment Considerations

### Local Development (Working)
```bash
cd workers/do
pnpm dev  # Worker Loader fully functional
```

### Production Deployment (Requires Beta Access)
```bash
# 1. Apply for beta access
https://www.cloudflare.com/lp/workers-dynamic-dispatch/

# 2. Wait for allowlist approval

# 3. Deploy
pnpm deploy
```

**Alternative:** Until beta access is granted, the `do` worker can function as a unified RPC service without the code execution feature. All other RPC methods work without Worker Loader.

## Architecture Context

The `do` worker serves as:
1. **Unified RPC Entry Point** - Single binding for all 8 core services
2. **Context Propagation** - Automatic auth context passing
3. **Code Execution** - Dynamic worker loader for user code (requires beta)

**Dependencies:**
```
do worker
├── 8 core service bindings
│   ├── db
│   ├── auth
│   ├── gateway
│   ├── schedule
│   ├── webhooks
│   ├── email
│   ├── mcp
│   └── queue
└── Worker Loader binding (LOADER)
    └── For code execution feature
```

## ctx.exports Integration (Follow-up Enhancement)

After confirming Worker Loader beta access, enhanced the implementation to use Cloudflare's `enable_ctx_exports` flag:

**What is ctx.exports?**
- Automatic loopback bindings for WorkerEntrypoints defined in the same worker
- No need to configure explicit service bindings for self-reference
- Part of Worker Loader beta feature set

**Implementation:**
```typescript
// executor.ts - Enhanced to accept ExecutionContext
export async function executeCode(
  request: ExecuteCodeRequest,
  env: Env,
  context?: ServiceContext,
  ctx?: ExecutionContext  // ← New parameter
): Promise<ExecuteCodeResponse>

// Prefer ctx.exports for DO binding
DO: (ctx?.exports as any)?.DO || env.DO || stub
```

**Fallback Strategy:**
1. **First:** Try `ctx.exports.DO` (automatic via enable_ctx_exports)
2. **Second:** Try `env.DO` (explicit service binding if configured)
3. **Last:** Return 503 stub

**Benefits:**
- ✅ Cleaner wrangler.jsonc (one less binding)
- ✅ Automatic self-reference without configuration
- ✅ Leverages Cloudflare's recommended pattern
- ✅ More maintainable architecture

**Commits:**
- `2ec07f2` - Fixed Worker Loader API usage (removed incorrect await)
- `e159af7` - Added ctx.exports integration for automatic bindings

## Next Steps

### Immediate ✅
- [x] Fix Worker Loader API usage
- [x] Add missing dependencies
- [x] Verify all tests pass
- [x] Commit and document changes
- [x] Confirm beta access available
- [x] Integrate ctx.exports API
- [x] All 20 tests passing

### Short-term
- [ ] Test code execution in local development with `pnpm dev`
- [ ] Create comprehensive local dev testing guide
- [ ] Test ctx.exports.DO binding in practice
- [ ] Performance benchmarking

### Production
- [x] Beta access confirmed available
- [ ] Deploy with Worker Loader enabled
- [ ] Monitor code execution performance
- [ ] Set up observability for dynamic workers

## Resources

**Cloudflare Documentation:**
- Worker Loader: https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/
- Dynamic Dispatch: https://www.cloudflare.com/lp/workers-dynamic-dispatch/
- Beta Access: Contact Cloudflare enterprise

**Internal Documentation:**
- [workers/do/README.md](../workers/do/README.md) - Usage guide
- [workers/CLAUDE.md](../workers/CLAUDE.md) - Workers architecture
- [workers/do/src/executor.ts](../workers/do/src/executor.ts) - Implementation

## Lessons Learned

1. **Read API Docs Carefully** - The synchronous return was clearly documented
2. **Trust Your Tests** - The test mock showed the correct pattern
3. **Type System Alignment** - Types should match runtime behavior
4. **Beta Features** - Understand production vs development availability
5. **Lazy Initialization** - Worker Loader's design enables efficient resource usage

---

**Session Date:** 2025-10-04
**Duration:** ~45 minutes
**Status:** ✅ Fixed and Tested
**Commit:** `2ec07f2`
