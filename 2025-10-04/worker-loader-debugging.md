# Worker Loader Debugging Session - 2025-10-04

## Issue Summary

After deploying the updated db service with variable-dimension embedding support, all requests to `https://db.drivly.workers.dev` returned **error code 1042**. This session documents the debugging process and resolution.

## Root Cause: ClickHouse Authentication Failure

**Primary Issue**: CLICKHOUSE_PASSWORD secret is incorrect or not set

**Error**: `_ClickHouseError: default: Authentication failed: password is incorrect` (code 194)

**Secondary Issue (RESOLVED)**: executeSql() was using `query()` for DDL statements instead of `command()`

## What's Working ✅

1. **Worker Deployment**: Successfully deployed, returning 200 OK responses
2. **executeSql Fix**: Now correctly routes DDL to `command()`, DML to `query()`
3. **PostgreSQL**: Connection working fine
4. **Health Endpoint**: Proper "degraded" status when ClickHouse fails

## What's Blocked ❌

1. **ClickHouse Operations**: All queries failing with auth error
2. **Table Migration**: Cannot drop/recreate embedding tables
3. **Vector Search**: Blocked by ClickHouse auth

## Fix Applied (src/index.ts lines 212-231)

```typescript
async executeSql(query: string) {
  const isDDL = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME)\s+/i.test(query)
  
  if (isDDL) {
    await clickhouse.command({ query, clickhouse_settings: {...} })
    return { success: true, message: 'DDL statement executed successfully' }
  } else {
    const resultSet = await clickhouse.query({ query, format: 'JSON' })
    return resultSet.json()
  }
}
```

## Next Steps

1. **Reset ClickHouse Password**: Go to https://clickhouse.cloud/ and reset password
2. **Update Secret**: `npx wrangler secret put CLICKHOUSE_PASSWORD`
3. **Verify**: `curl https://db.drivly.workers.dev/health | jq '.clickhouse.status'`
4. **Drop Tables**: Use executeSql RPC to drop existing tables
5. **Run Migration**: `curl -X POST https://db.drivly.workers.dev/admin/migrate-vector-schema`
6. **Verify Schema**: Check all 10 embedding columns exist
7. **Update Schedule**: Add new models to generate-missing-embeddings task
8. **Test**: Generate embeddings with Gemma 128 and verify search

## Testing Commands

### Local Testing (Remote Mode)
```bash
cd /Users/nathanclevenger/Projects/.do/workers/db
npx wrangler dev --remote  # Uses production secrets
curl http://localhost:61046/health
```

### Production Testing
```bash
curl https://db.drivly.workers.dev/health
npx wrangler tail --format=pretty --status error
```

## Status

- ✅ Worker code fixed and deployed (Version: c04d1969-cd67-4d4c-8bc8-de060193a009)
- ✅ executeSql DDL support verified
- ❌ ClickHouse password needs reset
- ⏸️ Table migration pending auth fix
