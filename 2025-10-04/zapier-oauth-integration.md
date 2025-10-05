# Zapier OAuth Integration Plan

**Date:** 2025-10-04
**Status:** Planning
**Author:** Claude Code

## Overview

Integrate Zapier with the .do platform to enable no-code automation workflows. Unlike other OAuth integrations where we act as the OAuth **client**, with Zapier we must act as the OAuth **provider** while simultaneously building a Zapier integration app.

## Key Distinction: Zapier's Unique Requirements

### Traditional OAuth Integration (Vercel, Netlify, etc.)
```
User → .do Platform → External OAuth Provider → Grant Access
```

### Zapier Integration (Reversed)
```
Zapier User → Zapier → .do OAuth Provider → Grant Access to .do APIs
```

**We must:**
1. ✅ Be an OAuth **provider** (already have oauth.do via WorkOS)
2. Build a Zapier **integration app** (triggers, actions, searches)
3. Register Zapier as an OAuth **client** in our system

## Research Summary

### Zapier OAuth Requirements

**What Zapier Needs from Us:**
- OAuth 2.0 authorization endpoint
- OAuth 2.0 token endpoint
- Optional: Refresh token endpoint
- API endpoints for triggers/actions/searches

**OAuth Flow:**
1. User adds .do integration in Zapier
2. Zapier redirects to our authorization endpoint
3. User authorizes Zapier to access their .do account
4. We redirect back to Zapier with authorization code
5. Zapier exchanges code for access token
6. Zapier stores token and uses for API calls

### OAuth Grant Type

Zapier uses **Authorization Code** grant:
- Most secure OAuth flow
- Client secret exchanged server-side
- Supports refresh tokens
- State parameter for CSRF protection

### PKCE Support

Zapier recommends PKCE (Proof Key for Code Exchange):
- Additional security layer
- Prevents authorization code interception
- Optional but recommended

## Current .do OAuth Infrastructure

### oauth.do (Already Implemented)

**Tech:** WorkOS SDK
**URL:** `https://oauth.do`
**Status:** ✅ Production Ready

**Endpoints:**
- Authorization: `https://oauth.do/authorize`
- Token: `https://oauth.do/token`
- Refresh: `https://oauth.do/refresh`
- UserInfo: `https://oauth.do/userinfo`
- Device: `https://oauth.do/device` (device flow)

**Features:**
- OAuth 2.1 compliant
- Multiple grant types
- Refresh token support
- PKCE support
- Rate limiting
- Audit logging

**Configuration:** `workers/oauth/src/index.ts`

### workers/auth (Authentication Service)

**Purpose:** Platform-wide authentication
**Interfaces:** RPC, HTTP, MCP

**Relevant Features:**
- User management
- API key management
- Session management
- RBAC

## Architecture

### High-Level Flow

```
Zapier Platform
      ↓ OAuth request
oauth.do (WorkOS)
      ↓ Authorization
User grants access
      ↓ Code
Zapier exchanges code
      ↓ Access token
Zapier stores token
      ↓ API calls
api.do (Gateway)
      ↓ Authentication
workers/auth validates
      ↓ RPC calls
Domain workers (agents, workflows, etc.)
```

### Components

**1. OAuth Provider (oauth.do)** ✅ Exists
- Handle OAuth flows
- Issue access tokens
- Validate tokens
- Refresh tokens

**2. Zapier OAuth Client** 🆕 Need to create
- Register in oauth.do
- Configure redirect URIs
- Set scopes

**3. Zapier Platform App** 🆕 Need to create
- Define authentication
- Implement triggers
- Implement actions
- Implement searches

**4. API Endpoints** 🆕 Need to create
- Polling triggers
- Instant triggers (webhooks)
- Create/update actions
- Search endpoints

## Implementation Plan

### Phase 1: Register Zapier as OAuth Client

**Goal:** Configure oauth.do to accept Zapier as a trusted OAuth client.

**Steps:**

1. **Add Zapier client to oauth.do database:**

```sql
-- Via DB service
INSERT INTO oauth_clients (
  id,
  client_id,
  client_secret,
  name,
  redirect_uris,
  allowed_scopes,
  client_type,
  created_at
) VALUES (
  'zapier-client',
  'zapier-<random>',
  '<hashed-secret>',
  'Zapier Integration',
  ARRAY['https://zapier.com/dashboard/auth/oauth/return/App{APP_ID}API/'],
  ARRAY['openid', 'email', 'profile', 'api:read', 'api:write'],
  'confidential',
  EXTRACT(EPOCH FROM NOW()) * 1000
);
```

2. **Configure oauth.do to recognize Zapier:**

Edit `workers/oauth/src/index.ts` or configuration:
```typescript
const zapierClient = {
  clientId: 'zapier-<random>',
  clientSecret: env.ZAPIER_CLIENT_SECRET, // from secrets
  redirectUris: [
    'https://zapier.com/dashboard/auth/oauth/return/App{APP_ID}API/'
  ],
  allowedScopes: ['openid', 'email', 'profile', 'api:read', 'api:write'],
}
```

3. **Set secrets:**
```bash
cd workers/oauth
wrangler secret put ZAPIER_CLIENT_ID
wrangler secret put ZAPIER_CLIENT_SECRET
```

**Output:**
- Client ID for Zapier config
- Client secret for Zapier config
- Confirmed redirect URI

---

### Phase 2: Create Zapier Platform App

**Goal:** Build and configure Zapier integration app.

**Requirements:**
- Node.js 18+
- Zapier CLI: `npm install -g zapier-platform-cli`
- Zapier account (free developer account)

**Steps:**

1. **Initialize Zapier project:**

```bash
cd integrations
zapier init dotdo-zapier
cd dotdo-zapier
```

2. **Configure authentication:**

Edit `authentication.js`:
```javascript
module.exports = {
  type: 'oauth2',
  oauth2Config: {
    // Step 1: User authorization
    authorizeUrl: {
      url: 'https://oauth.do/authorize',
      params: {
        client_id: '{{process.env.CLIENT_ID}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
        scope: 'openid email profile api:read api:write',
        state: '{{bundle.inputData.state}}',
      },
    },

    // Step 2: Exchange code for token
    getAccessToken: {
      url: 'https://oauth.do/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: {
        grant_type: 'authorization_code',
        code: '{{bundle.inputData.code}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
      },
    },

    // Step 3: Refresh token (optional but recommended)
    refreshAccessToken: {
      url: 'https://oauth.do/refresh',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: {
        grant_type: 'refresh_token',
        refresh_token: '{{bundle.authData.refresh_token}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
      },
    },

    // Automatically refresh before expiration
    autoRefresh: true,
  },

  // Test authentication (call a simple endpoint)
  test: {
    url: 'https://oauth.do/userinfo',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer {{bundle.authData.access_token}}',
    },
  },

  // Connection label shown in Zapier
  connectionLabel: '{{email}}',
}
```

3. **Set environment variables:**

```bash
zapier env:set 1.0.0 CLIENT_ID=<zapier-client-id>
zapier env:set 1.0.0 CLIENT_SECRET=<zapier-client-secret>
```

**Output:**
- Configured Zapier app
- OAuth flow ready

---

### Phase 3: Define API Endpoints

**Goal:** Create API endpoints for Zapier to poll or subscribe to.

**Endpoint Requirements:**
- Return JSON
- Paginated (for polling triggers)
- Include `id` field for deduplication
- Consistent data structure

**Example Endpoints:**

1. **List Agents (Polling Trigger)**

```
GET https://api.do/zapier/agents
Authorization: Bearer <token>
Query params: ?limit=100&created_after=2025-01-01T00:00:00Z
```

Response:
```json
{
  "data": [
    {
      "id": "agent-123",
      "name": "Customer Support Agent",
      "type": "chat",
      "created_at": "2025-10-01T12:00:00Z",
      "updated_at": "2025-10-01T12:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 100,
    "has_more": false
  }
}
```

2. **List Workflow Runs (Polling Trigger)**

```
GET https://api.do/zapier/workflow-runs
Authorization: Bearer <token>
Query params: ?limit=100&completed_after=2025-01-01T00:00:00Z
```

Response:
```json
{
  "data": [
    {
      "id": "run-456",
      "workflow_id": "workflow-123",
      "workflow_name": "Customer Onboarding",
      "status": "completed",
      "input": { /* ... */ },
      "output": { /* ... */ },
      "started_at": "2025-10-01T12:00:00Z",
      "completed_at": "2025-10-01T12:05:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 100,
    "has_more": false
  }
}
```

3. **Create Agent (Action)**

```
POST https://api.do/zapier/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Agent",
  "type": "chat",
  "instructions": "Help customers with...",
  "model": "gpt-4"
}
```

Response:
```json
{
  "id": "agent-789",
  "name": "New Agent",
  "type": "chat",
  "created_at": "2025-10-01T12:00:00Z"
}
```

4. **Run Workflow (Action)**

```
POST https://api.do/zapier/workflow-runs
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflow_id": "workflow-123",
  "input": {
    "customer_email": "john@example.com",
    "plan": "premium"
  },
  "wait_for_completion": false
}
```

Response:
```json
{
  "id": "run-999",
  "workflow_id": "workflow-123",
  "status": "running",
  "started_at": "2025-10-01T12:00:00Z"
}
```

5. **Find Agent (Search)**

```
GET https://api.do/zapier/agents/search
Authorization: Bearer <token>
Query params: ?name=Support&type=chat
```

Response:
```json
{
  "data": [
    {
      "id": "agent-123",
      "name": "Customer Support Agent",
      "type": "chat",
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

**Implementation:**

Create `workers/api/src/routes/zapier.ts`:
```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Env }>()

// All Zapier endpoints require authentication
app.use('*', authMiddleware)

// Triggers
app.get('/agents', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const createdAfter = c.req.query('created_after')

  const agents = await c.env.DB.query(
    `SELECT * FROM agents WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT ?`,
    c.get('userId'),
    createdAfter || '1970-01-01',
    limit
  )

  return c.json({
    data: agents,
    meta: {
      total: agents.length,
      limit,
      has_more: agents.length === limit,
    },
  })
})

app.get('/workflow-runs', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const completedAfter = c.req.query('completed_after')

  const runs = await c.env.DB.query(
    `SELECT * FROM workflow_runs WHERE user_id = ? AND completed_at > ? ORDER BY completed_at DESC LIMIT ?`,
    c.get('userId'),
    completedAfter || '1970-01-01',
    limit
  )

  return c.json({
    data: runs,
    meta: {
      total: runs.length,
      limit,
      has_more: runs.length === limit,
    },
  })
})

// Actions
app.post('/agents', async (c) => {
  const body = await c.req.json()

  const schema = z.object({
    name: z.string().min(1),
    type: z.string(),
    instructions: z.string().optional(),
    model: z.string().optional(),
  })

  const data = schema.parse(body)

  const agent = await c.env.AGENTS_SERVICE.create(c.get('userId'), data)

  return c.json(agent, 201)
})

app.post('/workflow-runs', async (c) => {
  const body = await c.req.json()

  const schema = z.object({
    workflow_id: z.string(),
    input: z.record(z.any()),
    wait_for_completion: z.boolean().default(false),
  })

  const data = schema.parse(body)

  const run = await c.env.WORKFLOWS_SERVICE.run(
    c.get('userId'),
    data.workflow_id,
    data.input,
    { wait: data.wait_for_completion }
  )

  return c.json(run, 201)
})

// Searches
app.get('/agents/search', async (c) => {
  const name = c.req.query('name')
  const type = c.req.query('type')

  const agents = await c.env.DB.query(
    `SELECT * FROM agents WHERE user_id = ? AND name ILIKE ? AND type = ? LIMIT 25`,
    c.get('userId'),
    `%${name}%`,
    type
  )

  return c.json({ data: agents })
})

export default app
```

Add to gateway routing:
```typescript
// workers/gateway/src/index.ts
if (url.pathname.startsWith('/zapier/')) {
  return env.API_SERVICE.fetch(request)
}
```

---

### Phase 4: Implement Zapier Triggers

**Goal:** Define polling and instant triggers in Zapier app.

**Types of Triggers:**
1. **Polling Triggers** - Zapier polls API every 5-15 minutes
2. **Instant Triggers** - Webhooks (recommended for real-time)

**Polling Trigger Example: "New Agent"**

Create `triggers/new_agent.js`:
```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/agents',
    params: {
      limit: 100,
      created_after: bundle.meta.page ? bundle.meta.page.created_after : undefined,
    },
  })

  const data = response.json

  return data.data
}

module.exports = {
  key: 'new_agent',
  noun: 'Agent',
  display: {
    label: 'New Agent',
    description: 'Triggers when a new agent is created.',
  },
  operation: {
    perform,
    inputFields: [],
    sample: {
      id: 'agent-123',
      name: 'Customer Support Agent',
      type: 'chat',
      created_at: '2025-10-01T12:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Agent ID' },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  },
}
```

**Instant Trigger Example: "Workflow Completed"**

Create `triggers/workflow_completed.js`:
```javascript
// Subscribe to webhook
const subscribeHook = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/webhooks',
    method: 'POST',
    body: {
      target_url: bundle.targetUrl,
      event: 'workflow.completed',
    },
  })

  return response.json
}

// Unsubscribe from webhook
const unsubscribeHook = async (z, bundle) => {
  await z.request({
    url: `https://api.do/zapier/webhooks/${bundle.subscribeData.id}`,
    method: 'DELETE',
  })

  return true
}

// Process incoming webhook
const perform = async (z, bundle) => {
  return [bundle.cleanedRequest] // Return as array
}

module.exports = {
  key: 'workflow_completed',
  noun: 'Workflow Run',
  display: {
    label: 'Workflow Completed',
    description: 'Triggers instantly when a workflow run completes.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform,
    performList: async (z, bundle) => {
      // Fallback polling for testing
      const response = await z.request({
        url: 'https://api.do/zapier/workflow-runs',
        params: { limit: 3 },
      })
      return response.json.data
    },
    inputFields: [
      {
        key: 'workflow_id',
        label: 'Workflow',
        type: 'string',
        dynamic: 'workflow.id.name', // Dynamic dropdown
        required: false,
      },
    ],
    sample: {
      id: 'run-456',
      workflow_id: 'workflow-123',
      workflow_name: 'Customer Onboarding',
      status: 'completed',
      completed_at: '2025-10-01T12:05:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Run ID' },
      { key: 'workflow_id', label: 'Workflow ID' },
      { key: 'workflow_name', label: 'Workflow Name' },
      { key: 'status', label: 'Status' },
      { key: 'output', label: 'Output', type: 'string' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
  },
}
```

**Webhook Support (for instant triggers):**

Add webhook endpoints to `workers/api/src/routes/zapier.ts`:
```typescript
// Create webhook subscription
app.post('/webhooks', async (c) => {
  const body = await c.req.json()

  const schema = z.object({
    target_url: z.string().url(),
    event: z.string(),
  })

  const data = schema.parse(body)

  const webhook = await c.env.DB.insert('zapier_webhooks', {
    id: ulid(),
    user_id: c.get('userId'),
    target_url: data.target_url,
    event: data.event,
    created_at: Date.now(),
  })

  return c.json(webhook, 201)
})

// Delete webhook subscription
app.delete('/webhooks/:id', async (c) => {
  const webhookId = c.req.param('id')

  await c.env.DB.delete('zapier_webhooks', {
    id: webhookId,
    user_id: c.get('userId'),
  })

  return c.json({ success: true })
})
```

Trigger webhooks on events:
```typescript
// workers/workflows/src/index.ts
async function completeWorkflowRun(runId: string, output: any) {
  // ... complete run logic

  // Trigger Zapier webhooks
  const webhooks = await env.DB.query(
    `SELECT * FROM zapier_webhooks WHERE user_id = ? AND event = 'workflow.completed'`,
    userId
  )

  for (const webhook of webhooks) {
    await fetch(webhook.target_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: runId,
        workflow_id: workflowId,
        workflow_name: workflow.name,
        status: 'completed',
        output,
        completed_at: new Date().toISOString(),
      }),
    })
  }
}
```

---

### Phase 5: Implement Zapier Actions

**Goal:** Define create/update actions in Zapier app.

**Action Example: "Create Agent"**

Create `creates/create_agent.js`:
```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/agents',
    method: 'POST',
    body: bundle.inputData,
  })

  return response.json
}

module.exports = {
  key: 'create_agent',
  noun: 'Agent',
  display: {
    label: 'Create Agent',
    description: 'Creates a new AI agent.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: true,
        helpText: 'The name of the agent',
      },
      {
        key: 'type',
        label: 'Type',
        type: 'string',
        required: true,
        choices: ['chat', 'task', 'workflow'],
        helpText: 'The type of agent',
      },
      {
        key: 'instructions',
        label: 'Instructions',
        type: 'text',
        required: false,
        helpText: 'Instructions for the agent',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'string',
        required: false,
        default: 'gpt-4',
        choices: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'],
      },
    ],
    sample: {
      id: 'agent-789',
      name: 'New Agent',
      type: 'chat',
      created_at: '2025-10-01T12:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Agent ID' },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  },
}
```

**Action Example: "Run Workflow"**

Create `creates/run_workflow.js`:
```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/workflow-runs',
    method: 'POST',
    body: {
      workflow_id: bundle.inputData.workflow_id,
      input: bundle.inputData.input,
      wait_for_completion: bundle.inputData.wait_for_completion || false,
    },
  })

  return response.json
}

module.exports = {
  key: 'run_workflow',
  noun: 'Workflow Run',
  display: {
    label: 'Run Workflow',
    description: 'Executes a workflow with given inputs.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'workflow_id',
        label: 'Workflow',
        type: 'string',
        required: true,
        dynamic: 'workflow.id.name', // Dynamic dropdown
        helpText: 'Select the workflow to run',
      },
      {
        key: 'input',
        label: 'Input Data (JSON)',
        type: 'text',
        required: true,
        helpText: 'JSON object with workflow inputs',
      },
      {
        key: 'wait_for_completion',
        label: 'Wait for Completion',
        type: 'boolean',
        required: false,
        default: 'false',
        helpText: 'Wait for workflow to complete before continuing',
      },
    ],
    sample: {
      id: 'run-999',
      workflow_id: 'workflow-123',
      status: 'running',
      started_at: '2025-10-01T12:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Run ID' },
      { key: 'workflow_id', label: 'Workflow ID' },
      { key: 'status', label: 'Status' },
      { key: 'output', label: 'Output', type: 'string' },
      { key: 'started_at', label: 'Started At', type: 'datetime' },
      { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    ],
  },
}
```

---

### Phase 6: Implement Zapier Searches

**Goal:** Define search operations for dynamic dropdowns and find actions.

**Search Example: "Find Agent"**

Create `searches/find_agent.js`:
```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/agents/search',
    params: {
      name: bundle.inputData.name,
      type: bundle.inputData.type,
    },
  })

  return response.json.data
}

module.exports = {
  key: 'find_agent',
  noun: 'Agent',
  display: {
    label: 'Find Agent',
    description: 'Finds an agent by name and type.',
  },
  operation: {
    perform,
    inputFields: [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: true,
        helpText: 'Search by agent name',
      },
      {
        key: 'type',
        label: 'Type',
        type: 'string',
        required: false,
        choices: ['chat', 'task', 'workflow'],
      },
    ],
    sample: {
      id: 'agent-123',
      name: 'Customer Support Agent',
      type: 'chat',
      created_at: '2025-10-01T12:00:00Z',
    },
    outputFields: [
      { key: 'id', label: 'Agent ID' },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type' },
      { key: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  },
}
```

**Dynamic Dropdown Example: "List Workflows"**

Create `triggers/workflow.js`:
```javascript
const perform = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.do/zapier/workflows',
    params: {
      limit: 100,
    },
  })

  return response.json.data.map(workflow => ({
    id: workflow.id,
    name: workflow.name,
  }))
}

module.exports = {
  key: 'workflow',
  noun: 'Workflow',
  display: {
    label: 'Get Workflow',
    description: 'Gets a workflow (used for dynamic dropdowns).',
    hidden: true, // Hide from UI, only used for dropdowns
  },
  operation: {
    perform,
  },
}
```

---

### Phase 7: Register and Test

**Goal:** Register Zapier app in Zapier Platform.

**Steps:**

1. **Test locally:**
```bash
zapier test
zapier validate
```

2. **Register with Zapier:**
```bash
zapier register "do Platform"
```

3. **Push to Zapier:**
```bash
zapier push
```

4. **Invite testers:**
```bash
zapier users:add user@example.com 1.0.0
```

5. **Test authentication:**
   - Go to Zapier dashboard
   - Create new Zap
   - Search for "do Platform"
   - Click "Sign in"
   - Complete OAuth flow
   - Verify connection

6. **Test triggers:**
   - Select "New Agent" trigger
   - Configure trigger
   - Test trigger
   - Verify data returned

7. **Test actions:**
   - Select "Create Agent" action
   - Fill in fields
   - Test action
   - Verify agent created

8. **Test searches:**
   - Use dynamic dropdown
   - Verify workflows load
   - Select workflow
   - Verify ID passed correctly

---

### Phase 8: Submit for Review

**Goal:** Get Zapier integration approved for public listing.

**Requirements:**
- At least 3 triggers OR 3 actions
- OAuth 2.0 authentication working
- Test all triggers/actions
- Clear descriptions
- Logo (256x256 PNG)
- Screenshots

**Submission Steps:**

1. **Complete integration details:**
   - App name: "do Platform"
   - Description: "Automate your AI agents, workflows, and business processes"
   - Category: "Developer Tools" or "Productivity"
   - Logo: Upload 256x256 PNG
   - Screenshots: 5 images showing integration in action

2. **Write documentation:**
   - How to connect account
   - How to use each trigger/action
   - Common use cases
   - Troubleshooting

3. **Submit for review:**
```bash
zapier promote 1.0.0
```

4. **Respond to feedback:**
   - Zapier team will review
   - May request changes
   - Iterate until approved

5. **Go live:**
   - Once approved, integration is public
   - Anyone can use it

---

## Complete File Structure

```
integrations/dotdo-zapier/
├── package.json
├── index.js                    # Main entry point
├── authentication.js           # OAuth 2.0 config
├── triggers/
│   ├── new_agent.js           # Polling: New Agent
│   ├── workflow_completed.js  # Instant: Workflow Completed
│   ├── new_workflow.js        # Polling: New Workflow
│   └── workflow.js            # Hidden: Dynamic dropdown
├── creates/
│   ├── create_agent.js        # Action: Create Agent
│   ├── run_workflow.js        # Action: Run Workflow
│   └── update_agent.js        # Action: Update Agent
├── searches/
│   ├── find_agent.js          # Search: Find Agent
│   └── find_workflow.js       # Search: Find Workflow
└── test/
    ├── authentication.test.js
    ├── triggers.test.js
    ├── creates.test.js
    └── searches.test.js
```

---

## Testing Strategy

### Unit Tests

```bash
zapier test
```

Tests run automatically for:
- Authentication flow
- Each trigger
- Each action
- Each search

### Integration Tests

**Manual testing in Zapier dashboard:**
1. Create test Zap
2. Test each trigger with real data
3. Test each action with real data
4. Test error scenarios
5. Test with multiple users

### Load Testing

**Simulate high volume:**
- 1000 concurrent OAuth flows
- 10,000 trigger polls per hour
- 5,000 actions per hour
- Monitor error rates

---

## Security Considerations

### OAuth Security

1. **State parameter:** CSRF protection (Zapier handles this)
2. **PKCE:** Additional security (optional, Zapier supports)
3. **Client secret:** Never expose (stored in Zapier environment)
4. **Refresh tokens:** Automatic rotation (oauth.do handles this)

### API Security

1. **Rate limiting:** 100 req/min per user (gateway enforces)
2. **Scope validation:** Check scopes on API endpoints
3. **Input validation:** Validate all inputs with Zod
4. **Error handling:** Don't leak sensitive info in errors

### Token Storage

1. **Zapier stores tokens** - encrypted at rest
2. **We never see tokens** - only oauth.do validates
3. **Token expiration** - automatic refresh by Zapier
4. **Revocation** - user can disconnect in Zapier

---

## Monitoring

### Metrics to Track

**OAuth Metrics:**
- Authorization requests per day
- Token exchanges per day
- Refresh token requests per day
- Failed authentications

**API Metrics:**
- Requests per endpoint per day
- Success rate per endpoint
- Average response time
- Error rate by error type

**User Metrics:**
- Connected Zapier accounts
- Active Zaps using integration
- Most popular triggers/actions
- User churn rate

### Logging

**oauth.do logs:**
- All authorization requests
- All token exchanges
- All refresh attempts
- All errors

**API logs:**
- All Zapier API requests
- Request method, path, status, duration
- User ID and API endpoint
- Errors with stack traces

**Webhook logs:**
- All webhook triggers
- Target URL, event, status
- Retry attempts
- Failures

---

## Cost Analysis

### Development Cost

- Zapier app development: 20-30 hours
- API endpoint development: 8-12 hours
- Webhook implementation: 4-6 hours
- Testing: 6-8 hours
- Documentation: 2-4 hours
- **Total:** 40-60 hours

### Infrastructure Cost

**Cloudflare Workers:**
- API requests: ~$0.02 per 10,000 requests
- Estimated: 100,000 requests/month from Zapier
- Cost: ~$0.20/month

**Database:**
- Zapier webhook subscriptions: minimal storage
- API logs: included in existing ClickHouse

**Zapier:**
- Free to build and publish
- Users pay for Zapier plans
- No cost to us

**Total Monthly Cost:** ~$0.20/month (negligible)

---

## Timeline

| Phase | Duration | Days |
|-------|----------|------|
| Phase 1: Register OAuth client | 2 hours | 0.5 |
| Phase 2: Create Zapier app | 4 hours | 0.5 |
| Phase 3: API endpoints | 8 hours | 1 |
| Phase 4: Triggers | 12 hours | 1.5 |
| Phase 5: Actions | 8 hours | 1 |
| Phase 6: Searches | 4 hours | 0.5 |
| Phase 7: Testing | 8 hours | 1 |
| Phase 8: Review/launch | 4 hours | 0.5 |
| **Total** | **50 hours** | **7 days** |

---

## Success Criteria

- [ ] OAuth flow completes successfully
- [ ] Zapier stores and refreshes tokens
- [ ] At least 5 triggers implemented
- [ ] At least 5 actions implemented
- [ ] At least 2 searches implemented
- [ ] All endpoints return correct data
- [ ] Webhooks deliver instantly
- [ ] Dynamic dropdowns work
- [ ] Error handling graceful
- [ ] Documentation complete
- [ ] Zapier approval obtained
- [ ] Public listing live

---

## Use Case Examples

### Example 1: Auto-Create Agents from Form Submissions

**Trigger:** New form submission (Google Forms, Typeform, etc.)
**Action:** Create Agent with form data

**Flow:**
1. User submits form with agent requirements
2. Zapier receives form data
3. Zapier calls "Create Agent" action
4. Agent created in .do platform
5. User notified via email

### Example 2: Workflow Completion Notifications

**Trigger:** Workflow Completed
**Action:** Send Slack message

**Flow:**
1. Workflow completes in .do platform
2. Webhook triggers Zapier
3. Zapier formats message
4. Sends to Slack channel
5. Team notified instantly

### Example 3: CRM Integration

**Trigger:** New deal in CRM (HubSpot, Salesforce)
**Action:** Run Workflow

**Flow:**
1. New deal created in CRM
2. Zapier receives deal data
3. Zapier calls "Run Workflow" action
4. Workflow runs with deal data
5. Results sent back to CRM

---

## Next Steps

1. ✅ Complete research (DONE)
2. Review plan with team
3. Register Zapier as OAuth client in oauth.do
4. Initialize Zapier CLI project
5. Implement API endpoints
6. Build Zapier app
7. Test end-to-end
8. Submit for Zapier review

---

## References

- **Zapier OAuth Docs:** https://docs.zapier.com/platform/build/oauth
- **Zapier CLI Docs:** https://github.com/zapier/zapier-platform/tree/main/packages/cli
- **oauth.do:** `/workers/oauth/README.md`
- **workers/auth:** `/workers/auth/README.md`

---

**Last Updated:** 2025-10-04
**Status:** Ready for Implementation
**Estimated Time:** 50 hours (7 days)
**Priority:** High
