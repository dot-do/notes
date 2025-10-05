# HATEOAS API Implementation - Phase 7 Complete

## Overview

Successfully implemented full HATEOAS (Hypermedia as the Engine of Application State) support in the db worker with comprehensive JSON-LD integration, Schema.org types, canonical URLs, and navigable hypermedia links.

## Implementation Summary

### 1. New HATEOAS Module (`workers/db/src/hateoas.ts`)

Created a comprehensive 600+ line module providing:

**Core Features:**
- **JSON-LD Context** (`@context`) - Semantic web compatibility with Schema.org
- **Typed Entities** (`@type`) - Schema.org types for structured data
- **Canonical IDs** (`@id`) - Unique resource URLs
- **Hypermedia Links** (`_links`) - Navigable API with self, collection, relationships
- **Relationship Detection** - Automatic detection and linking of related entities
- **Pagination Support** - First, prev, next, last links for collections
- **Error Responses** - Consistent error format with HATEOAS

**Key Functions:**
- `wrapEntity()` - Wrap single entity with full HATEOAS metadata
- `wrapCollection()` - Wrap array of entities with pagination
- `wrapSearchResults()` - Wrap search results with query context
- `wrapError()` - Wrap errors with HATEOAS links
- `detectRelationships()` - Find relationship references in entity data
- `generateRelationshipLinks()` - Generate links for related entities
- `getSchemaOrgType()` - Map entity types to Schema.org types

### 2. Updated All HTTP Endpoints

Updated **ALL** HTTP endpoints in `workers/db/src/index.ts` to use new HATEOAS wrappers:

**Entity Endpoints:**
- `GET /things` - List with pagination links
- `GET /:ns/:id` - Single entity with relationship links
- `POST /things` - Create with canonical URL
- `PATCH /:ns/:id` - Update with links
- `DELETE /:ns/:id` - Delete with success response
- `GET /api/things/count/:ns` - Count with aggregate links

**Relationship Endpoints:**
- `GET /api/relationships` - List relationships
- `GET /api/relationships/:ns/:id` - Get outgoing relationships
- `GET /api/relationships/:ns/:id/incoming` - Get incoming relationships
- `POST /api/relationships` - Create relationship
- `DELETE /api/relationships/:ns/:id` - Delete relationship

**Search Endpoints:**
- `GET /search?q=query` - Full-text search
- `POST /api/search/vector` - Vector similarity search
- `POST /api/search/hybrid` - Hybrid text + vector search
- `POST /api/search/chunks` - Chunk-based search

### 3. Schema.org Type Mapping

Implemented intelligent type mapping for common entity types:

```typescript
const typeMap = {
  // Content
  post: 'BlogPosting',
  article: 'Article',
  page: 'WebPage',

  // People & Orgs
  user: 'Person',
  organization: 'Organization',
  business: 'LocalBusiness',

  // Products & Services
  product: 'Product',
  service: 'Service',

  // Media
  image: 'ImageObject',
  video: 'VideoObject',

  // AI Entities
  agent: 'SoftwareApplication',
  workflow: 'Action',

  // Default
  thing: 'Thing',
}
```

### 4. Relationship Detection

Automatic detection of relationships in entity data:

**Patterns Detected:**
- Author/creator references (`author`, `creator`, `owner`)
- Hierarchical relationships (`parent`, `child`, `sibling`)
- Categorization (`category`, `categories`, `tag`, `tags`)
- Links (`related`, `relatedTo`, `linkedTo`)
- Organizational (`organization`, `company`, `team`)

**Format Support:**
- `"ns:id"` format (e.g., `"payload:post-123"`)
- Single ID (e.g., `"user-456"` - assumes same namespace)
- Arrays of references

## Example Responses

### Single Entity Response

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://api.do/payload/post-123",
  "ns": "payload",
  "id": "post-123",
  "type": "posts",
  "data": {
    "title": "Hello World",
    "slug": "hello-world",
    "author": "user-456",
    "categories": ["tech", "ai"]
  },
  "content": "Post content...",
  "createdAt": "2025-10-04T12:00:00Z",
  "updatedAt": "2025-10-04T12:30:00Z",
  "_links": {
    "self": {
      "href": "https://api.do/payload/post-123"
    },
    "collection": {
      "href": "https://api.do/things?ns=payload&type=posts"
    },
    "namespace": {
      "href": "https://api.do/things?ns=payload"
    },
    "author": {
      "href": "https://api.do/payload/user-456",
      "title": "author"
    },
    "categories": [
      {
        "href": "https://api.do/payload/tech",
        "title": "categories"
      },
      {
        "href": "https://api.do/payload/ai",
        "title": "categories"
      }
    ],
    "update": {
      "href": "https://api.do/payload/post-123",
      "method": "PATCH"
    },
    "delete": {
      "href": "https://api.do/payload/post-123",
      "method": "DELETE"
    },
    "relationships": {
      "href": "https://api.do/payload/post-123.relationships"
    }
  }
}
```

### Collection Response

```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/things?ns=payload&type=posts&page=1",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://api.do/payload/post-123",
      "ns": "payload",
      "id": "post-123",
      "type": "posts",
      "data": { "title": "Post 1" },
      "_links": {
        "self": { "href": "https://api.do/payload/post-123" },
        "collection": { "href": "https://api.do/things?ns=payload&type=posts" }
      }
    }
  ],
  "totalItems": 42,
  "_links": {
    "self": {
      "href": "https://api.do/things?ns=payload&type=posts&page=1"
    },
    "home": {
      "href": "https://api.do"
    },
    "next": {
      "href": "https://api.do/things?ns=payload&type=posts&page=2"
    },
    "last": {
      "href": "https://api.do/things?ns=payload&type=posts&page=3"
    }
  },
  "_meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "hasMore": true
  }
}
```

### Search Results Response

```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/search?q=machine+learning",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": "https://api.do/articles/ml-intro",
      "ns": "articles",
      "id": "ml-intro",
      "type": "article",
      "score": 0.92,
      "_links": {
        "self": { "href": "https://api.do/articles/ml-intro" }
      }
    }
  ],
  "totalItems": 5,
  "_links": {
    "self": {
      "href": "https://api.do/search?q=machine+learning"
    },
    "home": {
      "href": "https://api.do"
    }
  }
}
```

### Error Response

```json
{
  "@context": "https://schema.org",
  "@type": "Error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Thing not found: payload:post-999"
  },
  "_links": {
    "self": {
      "href": "https://api.do/payload/post-999"
    },
    "home": {
      "href": "https://api.do"
    }
  }
}
```

### Delete Action Response

```json
{
  "@context": "https://schema.org",
  "@type": "DeleteAction",
  "success": true,
  "message": "Deleted payload:post-123",
  "_links": {
    "self": {
      "href": "https://api.do/payload/post-123"
    },
    "home": {
      "href": "https://api.do"
    },
    "collection": {
      "href": "https://api.do/things?ns=payload"
    }
  }
}
```

## Relationship Linking Strategy

### Automatic Detection

The system automatically detects relationships in entity `data` fields:

```typescript
// Entity with relationships
{
  "ns": "payload",
  "id": "post-123",
  "type": "posts",
  "data": {
    "title": "My Post",
    "author": "user-456",              // Single reference
    "categories": ["tech", "ai"],      // Array of references
    "relatedPosts": ["post-100", "post-200"]
  }
}

// Generated links
{
  "_links": {
    "author": {
      "href": "https://api.do/payload/user-456",
      "title": "author"
    },
    "categories": [
      { "href": "https://api.do/payload/tech", "title": "categories" },
      { "href": "https://api.do/payload/ai", "title": "categories" }
    ],
    "relatedPosts": [
      { "href": "https://api.do/payload/post-100", "title": "relatedPosts" },
      { "href": "https://api.do/payload/post-200", "title": "relatedPosts" }
    ]
  }
}
```

### Cross-Namespace References

Supports `ns:id` format for cross-namespace references:

```typescript
{
  "data": {
    "author": "users:john-doe",        // References users namespace
    "organization": "orgs:acme-corp"   // References orgs namespace
  }
}

// Generated links
{
  "_links": {
    "author": {
      "href": "https://api.do/users/john-doe"
    },
    "organization": {
      "href": "https://api.do/orgs/acme-corp"
    }
  }
}
```

### Relationship Patterns

Common field names that trigger relationship linking:
- **Author/Creator**: `author`, `creator`, `owner`
- **Hierarchy**: `parent`, `child`, `sibling`
- **Categories**: `category`, `categories`, `tag`, `tags`
- **Links**: `related`, `relatedTo`, `linkedTo`
- **Assignments**: `assignee`, `reviewer`, `approver`
- **Organizations**: `organization`, `company`, `team`

## API Navigation

### Discoverable API

All responses include navigable links:

```
GET /
  → _links.things (list entities)
  → _links.search (search entities)
  → _links.relationships (list relationships)

GET /things
  → _links.self (current page)
  → _links.next (next page)
  → _links.prev (previous page)
  → items[].links.self (individual entities)

GET /:ns/:id
  → _links.self (this entity)
  → _links.collection (all entities in namespace)
  → _links.relationships (entity relationships)
  → _links.author (related author entity)
  → _links.update (update this entity)
  → _links.delete (delete this entity)
```

### CRUD Operations

All entities include operation links:

```json
{
  "_links": {
    "update": {
      "href": "https://api.do/payload/post-123",
      "method": "PATCH"
    },
    "delete": {
      "href": "https://api.do/payload/post-123",
      "method": "DELETE"
    }
  }
}
```

## Performance Considerations

### Link Generation

- **Lightweight**: Links generated on-the-fly during response serialization
- **No Database Queries**: Relationship detection uses in-memory data analysis
- **Cached Type Mapping**: Schema.org type lookup is O(1)

### Relationship Detection

- **Selective Scanning**: Only scans known relationship field patterns
- **Lazy Loading**: Links only generated for HTTP responses, not RPC calls
- **Configurable**: `includeRelationships` option can disable detection

### Pagination

- **Efficient Links**: Pagination links use query string parameters
- **No Count Queries**: `hasMore` flag from existing queries (no extra COUNT)
- **Total Pages**: Calculated from total count (when available)

## RPC Interface

**Important**: HATEOAS is **only applied to HTTP responses**. The RPC interface remains unchanged:

```typescript
// RPC Call (no HATEOAS)
const result = await env.DB_SERVICE.get('payload', 'post-123')
// Returns: { ns, id, type, data, ... }

// HTTP Call (with HATEOAS)
GET /payload/post-123
// Returns: { @context, @type, @id, ..., _links }
```

This ensures:
- ✅ No performance overhead for service-to-service calls
- ✅ Backward compatibility with existing RPC consumers
- ✅ Hypermedia benefits only where needed (HTTP API)

## Testing Strategy

### Unit Tests

Should test:
1. **Type Mapping**: `getSchemaOrgType()` for various entity types
2. **Relationship Detection**: `detectRelationships()` for different patterns
3. **Link Generation**: `generateRelationshipLinks()` for single/array refs
4. **Entity Wrapping**: `wrapEntity()` with/without relationships
5. **Collection Wrapping**: `wrapCollection()` with pagination
6. **Error Wrapping**: `wrapError()` for various error types

### Integration Tests

Should test:
1. **GET /things** - Collection response with pagination
2. **GET /:ns/:id** - Entity response with relationship links
3. **POST /things** - Created entity with canonical URL
4. **PATCH /:ns/:id** - Updated entity with links
5. **DELETE /:ns/:id** - Delete action response
6. **GET /search** - Search results with query context
7. **Error Responses** - Consistent error format

### Example Test

```typescript
describe('HATEOAS', () => {
  it('should wrap entity with full metadata', async () => {
    const entity = {
      ns: 'payload',
      id: 'post-123',
      type: 'posts',
      data: {
        title: 'Hello World',
        author: 'user-456',
      },
    }

    const wrapped = wrapEntity(entity, {
      baseUrl: 'https://api.do',
      includeRelationships: true,
    })

    expect(wrapped['@context']).toBe('https://schema.org')
    expect(wrapped['@type']).toBe('BlogPosting')
    expect(wrapped['@id']).toBe('https://api.do/payload/post-123')
    expect(wrapped._links.self.href).toBe('https://api.do/payload/post-123')
    expect(wrapped._links.author.href).toBe('https://api.do/payload/user-456')
  })
})
```

## Client Usage

### JavaScript/TypeScript

```typescript
// Fetch entity with relationships
const response = await fetch('https://api.do/payload/post-123')
const entity = await response.json()

// Navigate to author
const authorResponse = await fetch(entity._links.author.href)
const author = await authorResponse.json()

// Paginate through collection
let page = await fetch('https://api.do/things?ns=payload')
let data = await page.json()

while (data._links.next) {
  page = await fetch(data._links.next.href)
  data = await page.json()
  // Process items...
}
```

### Semantic Web Tools

HATEOAS responses are compatible with:
- **JSON-LD Processors**: Can extract RDF triples
- **Schema.org Validators**: Valid structured data
- **Search Engine Crawlers**: Enhanced SEO with rich snippets

## Next Steps

### Testing (Recommended)

1. **Unit Tests** - Test HATEOAS helper functions
2. **Integration Tests** - Test HTTP endpoints with real data
3. **Performance Tests** - Measure link generation overhead

### Enhancements (Optional)

1. **Link Templates** - RFC 6570 URI templates for dynamic links
2. **Content Negotiation** - Support `Accept: application/json` vs `application/ld+json`
3. **Embedded Resources** - Option to embed related entities (HAL-style)
4. **Custom Link Relations** - IANA link relations for semantic links
5. **Link Context** - Additional metadata (title, type, templated)

### Client Libraries (Future)

1. **TypeScript SDK** - Type-safe HATEOAS client
2. **Python Client** - HAL/HATEOAS navigator
3. **React Hooks** - `useHateoasResource()`, `useHateoasCollection()`

## File Changes

### New Files
- `/Users/nathanclevenger/Projects/.do/workers/db/src/hateoas.ts` (600+ lines)

### Modified Files
- `/Users/nathanclevenger/Projects/.do/workers/db/src/index.ts` (updated all HTTP handlers)

### Lines Changed
- **Added**: ~650 lines (new hateoas.ts module)
- **Modified**: ~400 lines (updated HTTP handlers)
- **Removed**: ~100 lines (old HATEOAS helper)
- **Net Change**: +950 lines

## Challenges Encountered

### 1. Relationship Detection Complexity

**Challenge**: How to reliably detect relationships without schema?

**Solution**: Pattern-based detection using common field naming conventions:
- Scans for known relationship patterns (author, categories, etc.)
- Supports both single references and arrays
- Handles `ns:id` format for cross-namespace refs
- Gracefully handles unknown patterns (no links generated)

### 2. Schema.org Type Mapping

**Challenge**: Mapping generic entity types to Schema.org types

**Solution**: Pragmatic type mapping with sensible defaults:
- Common types mapped to specific Schema.org types
- Falls back to generic `Thing` for unknown types
- Extensible mapping can be customized per deployment

### 3. Performance Considerations

**Challenge**: Link generation overhead on every response

**Solution**: Optimized for minimal overhead:
- No database queries for relationship detection
- In-memory data scanning only
- Links generated during serialization (not stored)
- RPC interface unchanged (no HATEOAS overhead)

### 4. Backward Compatibility

**Challenge**: Existing clients expect current response format

**Solution**: Additive changes only:
- All existing fields preserved
- New fields added (`@context`, `@type`, `@id`, `_links`)
- RPC interface unchanged
- Clients can ignore HATEOAS fields if not needed

## Conclusion

Successfully implemented full HATEOAS support in the db worker with:

✅ **Complete Coverage** - All HTTP endpoints wrapped with HATEOAS
✅ **JSON-LD Integration** - Schema.org context and types
✅ **Relationship Linking** - Automatic detection and navigation
✅ **Pagination Support** - First, prev, next, last links
✅ **Error Consistency** - HATEOAS format for errors
✅ **RPC Unchanged** - No overhead for service-to-service calls
✅ **Type Safe** - Full TypeScript type definitions
✅ **Semantic Web** - Compatible with RDF/JSON-LD tools

The API is now fully navigable via hypermedia links, providing a self-documenting, discoverable REST API with semantic web compatibility.

---

**Implementation Date**: 2025-10-04
**Lines of Code**: ~950 lines (new + modified)
**Files Changed**: 2 (1 new, 1 modified)
**Test Coverage**: Pending (recommended next step)
