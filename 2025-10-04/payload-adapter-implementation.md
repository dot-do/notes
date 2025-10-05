# Payload Adapter Implementation

**Date:** 2025-10-04
**Status:** Phase 1-2 Complete

## Overview

Successfully implemented `@dot-do/payload-adapter` package providing Payload CMS integration with multiple database backends and dynamic MDX collection loading.

## Completed Work

### Phase 1: Adapter Package (`workers/packages/payload-adapter/`)

Created comprehensive adapter package with:

1. **Type Definitions** (`src/types.ts`)
   - `PayloadAdapterConfig` - Unified config for all adapter types
   - `MDXCollectionFrontmatter` - Schema for MDX collection definitions
   - `DbWorkerRPC` - Interface for db worker communication

2. **MDX Parser** (`src/mdx-parser.ts`)
   - `parseCollectionMDX()` - Parse MDX collection files
   - `scanCollectionDirectory()` - Recursive directory scanning
   - `loadCollectionsFromMDX()` - Batch load collections
   - Converts MDX frontmatter to Payload `CollectionConfig`
   - Supports access rules, field types, hooks, admin config

3. **RPC Adapter** (`src/rpc-adapter.ts`)
   - Connects Payload to db worker via Workers RPC
   - Maps Payload CRUD to db worker's `things` table
   - Uses composite keys: `(ns='payload', type=collection, id=doc_id)`
   - Full DatabaseAdapter implementation
   - Supports versions, transactions (no-op), queries

4. **SQLite Adapter** (`src/sqlite-adapter.ts`)
   - Wraps `@payloadcms/db-sqlite`
   - Vector embeddings support with custom Float32Array type
   - Based on `archive/platform/primitives/databases/sqlite.ts`
   - Configurable dimensions (768, 1536, 3072)
   - Auto-indexing for similarity search

5. **D1 Adapter** (`src/d1-adapter.ts`)
   - Wraps `@payloadcms/db-d1-sqlite`
   - Cloudflare D1 serverless SQLite
   - Production-ready for admin.do

### Phase 2: Integration

1. **Updated App Config** (`projects/app/payload.config.new.ts`)
   - Environment-based adapter selection (D1, SQLite, RPC)
   - Dynamic MDX collection loading
   - Scans `./collections` and `../apps` directories
   - Combines built-in (Users, Media) with MDX collections

2. **Environment Configuration**
   - Added `PAYLOAD_ADAPTER` env var (d1, sqlite, rpc)
   - SQLite/Turso configuration options
   - Updated `.env.example`

## Key Features

### Dynamic Collection Loading

Collections defined as MDX files with YAML frontmatter:

```mdx
---
name: posts
slug: posts
access:
  read: true
  create: authenticated
  update: authenticated
  delete: admin
fields:
  - name: title
    type: text
    required: true
  - name: content
    type: richText
    required: true
admin:
  useAsTitle: title
hooks:
  beforeChange: [autoGenerateSlug]
---

# Posts Collection

Documentation...
```

### Multi-Backend Support

**D1 (Production)**:
```typescript
PAYLOAD_ADAPTER=d1
// Uses Cloudflare D1 binding
```

**SQLite (Local Dev)**:
```typescript
PAYLOAD_ADAPTER=sqlite
SQLITE_URL=file:./payload.db
// With optional Turso replication
```

**RPC (DB Worker)**:
```typescript
PAYLOAD_ADAPTER=rpc
// Connects to db worker via Workers RPC
// Stores in PostgreSQL `things` table
```

### Vector Embeddings

SQLite adapter supports vector embeddings:
- Float32 array storage
- Configurable dimensions
- Automatic indexing
- Compatible with similarity search

## Data Model (RPC Adapter)

Documents stored in db worker's `things` table:

```typescript
{
  ns: 'payload',           // Namespace
  id: 'post-123',          // Document ID
  type: 'posts',           // Collection slug
  data: {                  // Document data
    title: 'Hello World',
    content: '...',
    author: 'user-456'
  },
  content: '{"title":"Hello World","content":"..."}',
  visibility: 'private',
  created_at: '2025-10-04T...',
  updated_at: '2025-10-04T...',
  embedding: [0.1, 0.2, ...] // Optional vector
}
```

## Next Steps

### Phase 3: MDX Database Sync
- Create `mdxdb push` command (db → filesystem)
- Create `mdxdb pull` command (filesystem → db)
- Implement conflict resolution
- Git integration for sync commits

### Phase 4: D1 → SQLite Migration
- Migrate existing admin.do from D1 to SQLite
- Preserve data during migration
- Test vector embeddings
- Performance comparison

### Phase 5: HATEOAS API
- Extend existing HATEOAS helpers in db worker
- Add JSON-LD context to all responses
- Include `@context`, `@type`, `@id` fields
- Add `_links` with navigable URLs
- Support nested relationships

## Files Created

```
workers/packages/payload-adapter/
├── src/
│   ├── types.ts                # Type definitions
│   ├── mdx-parser.ts           # MDX collection parser
│   ├── rpc-adapter.ts          # DB worker RPC adapter
│   ├── sqlite-adapter.ts       # SQLite adapter with vectors
│   ├── d1-adapter.ts           # Cloudflare D1 adapter
│   └── index.ts                # Package exports
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

```
projects/app/
├── payload.config.new.ts       # Updated config (to be deployed)
└── .env.example                # Updated with adapter options
```

```
notes/
└── 2025-10-04-payload-adapter-implementation.md  # This file
```

## Testing

To test the implementation:

1. **Install dependencies**:
   ```bash
   cd workers/packages/payload-adapter
   pnpm install
   pnpm build
   ```

2. **Update app config**:
   ```bash
   cd projects/app
   mv payload.config.ts payload.config.old.ts
   mv payload.config.new.ts payload.config.ts
   ```

3. **Test with D1** (default):
   ```bash
   PAYLOAD_ADAPTER=d1 pnpm dev
   ```

4. **Test with SQLite**:
   ```bash
   PAYLOAD_ADAPTER=sqlite pnpm dev
   ```

5. **Test with RPC** (requires db worker):
   ```bash
   PAYLOAD_ADAPTER=rpc pnpm dev
   ```

## Breaking Changes

None - this is additive:
- Existing D1 adapter still works by default
- New adapters opt-in via environment variable
- Backward compatible with current deployments

## Performance Considerations

### RPC Adapter
- Network latency per database operation
- Best for: Admin dashboard, low-frequency updates
- Consider: Caching layer for read-heavy workloads

### SQLite Adapter
- Local file or Turso replica
- Best for: Local dev, high-performance reads
- Vector search: Fast with proper indexing

### D1 Adapter
- Cloudflare-native, globally distributed
- Best for: Production, edge deployments
- Limitations: No vector support (yet)

## Documentation

- Package README: `workers/packages/payload-adapter/README.md`
- Examples: `projects/app/collections/posts.mdx`
- Admin collections: `apps/admin.do.mdx` (40+ collections defined)

## Related PRs

- [ ] Create PR for payload-adapter package
- [ ] Create PR for app config update
- [ ] Update main CLAUDE.md with adapter info
- [ ] Document migration guide for D1 → SQLite

## Contributors

- Claude Code (AI Assistant)
- Nathan Clevenger (Human Review)

---

**Phase 1-2 Status**: ✅ Complete
**Next Phase**: MDX Database Sync (Phase 3)
