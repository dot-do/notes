# mdxdb Sync Commands Implementation Complete

**Date:** 2025-10-04
**Status:** Phase 4 Complete ✅

## Overview

Implemented bidirectional sync commands for mdxdb to synchronize MDX files between filesystem and database (db worker via RPC).

## Completed Work

### Phase 4: mdxdb Sync Commands

**Files Created:**

1. **`mdx/packages/mdxdb/fs/lib/commands/push.ts` (300 lines)**
   - Database → Filesystem sync
   - Generates MDX files with YAML frontmatter from database entities
   - Conflict detection via timestamp and content hash comparison
   - Git commit integration
   - Dry run support
   - Result tracking: pushed, skipped, errors, conflicts

2. **`mdx/packages/mdxdb/fs/lib/commands/pull.ts` (245 lines)**
   - Filesystem → Database sync
   - Parses MDX files with gray-matter
   - Creates or updates entities in database
   - Overwrite protection with --overwrite flag
   - Pattern matching with micromatch
   - Result tracking: pulled, created, updated, skipped, errors

3. **`mdx/packages/mdxdb/fs/lib/http-client.ts` (90 lines)**
   - HTTP client implementing DbWorkerClient interface
   - RESTful API calls to db worker
   - Authentication via API key
   - Error handling for 404s and other HTTP errors

**Files Updated:**

4. **`mdx/packages/mdxdb/fs/lib/index.ts`**
   - Export push/pull functions and types
   - Export DbWorkerClient interface

5. **`mdx/packages/mdxdb/fs/cli.ts`**
   - Added `mdxdb push` command (80 lines)
   - Added `mdxdb pull` command (55 lines)
   - Command-line argument parsing
   - Environment variable support (DB_WORKER_URL, DB_API_KEY)

## CLI Usage

### Push Command (Database → Filesystem)

```bash
# Push all entities from namespace to filesystem
mdxdb push \
  --namespace payload \
  --directory ./content \
  --db-url https://db.do \
  --api-key $DB_API_KEY

# Push specific collections
mdxdb push \
  --namespace payload \
  --directory ./content \
  --collections posts,pages \
  --force

# Dry run to preview changes
mdxdb push \
  --namespace payload \
  --directory ./content \
  --dry-run

# Create git commit after push
mdxdb push \
  --namespace payload \
  --directory ./content \
  --commit \
  --message "sync: Update content from database"
```

**Options:**
- `-n, --namespace <namespace>` - Namespace to export (required)
- `-d, --directory <directory>` - Output directory for MDX files (required)
- `-c, --collections <collections>` - Collection types to export (comma-separated)
- `-u, --db-url <url>` - Database worker URL (env: DB_WORKER_URL, default: https://db.do)
- `-k, --api-key <key>` - API key for authentication (env: DB_API_KEY)
- `-f, --force` - Force overwrite existing files without conflict check
- `--commit` - Create git commit after push
- `-m, --message <message>` - Git commit message
- `--dry-run` - Show what would be pushed without writing files
- `--json` - Emit JSON describing actions/results

### Pull Command (Filesystem → Database)

```bash
# Pull all MDX files into namespace
mdxdb pull \
  --namespace payload \
  --directory ./content \
  --db-url https://db.do \
  --api-key $DB_API_KEY

# Pull specific collections
mdxdb pull \
  --namespace payload \
  --directory ./content \
  --collections posts,pages

# Overwrite existing database entries
mdxdb pull \
  --namespace payload \
  --directory ./content \
  --overwrite

# Dry run to preview changes
mdxdb pull \
  --namespace payload \
  --directory ./content \
  --dry-run

# Custom file pattern
mdxdb pull \
  --namespace notes \
  --directory ./notes \
  --pattern "**/*.md"
```

**Options:**
- `-n, --namespace <namespace>` - Namespace to import into (required)
- `-d, --directory <directory>` - Directory containing MDX files (required)
- `-c, --collections <collections>` - Collection types to import (comma-separated)
- `-u, --db-url <url>` - Database worker URL (env: DB_WORKER_URL, default: https://db.do)
- `-k, --api-key <key>` - API key for authentication (env: DB_API_KEY)
- `-o, --overwrite` - Overwrite existing database entries
- `-p, --pattern <pattern>` - File pattern to match (default: **/*.mdx)
- `--dry-run` - Show what would be pulled without writing to database
- `--json` - Emit JSON describing actions/results

## Environment Variables

```bash
# Database worker configuration
export DB_WORKER_URL=https://db.do
export DB_API_KEY=your-api-key-here

# Run commands without flags
mdxdb push --namespace payload --directory ./content
mdxdb pull --namespace payload --directory ./content
```

## Data Flow

### Push Flow (Database → Filesystem)

```
┌──────────────────┐
│   DB Worker      │
│   (PostgreSQL)   │
└────────┬─────────┘
         │ HTTP GET /api/things?ns=payload&type=posts
         │ (paginated: 100 items at a time)
         ▼
┌──────────────────┐
│  HTTP Client     │
│  (createHttpClient)
└────────┬─────────┘
         │ queryThings({ ns, type, limit, offset })
         ▼
┌──────────────────┐
│  Push Command    │
│  - Generate MDX  │
│  - Check conflicts
│  - Write files   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Filesystem      │
│  content/        │
│    posts/        │
│      post-1.mdx  │
│      post-2.mdx  │
└──────────────────┘
```

### Pull Flow (Filesystem → Database)

```
┌──────────────────┐
│  Filesystem      │
│  content/        │
│    posts/        │
│      post-1.mdx  │
│      post-2.mdx  │
└────────┬─────────┘
         │ findMDXFiles(directory, pattern, collections)
         ▼
┌──────────────────┐
│  Pull Command    │
│  - Parse MDX     │
│  - Extract data  │
│  - Check existing│
└────────┬─────────┘
         │ createThing() / updateThing()
         ▼
┌──────────────────┐
│  HTTP Client     │
│  (createHttpClient)
└────────┬─────────┘
         │ HTTP POST /api/things
         │ HTTP PATCH /api/things/:ns/:id
         ▼
┌──────────────────┐
│   DB Worker      │
│   (PostgreSQL)   │
└──────────────────┘
```

## MDX Format

### Generated MDX (Push)

```mdx
---
$id: payload/post-123
$type: posts
title: Hello World
slug: hello-world
status: published
author: user-456
created_at: '2025-10-04T12:00:00Z'
updated_at: '2025-10-04T12:30:00Z'
---

This is the content of the blog post.

It supports **markdown** and can include components.
```

### Parsed MDX (Pull)

```mdx
---
$id: payload/post-123
$type: posts
title: Hello World
slug: hello-world
status: published
visibility: public
---

Post content here...
```

**Extracted Fields:**
- `$id` - Entity identifier (ns/id format)
- `$type` - Collection type (directory name if not specified)
- All other fields → `data` object in database
- Content below `---` → `content` field in database

## Conflict Detection

The push command includes conflict detection to prevent overwriting newer local changes:

**Timestamp Comparison:**
- If local file has `updated_at` newer than database entity
- Reports: "Filesystem version is newer than database"

**Content Hash Comparison:**
- Simple hash of MDX content
- Reports: "Content differs between filesystem and database"

**Resolution:**
- Use `--force` to overwrite conflicts
- Or manually resolve and re-run

## Git Integration

The push command can automatically commit changes:

```bash
mdxdb push \
  --namespace payload \
  --directory ./content \
  --commit \
  --message "sync: Update content from database"
```

**Commit includes:**
- All changed files in directory
- Custom commit message
- Only commits if changes exist
- Checks if directory is a git repository

## Error Handling

**Push Command:**
- Tracks conflicts separately from errors
- Exit code 1 if conflicts exist (unless --force)
- Exit code 1 if errors occur
- JSON mode for programmatic usage

**Pull Command:**
- Validates required frontmatter fields ($id, $type)
- Handles missing fields gracefully
- Exit code 1 if errors occur
- Tracks created/updated/skipped separately

## Testing Checklist

To test the implementation:

1. **Build mdxdb package:**
   ```bash
   cd /Users/nathanclevenger/Projects/.do/mdx/packages/mdxdb/fs
   pnpm install
   pnpm build
   ```

2. **Test push (requires running db worker):**
   ```bash
   # Dry run first
   mdxdb push \
     --namespace test \
     --directory ./test-content \
     --db-url http://localhost:8787 \
     --dry-run

   # Actual push
   mdxdb push \
     --namespace test \
     --directory ./test-content \
     --db-url http://localhost:8787
   ```

3. **Test pull:**
   ```bash
   # Create test MDX files
   mkdir -p test-content/posts
   cat > test-content/posts/test.mdx << 'EOF'
   ---
   $id: test/test-post
   $type: posts
   title: Test Post
   ---
   Test content
   EOF

   # Pull into database
   mdxdb pull \
     --namespace test \
     --directory ./test-content \
     --db-url http://localhost:8787
   ```

4. **Test conflict detection:**
   ```bash
   # Push from database
   mdxdb push --namespace test --directory ./test-content

   # Modify local file

   # Try to push again (should detect conflict)
   mdxdb push --namespace test --directory ./test-content

   # Force push
   mdxdb push --namespace test --directory ./test-content --force
   ```

## Integration Points

**Payload CMS Integration:**
- Use `mdxdb pull` to import Payload collections from MDX files
- Use `mdxdb push` to export Payload data as version-controlled MDX
- Namespace: `payload`
- Collections: posts, pages, media, etc.

**Notes Sync:**
- Use for personal notes management
- Namespace: `notes`
- Bidirectional sync between Obsidian and database

**Content Management:**
- Version control for all content
- Database as runtime state
- MDX files as source of truth
- Git integration for change tracking

## Next Steps

### Phase 5: Testing & Documentation

1. **Unit Tests:**
   - Test push command logic
   - Test pull command logic
   - Test conflict detection
   - Test HTTP client

2. **Integration Tests:**
   - Test with actual db worker
   - Test git integration
   - Test error scenarios
   - Test pagination

3. **Documentation:**
   - Add examples to mdxdb README
   - Document db worker API endpoints
   - Create sync workflow guide
   - Add troubleshooting section

### Phase 6: D1 → SQLite Migration

- Migrate admin.do from D1 to SQLite
- Use payload adapter with vector support
- Test performance and features
- Document migration process

### Phase 7: HATEOAS API

- Extend existing HATEOAS helpers in db worker
- Add $context, $type, $id to all responses
- Include _links with navigable URLs
- Support nested relationships

## Related Files

**Core Implementation:**
- `mdx/packages/mdxdb/fs/lib/commands/push.ts` - Push command
- `mdx/packages/mdxdb/fs/lib/commands/pull.ts` - Pull command
- `mdx/packages/mdxdb/fs/lib/http-client.ts` - HTTP client
- `mdx/packages/mdxdb/fs/cli.ts` - CLI commands

**Dependencies:**
- `gray-matter` - MDX frontmatter parsing
- `micromatch` - File pattern matching
- `simple-git` - Git integration
- `commander` - CLI argument parsing

**Related Documentation:**
- `/notes/2025-10-04-payload-adapter-implementation.md` - Payload adapter (Phase 1-2)
- `workers/db/src/index.ts` - DB worker RPC interface (line 48-100 HATEOAS helper)

## Contributors

- Claude Code (AI Assistant)
- Nathan Clevenger (Human Review)

---

**Phase 4 Status**: ✅ Complete (CLI integration ready)
**Next Phase**: Phase 5 (Testing) or Phase 6 (D1 → SQLite Migration)
