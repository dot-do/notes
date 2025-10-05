# Worker Loader Local Development Investigation

**Date:** 2025-10-04
**Status:** ❌ Worker Loader NOT working in local dev despite documentation claims

## Summary

Comprehensive testing shows that Cloudflare Worker Loader is **NOT functional** in local development with wrangler 4.42.0, despite documentation stating it is "fully available when developing locally with Wrangler and workerd."

## Testing Environment

- **Wrangler Version:** 4.42.0 (latest)
- **Node Version:** 22.3.0
- **Workerd:** Running via Miniflare 3
- **Compatibility Flags:** `nodejs_compat`, `enable_ctx_exports`
- **Configuration:** Complete worker_loaders binding configured

## What We Tested

### 1. Configuration (✅ Complete)

```jsonc
{
  "compatibility_date": "2025-07-08",
  "compatibility_flags": ["nodejs_compat", "enable_ctx_exports"],
  "worker_loaders": [
    {
      "binding": "LOADER"
    }
  ]
}
```

### 2. Code Implementation (✅ Correct)

```typescript
const worker = await env.LOADER.get(executionId, async () => {
  return {
    compatibilityDate: '2025-07-08',
    mainModule: 'main.js',
    modules: {
      'main.js': workerCode
    },
    env: { /* bindings */ }
  }
})

const response = await worker.fetch(request)
```

### 3. Debug Logging (✅ Added)

Added comprehensive logging to trace execution:
- LOADER object type and properties
- LOADER.get() call and return
- Callback execution
- Worker object structure
- Worker.fetch availability

## Observed Behavior

### What Works:
- ✅ LOADER binding exists: `env.LOADER: WorkerLoader {}`
- ✅ LOADER.get() is callable
- ✅ Callback executes successfully
- ✅ workerCode object created correctly

### What Doesn't Work:
- ❌ LOADER has no methods: `env.LOADER keys: []`
- ❌ LOADER.get() returns immediately with empty object
- ❌ Callback runs AFTER get() has already returned
- ❌ Worker object is empty: `worker keys: []`
- ❌ worker.fetch is undefined: `typeof worker.fetch === 'undefined'`

### Debug Output:

```
env.LOADER type: object
env.LOADER: WorkerLoader {}
env.LOADER keys: []
Calling env.LOADER.get...
env.LOADER.get returned          ← Returns immediately
worker type: object
worker keys: []
worker.fetch: undefined
Inside LOADER.get callback       ← Callback runs AFTER
Returning workerCode: [...]
```

**Critical Issue:** The callback runs AFTER LOADER.get() has already returned. This is backwards - the callback should execute FIRST, create the WorkerCode, then LOADER.get() should return the worker object.

## globalOutbound Type Error

When `globalOutbound` is included in WorkerCode:

```
✘ [ERROR] Uncaught TypeError: Incorrect type for the 'globalOutbound' field on 'WorkerCode':
the provided value is not of type 'Fetcher'.
```

This occurs even when correctly implementing the Fetcher interface:
```typescript
{
  fetch: async (request: Request) => {
    // handler logic
  }
}
```

## Documentation vs Reality

### Documentation Claims:
> "Fully available when developing locally with Wrangler and workerd" - [Code Mode blog post](https://blog.cloudflare.com/code-mode/)

> "Available in local development with Wrangler and workerd" - [Worker Loader docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)

### Actual Testing Results:
- ❌ LOADER.get() returns empty worker object
- ❌ worker.fetch is not a function
- ❌ No actual code execution occurs
- ❌ globalOutbound throws type error

## Possible Explanations

### 1. Beta Access Required (Most Likely)
Even though documentation says it works locally, the feature might require:
- Account to be allowlisted in Cloudflare's beta program
- Beta access flag enabled on the account
- Special permissions beyond just configuration

### 2. Wrangler Implementation Incomplete
- Worker Loader API might not be fully implemented in wrangler 4.42.0
- Local dev (Miniflare/workerd) might lag behind production runtime
- Feature might be in flux during beta period

### 3. Missing Configuration
- Some undocumented configuration flag or setting
- Additional setup step not mentioned in docs
- Compatibility flag interactions

## What We've Verified

1. ✅ Latest wrangler (4.42.0)
2. ✅ Correct wrangler.jsonc configuration
3. ✅ Correct compatibility flags (`enable_ctx_exports`)
4. ✅ Correct API usage (matches documentation exactly)
5. ✅ All service bindings configured
6. ✅ No TypeScript errors
7. ✅ Local dev server runs successfully
8. ✅ LOADER binding appears in environment

## Next Steps

### Option 1: Contact Cloudflare Support
- Verify beta access is fully activated
- Confirm Worker Loader should work in local dev
- Report bug if it's supposed to work but doesn't

### Option 2: Deploy to Production
- Test in actual Cloudflare Workers environment
- Beta access may only apply to production
- Local dev support might come later

### Option 3: Alternative Implementation
- Use eval() or vm module (less secure)
- Use separate Workers deployed normally
- Wait for Worker Loader to exit beta

## Code Status

### Working:
- ✅ Authorization system
- ✅ Rate limiting
- ✅ Service bindings integration
- ✅ Business-as-Code runtime ($)
- ✅ RPC client creation
- ✅ Error handling
- ✅ Test suite

### Blocked:
- ❌ Dynamic code execution
- ❌ Outbound handler (globalOutbound)
- ❌ SDK + Outbound Handler architecture
- ❌ End-to-end testing

## Recommendation

**Pause Worker Loader development** until:
1. Cloudflare confirms beta access includes local dev
2. OR Worker Loader exits beta with full local support
3. OR We get confirmation of what's needed to make it work

The code is complete and ready - we just need the Worker Loader API to actually work.

## Related Files

- `workers/do/wrangler.jsonc` - Configuration
- `workers/do/src/executor.ts` - Implementation with debug logging
- `workers/do/src/types.ts` - TypeScript types
- `workers/test/src/index.ts` - Test suite

## References

- [Worker Loader Documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
- [Code Mode Blog Post](https://blog.cloudflare.com/code-mode/)
- [enable_ctx_exports Flag](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-ctxexports)
- [Beta Access Form](https://forms.gle/MoeDxE9wNiqdf8ri9)
