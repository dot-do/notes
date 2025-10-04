# GraphDL → MDXLD Quick Reference

**Quick lookup for converting GraphDL concepts to MDXLD patterns.**

---

## Core Concepts

| GraphDL | MDXLD | Template | Notes |
|---------|-------|----------|-------|
| Graph | Collection | `graph-collection-template.mdx` | Group of related entities |
| Noun | Thing | `noun-thing-template.mdx` | Entity/type definition |
| Verb | Function | `verb-function-template.mdx` | Action/operation |
| Property | Frontmatter YAML | - | Data in YAML-LD format |
| Resource | Database record | - | Instance in `things` table |
| Action | Function call | - | MCP/RPC/API execution |
| Trigger | Queue/Event | `workflow-template.mdx` | Event-driven execution |
| Event | Event log | - | EPCIS 2.0 events table |

---

## Syntax Comparison

### Defining an Entity (Noun)

**GraphDL:**
```yaml
graph: ECommerce
  nouns:
    Product:
      properties:
        name: string
        price: number
        inventory: integer
```

**MDXLD:**
```mdx
---
$context: https://schema.org
$type: Product
name: Product Name
price: 49.99
inventory: 100
metadata:
  ns: products
  visibility: public
---

# Product

Product documentation here.

\`\`\`typescript
export interface Product {
  name: string
  price: number
  inventory: number
}
\`\`\`
```

---

### Defining an Action (Verb)

**GraphDL:**
```yaml
verbs:
  purchase:
    subject: User
    object: Product
    creates: Order
    implementation: ./handlers/purchase.ts
    validation: |
      (input) => {
        if (input.quantity <= 0) throw new Error('Invalid quantity')
      }
```

**MDXLD:**
```mdx
---
$type: Function
title: Purchase Product
subject: User
object: Product
creates: Order
inputs:
  - name: userId
    type: string
    required: true
  - name: productId
    type: string
    required: true
  - name: quantity
    type: number
    required: true
outputs:
  - name: orderId
    type: string
---

# Purchase Product

\`\`\`typescript
export async function purchaseProduct({
  userId,
  productId,
  quantity
}: PurchaseInput): Promise<PurchaseOutput> {
  // Validation
  if (quantity <= 0) {
    throw new Error('Invalid quantity')
  }

  // Implementation
  const order = await createOrder(userId, productId, quantity)

  return { orderId: order.id }
}
\`\`\`

\`\`\`typescript test
describe('purchaseProduct', () => {
  it('validates quantity', async () => {
    await expect(
      purchaseProduct({ userId: '1', productId: '1', quantity: 0 })
    ).rejects.toThrow('Invalid quantity')
  })
})
\`\`\`
```

---

### Defining a Graph/Collection

**GraphDL:**
```yaml
graph: ECommerce
  nouns:
    - User
    - Product
    - Order
  verbs:
    - purchase
    - review
    - refund
```

**MDXLD:**
```mdx
---
$type: Collection
title: E-commerce
description: Complete e-commerce functionality
metadata:
  ns: collections
  visibility: public
relatedTo:
  # Nouns
  - /types/User
  - /types/Product
  - /types/Order
  # Verbs
  - /functions/purchase
  - /functions/review
  - /functions/refund
---

# E-commerce Collection

All entities needed for e-commerce.

## Entities (Nouns)

- **User** - Customer accounts
- **Product** - Items for sale
- **Order** - Purchase records

## Actions (Verbs)

- **purchase** - Buy a product
- **review** - Submit product review
- **refund** - Process refund

\`\`\`typescript
// Export all collection members
export * from './types/User'
export * from './types/Product'
export * from './types/Order'
export * from './functions/purchase'
export * from './functions/review'
export * from './functions/refund'
\`\`\`
```

---

### URL Imports (Composition)

**GraphDL:**
```yaml
imports:
  - https://graphdl.org/schemas/common/User.gdl
  - https://graphdl.org/schemas/common/Address.gdl

graph: MyApp
  nouns:
    Customer:
      extends: User
      properties:
        customerId: string
```

**MDXLD:**
```mdx
---
$type: Person
title: Customer
extends: User
metadata:
  ns: customers
---

# Customer

import { User } from 'https://raw.githubusercontent.com/schemas/user.mdx'
import { Address } from 'https://raw.githubusercontent.com/schemas/address.mdx'

\`\`\`typescript
export interface Customer extends User {
  customerId: string
  addresses: Address[]
}
\`\`\`
```

---

### Triggers & Events

**GraphDL:**
```yaml
triggers:
  onUserCreated:
    event: user.created
    action: sendWelcomeEmail
    schedule: null
```

**MDXLD:**
```mdx
---
$type: Workflow
title: User Onboarding
trigger:
  type: webhook
  event: user.created
steps:
  - id: send-welcome
    function: /functions/send-welcome-email
---

# User Onboarding

\`\`\`typescript
export async function onUserCreated(data: UserCreatedEvent) {
  await sendWelcomeEmail({
    to: data.email,
    name: data.name
  })
}
\`\`\`
```

---

### Relationships

**GraphDL:**
```yaml
verbs:
  hasMany:
    subject: User
    object: Order
    relationship: ownership

  belongsTo:
    subject: Order
    object: User
    relationship: ownership
```

**MDXLD:**

Relationships are stored in database and queryable:

```typescript
// Create relationship
await db.relationships.create({
  ns: 'relationships',
  id: 'user-123:hasMany:orders',
  type: 'hasMany',
  fromNs: 'users',
  fromId: 'user-123',
  toNs: 'orders',
  toId: 'order-456',
  data: { role: 'owner' }
})

// Query relationships
const orders = await db.query(`
  SELECT t.*
  FROM things t
  JOIN relationships r ON (r.toNs = t.ns AND r.toId = t.id)
  WHERE r.fromNs = 'users'
    AND r.fromId = 'user-123'
    AND r.type = 'hasMany'
`)
```

Or via frontmatter:

```mdx
---
$type: Person
title: User
relatedTo:
  - type: hasMany
    entity: /orders/order-456
    role: owner
---
```

---

## Code Generation

### GraphDL Approach

**Define schema:**
```yaml
# schema.gdl
graph: MyApp
  nouns:
    Product:
      properties:
        name: string
        price: number
```

**Generate code:**
```bash
graphdl generate schema.gdl --output src/ --targets js,graphql,openapi
```

**Results:**
- `src/models/Product.js` - Generated model
- `src/schema.graphql` - GraphQL schema
- `src/openapi.yaml` - OpenAPI spec

**Problems:**
- ❌ Generated code is hard to customize
- ❌ Changes to schema regenerate everything
- ❌ Debugging generated code is difficult
- ❌ Build step required

### MDXLD Approach

**Write TypeScript directly:**
```mdx
---
$type: Product
---

\`\`\`typescript
export interface Product {
  name: string
  price: number
}
\`\`\`
```

**Generate artifacts on-demand:**
```bash
mdxld build product.mdx --targets openapi,graphql,sdk
```

**Results:**
- `build/openapi.yaml` - OpenAPI spec (generated from TypeScript)
- `build/schema.graphql` - GraphQL schema (generated)
- `build/sdk.ts` - SDK client (generated)

**Benefits:**
- ✅ Write code directly, no DSL
- ✅ Customize anything
- ✅ Debug easily
- ✅ Optional generation
- ✅ Source is executable

---

## Migration Checklist

Converting a GraphDL project to MDXLD:

### 1. Analyze GraphDL Structure

```bash
# List all nouns
grep -r "nouns:" *.gdl

# List all verbs
grep -r "verbs:" *.gdl

# List all graphs
grep -r "graph:" *.gdl
```

### 2. Create Directory Structure

```bash
mkdir -p types functions workflows collections
```

### 3. Convert Nouns

For each noun in GraphDL:

```bash
cp templates/noun-thing-template.mdx types/noun-name.mdx
# Edit and fill in details
```

### 4. Convert Verbs

For each verb in GraphDL:

```bash
cp templates/verb-function-template.mdx functions/verb-name.mdx
# Copy implementation from verb's `implementation` file
```

### 5. Convert Graphs

For each graph in GraphDL:

```bash
cp templates/graph-collection-template.mdx collections/graph-name.mdx
# Add all nouns and verbs to `relatedTo`
```

### 6. Test

```bash
# Run tests for all entities
pnpm test

# Type check
pnpm check-types

# Build
pnpm build
```

### 7. Deploy

```bash
# Deploy to API
pnpm deploy

# Or publish to marketplace
pnpm publish
```

---

## Common Patterns

### Pattern 1: CRUD Operations

**GraphDL:**
```yaml
verbs:
  createProduct: {...}
  readProduct: {...}
  updateProduct: {...}
  deleteProduct: {...}
```

**MDXLD:**

One file per operation:
- `functions/create-product.mdx`
- `functions/get-product.mdx`
- `functions/update-product.mdx`
- `functions/delete-product.mdx`

Or one file with all operations:
```mdx
---
$type: Collection
title: Product CRUD
---

\`\`\`typescript
export async function createProduct(data: ProductInput) { ... }
export async function getProduct(id: string) { ... }
export async function updateProduct(id: string, data: ProductInput) { ... }
export async function deleteProduct(id: string) { ... }
\`\`\`
```

### Pattern 2: Validation

**GraphDL:**
```yaml
verbs:
  createProduct:
    validation: |
      (input) => {
        if (!input.name) throw new Error('Name required')
      }
```

**MDXLD:**
```mdx
\`\`\`typescript
import { z } from 'zod'

const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive()
})

export async function createProduct(data: unknown) {
  const validated = ProductSchema.parse(data)
  // Create product
}
\`\`\`
```

### Pattern 3: Relationships

**GraphDL:**
```yaml
nouns:
  User:
    relationships:
      orders:
        type: hasMany
        target: Order
```

**MDXLD:**
```mdx
---
$type: Person
title: User
relatedTo:
  - /types/Order
---

\`\`\`typescript
export interface User {
  id: string
  orders: Order[]  // Virtual property
}

// Query orders for user
export async function getUserOrders(userId: string) {
  return db.query(`
    SELECT o.*
    FROM orders o
    JOIN relationships r ON (r.toNs = 'orders' AND r.toId = o.id)
    WHERE r.fromNs = 'users'
      AND r.fromId = $1
      AND r.type = 'hasMany'
  `, [userId])
}
\`\`\`
```

---

## Feature Comparison

| Feature | GraphDL | MDXLD |
|---------|---------|-------|
| **Definition Language** | Custom YAML DSL | Markdown + YAML + TypeScript |
| **Code Generation** | Required | Optional |
| **Type Safety** | Via generator | Native TypeScript |
| **Testing** | External | Inline test blocks |
| **Documentation** | Separate | Integrated Markdown |
| **AI Integration** | Limited | Native |
| **Execution Model** | Unclear | Direct (Workers/Node) |
| **Debugging** | Generated code | Source code |
| **IDE Support** | Limited | Full (VSCode, Cursor) |
| **Learning Curve** | Steep (custom DSL) | Gentle (familiar tools) |
| **Composition** | URL imports | ES modules + graph |
| **Relationships** | Schema-defined | Database-backed |
| **Multi-Output** | Generator configs | Build targets |
| **Validation** | Inline YAML | Zod/TypeScript |
| **Extensibility** | Limited | Infinite |

---

## When to Use What

### Use Thing Template When:

- ✅ Defining a data model or type
- ✅ Creating an entity with properties
- ✅ Modeling Schema.org types
- ✅ Need database records

### Use Function Template When:

- ✅ Implementing business logic
- ✅ Creating API endpoints
- ✅ Building reusable operations
- ✅ Defining verb/actions

### Use Collection Template When:

- ✅ Grouping related entities
- ✅ Creating a feature module
- ✅ Modeling a subdomain
- ✅ Building a package

### Use Workflow Template When:

- ✅ Multi-step processes
- ✅ Event-driven automation
- ✅ Orchestrating multiple functions
- ✅ Business process modeling

---

## Resources

- **Full Analysis:** `/notes/2025-10-02-graphdl-reimagined.md`
- **Templates:** `/ctx/templates/`
- **Examples:** `/ctx/examples/`
- **MDXLD Spec:** `https://mdxld.org/spec`

---

**Last Updated:** October 2, 2025
**Status:** Reference Guide
**Maintained By:** Claude Code
