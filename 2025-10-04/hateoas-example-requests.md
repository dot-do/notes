# HATEOAS API - Example Requests & Responses

## Overview

This document provides practical examples of HATEOAS API requests and responses for the db worker.

## Basic Operations

### 1. Get Root API Info

**Request:**
```bash
curl https://api.do/
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "service": "database",
  "version": "1.0.0",
  "description": "Comprehensive database abstraction layer for the platform with HATEOAS navigation",
  "_links": {
    "self": { "href": "https://api.do/" },
    "health": { "href": "https://api.do/health" },
    "stats": { "href": "https://api.do/stats" },
    "things": { "href": "https://api.do/things?ns=default" },
    "relationships": { "href": "https://api.do/api/relationships?ns=default" },
    "search": { "href": "https://api.do/search?q=query" }
  }
}
```

### 2. List Entities

**Request:**
```bash
curl 'https://api.do/things?ns=payload&type=posts&page=1&limit=2'
```

**Response:**
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
      "data": {
        "title": "Getting Started with HATEOAS",
        "slug": "getting-started-hateoas",
        "author": "user-456",
        "categories": ["tech", "api-design"],
        "publishedAt": "2025-10-04T10:00:00Z"
      },
      "content": "HATEOAS (Hypermedia as the Engine of Application State) is...",
      "createdAt": "2025-10-04T10:00:00Z",
      "updatedAt": "2025-10-04T11:30:00Z",
      "_links": {
        "self": { "href": "https://api.do/payload/post-123" },
        "collection": { "href": "https://api.do/things?ns=payload&type=posts" },
        "namespace": { "href": "https://api.do/things?ns=payload" },
        "author": { "href": "https://api.do/payload/user-456", "title": "author" },
        "categories": [
          { "href": "https://api.do/payload/tech", "title": "categories" },
          { "href": "https://api.do/payload/api-design", "title": "categories" }
        ],
        "update": { "href": "https://api.do/payload/post-123", "method": "PATCH" },
        "delete": { "href": "https://api.do/payload/post-123", "method": "DELETE" },
        "relationships": { "href": "https://api.do/payload/post-123.relationships" }
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://api.do/payload/post-456",
      "ns": "payload",
      "id": "post-456",
      "type": "posts",
      "data": {
        "title": "RESTful API Best Practices",
        "slug": "restful-api-best-practices",
        "author": "user-789"
      },
      "_links": {
        "self": { "href": "https://api.do/payload/post-456" },
        "author": { "href": "https://api.do/payload/user-789" }
      }
    }
  ],
  "totalItems": 42,
  "_links": {
    "self": { "href": "https://api.do/things?ns=payload&type=posts&page=1" },
    "home": { "href": "https://api.do" },
    "next": { "href": "https://api.do/things?ns=payload&type=posts&page=2" },
    "last": { "href": "https://api.do/things?ns=payload&type=posts&page=21" }
  },
  "_meta": {
    "page": 1,
    "limit": 2,
    "total": 42,
    "hasMore": true
  }
}
```

### 3. Get Single Entity

**Request:**
```bash
curl https://api.do/payload/post-123
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://api.do/payload/post-123",
  "ns": "payload",
  "id": "post-123",
  "type": "posts",
  "data": {
    "title": "Getting Started with HATEOAS",
    "slug": "getting-started-hateoas",
    "author": "user-456",
    "categories": ["tech", "api-design"],
    "relatedPosts": ["post-789", "post-321"],
    "publishedAt": "2025-10-04T10:00:00Z",
    "status": "published"
  },
  "content": "# Getting Started with HATEOAS\n\nHATEOAS (Hypermedia as the Engine of Application State) is a constraint of the REST application architecture...",
  "createdAt": "2025-10-04T10:00:00Z",
  "updatedAt": "2025-10-04T11:30:00Z",
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
        "href": "https://api.do/payload/api-design",
        "title": "categories"
      }
    ],
    "relatedPosts": [
      {
        "href": "https://api.do/payload/post-789",
        "title": "relatedPosts"
      },
      {
        "href": "https://api.do/payload/post-321",
        "title": "relatedPosts"
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

### 4. Create Entity

**Request:**
```bash
curl -X POST https://api.do/things \
  -H 'Content-Type: application/json' \
  -d '{
    "ns": "payload",
    "id": "post-999",
    "type": "posts",
    "data": {
      "title": "New Post",
      "slug": "new-post",
      "author": "user-123"
    },
    "content": "This is a new post."
  }'
```

**Response (201 Created):**
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://api.do/payload/post-999",
  "ns": "payload",
  "id": "post-999",
  "type": "posts",
  "data": {
    "title": "New Post",
    "slug": "new-post",
    "author": "user-123"
  },
  "content": "This is a new post.",
  "createdAt": "2025-10-04T12:00:00Z",
  "updatedAt": "2025-10-04T12:00:00Z",
  "_links": {
    "self": { "href": "https://api.do/payload/post-999" },
    "collection": { "href": "https://api.do/things?ns=payload&type=posts" },
    "author": { "href": "https://api.do/payload/user-123" },
    "update": { "href": "https://api.do/payload/post-999", "method": "PATCH" },
    "delete": { "href": "https://api.do/payload/post-999", "method": "DELETE" }
  }
}
```

### 5. Update Entity

**Request:**
```bash
curl -X PATCH https://api.do/payload/post-999 \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "title": "Updated Post Title",
      "status": "draft"
    }
  }'
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://api.do/payload/post-999",
  "ns": "payload",
  "id": "post-999",
  "type": "posts",
  "data": {
    "title": "Updated Post Title",
    "slug": "new-post",
    "author": "user-123",
    "status": "draft"
  },
  "content": "This is a new post.",
  "createdAt": "2025-10-04T12:00:00Z",
  "updatedAt": "2025-10-04T12:30:00Z",
  "_links": {
    "self": { "href": "https://api.do/payload/post-999" },
    "collection": { "href": "https://api.do/things?ns=payload&type=posts" },
    "author": { "href": "https://api.do/payload/user-123" },
    "update": { "href": "https://api.do/payload/post-999", "method": "PATCH" },
    "delete": { "href": "https://api.do/payload/post-999", "method": "DELETE" }
  }
}
```

### 6. Delete Entity

**Request:**
```bash
curl -X DELETE https://api.do/payload/post-999
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "DeleteAction",
  "success": true,
  "message": "Deleted payload:post-999",
  "_links": {
    "self": { "href": "https://api.do/payload/post-999" },
    "home": { "href": "https://api.do" },
    "collection": { "href": "https://api.do/things?ns=payload" }
  }
}
```

## Search Operations

### 7. Full-Text Search

**Request:**
```bash
curl 'https://api.do/search?q=hateoas&ns=payload&limit=3'
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/search?q=hateoas&ns=payload&limit=3",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://api.do/payload/post-123",
      "ns": "payload",
      "id": "post-123",
      "type": "posts",
      "score": 0.95,
      "_links": {
        "self": { "href": "https://api.do/payload/post-123" }
      }
    }
  ],
  "totalItems": 1,
  "_links": {
    "self": { "href": "https://api.do/search?q=hateoas&ns=payload&limit=3" },
    "home": { "href": "https://api.do" }
  }
}
```

### 8. Vector Search

**Request:**
```bash
curl -X POST https://api.do/api/search/vector \
  -H 'Content-Type: application/json' \
  -d '{
    "embedding": [0.1, 0.2, ..., 0.768],
    "ns": "payload",
    "limit": 5,
    "minScore": 0.7,
    "model": "gemma-768"
  }'
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/search?q=vector",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://api.do/payload/post-123",
      "distance": 0.234,
      "score": 0.89,
      "_links": {
        "self": { "href": "https://api.do/payload/post-123" }
      }
    }
  ],
  "totalItems": 5,
  "_links": {
    "self": { "href": "https://api.do/api/search/vector" },
    "home": { "href": "https://api.do" }
  }
}
```

## Relationship Operations

### 9. Get Entity Relationships

**Request:**
```bash
curl https://api.do/payload/post-123.relationships
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/payload/post-123.relationships",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "Thing",
      "@id": "https://api.do/default/rel-1",
      "fromNs": "payload",
      "fromId": "post-123",
      "toNs": "payload",
      "toId": "user-456",
      "type": "author",
      "_links": {
        "from": { "href": "https://api.do/payload/post-123" },
        "to": { "href": "https://api.do/payload/user-456" }
      }
    }
  ],
  "totalItems": 5,
  "_links": {
    "self": { "href": "https://api.do/payload/post-123.relationships" },
    "thing": { "href": "https://api.do/payload/post-123" }
  }
}
```

### 10. Get Incoming Relationships

**Request:**
```bash
curl 'https://api.do/api/relationships/payload/user-456/incoming'
```

**Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "@id": "https://api.do/api/relationships/payload/user-456/incoming",
  "items": [
    {
      "@context": "https://schema.org",
      "@type": "Thing",
      "fromNs": "payload",
      "fromId": "post-123",
      "toNs": "payload",
      "toId": "user-456",
      "type": "author",
      "_links": {
        "from": { "href": "https://api.do/payload/post-123" },
        "to": { "href": "https://api.do/payload/user-456" }
      }
    }
  ],
  "_links": {
    "thing": { "href": "https://api.do/api/things/payload/user-456" },
    "outgoing": { "href": "https://api.do/api/relationships/payload/user-456" }
  }
}
```

## Error Responses

### 11. Not Found

**Request:**
```bash
curl https://api.do/payload/post-nonexistent
```

**Response (404):**
```json
{
  "@context": "https://schema.org",
  "@type": "Error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Thing not found: payload:post-nonexistent"
  },
  "_links": {
    "self": { "href": "https://api.do/payload/post-nonexistent" },
    "home": { "href": "https://api.do" }
  }
}
```

### 12. Bad Request

**Request:**
```bash
curl -X POST https://api.do/api/search/vector \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Response (400):**
```json
{
  "@context": "https://schema.org",
  "@type": "Error",
  "error": {
    "code": "BAD_REQUEST",
    "message": "embedding array is required"
  },
  "_links": {
    "self": { "href": "https://api.do/api/search/vector" },
    "home": { "href": "https://api.do" }
  }
}
```

## Client Examples

### JavaScript/TypeScript

```typescript
// Fetch entity with relationships
async function fetchWithRelated(url: string) {
  const response = await fetch(url)
  const entity = await response.json()

  // Navigate to author
  if (entity._links.author) {
    const author = await fetch(entity._links.author.href).then(r => r.json())
    entity.authorData = author
  }

  // Navigate to categories
  if (entity._links.categories) {
    const categories = await Promise.all(
      entity._links.categories.map((link: any) =>
        fetch(link.href).then(r => r.json())
      )
    )
    entity.categoryData = categories
  }

  return entity
}

// Paginate through all results
async function fetchAll(startUrl: string) {
  const allItems = []
  let url = startUrl

  while (url) {
    const response = await fetch(url)
    const data = await response.json()

    allItems.push(...data.items)

    url = data._links.next?.href || null
  }

  return allItems
}

// Usage
const entity = await fetchWithRelated('https://api.do/payload/post-123')
const allPosts = await fetchAll('https://api.do/things?ns=payload&type=posts')
```

### Python

```python
import requests

def fetch_with_related(url):
    """Fetch entity and follow relationship links"""
    response = requests.get(url)
    entity = response.json()

    # Navigate to author
    if 'author' in entity['_links']:
        author_url = entity['_links']['author']['href']
        entity['authorData'] = requests.get(author_url).json()

    return entity

def fetch_all(start_url):
    """Paginate through all results"""
    all_items = []
    url = start_url

    while url:
        response = requests.get(url)
        data = response.json()

        all_items.extend(data['items'])

        url = data['_links'].get('next', {}).get('href')

    return all_items

# Usage
entity = fetch_with_related('https://api.do/payload/post-123')
all_posts = fetch_all('https://api.do/things?ns=payload&type=posts')
```

---

**Last Updated**: 2025-10-04
**API Version**: 1.0.0
