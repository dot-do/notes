# Agent and Fn Workers Implementation

**Date:** 2025-10-04
**Status:** Core Implementation Complete
**Next Steps:** Testing and Deployment

## Overview

Successfully implemented two new microservices as part of the workers architecture:

1. **Agent Worker** (`workers/agent/`) - AI code generation agent using Durable Objects
2. **Fn Worker** (`workers/fn/`) - Intelligent function classification and routing service

Both services follow the established microservices patterns with RPC, HTTP, and Queue interfaces.

## Implementation Details

### Agent Worker (`workers/agent/`)

**Purpose:** Stateful AI-powered code generation using Durable Objects

**Key Files Created:**
- `src/index.ts` (387 lines) - WorkerEntrypoint + Durable Object + HTTP API
- `src/types.ts` (239 lines) - TypeScript type definitions
- `wrangler.jsonc` - Durable Object bindings, service bindings, R2 buckets
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `README.md` - Comprehensive documentation

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Service (RPC)                      │
│              - createAgent()                                 │
│              - getStatus()                                   │
│              - generateCode()                                │
│              - sendMessage()                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            CodeGeneratorAgent (Durable Object)               │
│  - State Management (Blueprint, Phases, Files)               │
│  - WebSocket Connections (Real-time updates)                 │
│  - Phase-wise Generation                                     │
│  - Review Cycles                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features Implemented:**
- ✅ RPC interface with 7 methods
- ✅ HTTP REST API with 7 endpoints
- ✅ WebSocket support for real-time updates
- ✅ Durable Object for stateful sessions
- ✅ Service bindings (DB, AI_SERVICE, QUEUE)
- ✅ R2 buckets (SANDBOX_BUCKET, ASSETS_BUCKET)

**API Endpoints:**
- `POST /agents` - Create agent
- `GET /agents/:sessionId` - Get status
- `POST /agents/:sessionId/generate` - Start generation
- `POST /agents/:sessionId/message` - Send message
- `GET /agents/:sessionId/files` - Get files
- `GET /agents/:sessionId/preview` - Get preview URL
- `POST /agents/:sessionId/cancel` - Cancel generation
- `GET /agents/:sessionId/ws` - WebSocket connection

**State Management:**
```typescript
export interface CodeGenState {
  sessionId: string
  query: string
  blueprint?: Blueprint
  generatedFilesMap: Record<string, FileState>
  generatedPhases: PhaseState[]
  currentPhase?: PhaseState
  currentDevState: CurrentDevState
  reviewCycles?: number
  mvpGenerated: boolean
  previewURL?: string
  agentMode: 'deterministic' | 'smart'
}
```

**TODO - Core Logic:**
The Durable Object is a simplified template. The full implementation from `projects/agent/worker` needs to be integrated:

1. Blueprint generation logic
2. Phase-wise generation system
3. File generation and streaming
4. Code review and validation
5. Sandbox service integration
6. Error detection and auto-fix
7. WebSocket message handlers

**Migration Strategy:**
- Phase 1: ✅ Basic structure and RPC interface (DONE)
- Phase 2: ⏳ Copy core agent logic from projects/agent/worker
- Phase 3: ⏳ Adapt database calls to use DB_SERVICE RPC
- Phase 4: ⏳ Integrate with AI_SERVICE for generation
- Phase 5: ⏳ Add comprehensive tests

### Fn Worker (`workers/fn/`)

**Purpose:** Intelligent function classification and routing

**Key Files Created:**
- `src/index.ts` (419 lines) - WorkerEntrypoint + Classification + Routing + Queue handler
- `src/types.ts` (174 lines) - TypeScript type definitions
- `wrangler.jsonc` - Service bindings, queue configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `README.md` - Comprehensive documentation

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                     Function Request                         │
│  description: "Sort array of numbers"                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Classification                           │
│              (GPT-4o-mini default)                           │
│  Returns: { type, confidence, reasoning }                    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬───────────────┐
        ▼                ▼                ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│     code     │ │    object    │ │   agentic    │ │    human     │
│  AI_SERVICE  │ │  AI_SERVICE  │ │    AGENT     │ │   DATABASE   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Features Implemented:**
- ✅ RPC interface with 1 method (executeFunction)
- ✅ HTTP REST API with 2 endpoints
- ✅ AI-powered classification using GPT-4o-mini
- ✅ Routing to 4 execution strategies
- ✅ Sync and async execution modes
- ✅ Queue-based background processing
- ✅ Service bindings (AI_SERVICE, AGENT_SERVICE, DB, QUEUE)

**Function Types:**

1. **code**: Pure TypeScript functions
   - Example: Sort array, calculate factorial
   - Execution: AI_SERVICE.code() → executeCode()

2. **object**: Structured data generation
   - Example: Generate user profile, config file
   - Execution: AI_SERVICE.generate() with JSON format

3. **agentic**: Complex multi-step processes
   - Example: Build full application
   - Execution: AGENT_SERVICE.createAgent() → generates codebase

4. **human**: Tasks requiring human intervention
   - Example: Review code, approve deployment
   - Execution: DB.execute() → creates task record

**API Endpoints:**
- `POST /fn` - Execute function (sync or async)
- `GET /fn/jobs/:jobId` - Get job status (for async)

**Classification Process:**
1. Build full description with context and arguments
2. Call AI_SERVICE with classification prompt
3. Parse JSON response: `{ type, confidence, reasoning }`
4. Route to appropriate service based on type
5. Return result or job ID (for async)

**Example Requests:**

```javascript
// Code function (sync)
POST /fn
{
  "description": "Sort array of numbers",
  "args": { "numbers": [3,1,4,1,5] }
}
// Result: [1,1,3,4,5]

// Agentic function (async)
POST /fn
{
  "description": "Build a blog app with auth",
  "options": { "mode": "async" }
}
// Result: { jobId: "...", type: "agentic" }
```

### Gateway Integration

**Files Modified:**
- `workers/gateway/src/router.ts` - Added agent and fn routes
- `workers/gateway/wrangler.jsonc` - Added service bindings

**Changes:**

1. **Router Configuration:**
```typescript
// Added routes
{ pattern: /^\/agent\//, service: 'agent', binding: 'AGENT' },
{ pattern: /^\/fn\//, service: 'fn', binding: 'FN' },

// Updated auth requirements
if (pathname.startsWith('/agent/') || pathname.startsWith('/fn/')) {
  return true // Require auth
}
```

2. **Service Bindings:**
```jsonc
"services": [
  { "binding": "DB", "service": "db" },
  { "binding": "AGENT", "service": "agent" },
  { "binding": "FN", "service": "fn" }
]
```

**Gateway Routes Now Support:**
- `https://gateway.do/agent/*` → Agent service
- `https://gateway.do/fn/*` → Fn service

## File Structure

```
workers/
├── agent/
│   ├── src/
│   │   ├── index.ts          # 387 lines - WorkerEntrypoint + DO + HTTP
│   │   └── types.ts          # 239 lines - Type definitions
│   ├── tests/                # (empty - TODO)
│   ├── wrangler.jsonc        # Durable Object config
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md             # Comprehensive docs
│
├── fn/
│   ├── src/
│   │   ├── index.ts          # 419 lines - Classification + Routing
│   │   └── types.ts          # 174 lines - Type definitions
│   ├── tests/                # (empty - TODO)
│   ├── wrangler.jsonc        # Service bindings + queues
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md             # Comprehensive docs
│
└── gateway/
    ├── src/
    │   └── router.ts         # Modified - Added agent/fn routes
    └── wrangler.jsonc        # Modified - Added service bindings
```

## Status Summary

### ✅ Completed

**Agent Worker:**
- ✅ Directory structure
- ✅ Type definitions (CodeGenState, WebSocket types, RPC methods)
- ✅ WorkerEntrypoint pattern with RPC interface
- ✅ Durable Object boilerplate (CodeGeneratorAgent)
- ✅ HTTP API endpoints (7 routes)
- ✅ WebSocket support infrastructure
- ✅ Wrangler configuration (DO bindings, service bindings, R2)
- ✅ Package.json and tsconfig.json
- ✅ Comprehensive README.md

**Fn Worker:**
- ✅ Directory structure
- ✅ Type definitions (FunctionType, Classification, Request/Response)
- ✅ WorkerEntrypoint pattern with RPC interface
- ✅ AI classification logic (GPT-4o-mini)
- ✅ Routing logic to all 4 function types
- ✅ HTTP API endpoints (2 routes)
- ✅ Queue handler for async execution
- ✅ Wrangler configuration (service bindings, queues)
- ✅ Package.json and tsconfig.json
- ✅ Comprehensive README.md

**Gateway Integration:**
- ✅ Router configuration updated
- ✅ Service bindings added to wrangler.jsonc
- ✅ Authentication requirements configured

### ⏳ Pending (High Priority)

**Agent Worker:**
1. **Core Logic Migration** (Critical)
   - Copy phase-wise generation system from projects/agent/worker
   - Adapt blueprint generation logic
   - Integrate file generation and streaming
   - Add code review and validation
   - Implement WebSocket message handlers
   - Connect to sandbox service

2. **Database Migration**
   - Replace D1 calls with DB_SERVICE RPC
   - Update schema usage
   - Migrate database services

3. **Testing**
   - Unit tests for RPC methods
   - Integration tests for Durable Object
   - WebSocket connection tests
   - End-to-end generation flow tests

**Fn Worker:**
1. **Testing** (Critical)
   - Test all 4 function types
   - Test classification accuracy
   - Test sync and async execution
   - Test error handling

2. **Database Schema**
   - Create `human_tasks` table
   - Create `function_jobs` table
   - Add indexes

**Deployment:**
1. Create R2 buckets (agent-sandbox, agent-assets)
2. Create queues (function-execution)
3. Deploy agent worker
4. Deploy fn worker
5. Deploy updated gateway
6. Verify routing and integration

## Next Steps

### Immediate (Today)

1. **Create Test Cases**
   - Agent worker: Basic RPC tests
   - Fn worker: Classification tests for all types

2. **Database Schema**
   - Run migrations for human_tasks and function_jobs tables

3. **Local Testing**
   ```bash
   # Terminal 1: Agent worker
   cd workers/agent && pnpm dev

   # Terminal 2: Fn worker
   cd workers/fn && pnpm dev

   # Terminal 3: Gateway
   cd workers/gateway && pnpm dev

   # Terminal 4: Test requests
   curl -X POST http://localhost:8788/fn \
     -H "Content-Type: application/json" \
     -d '{"description":"Sort numbers","args":{"numbers":[3,1,4]}}'
   ```

### Short Term (This Week)

1. **Agent Core Logic**
   - Migrate SimpleCodeGeneratorAgent implementation
   - Add blueprint generation
   - Implement phase-wise generation
   - Add review cycles

2. **Integration Testing**
   - Test agent worker → AI_SERVICE
   - Test fn worker → agent worker
   - Test gateway → both services
   - Test WebSocket connections

3. **Documentation**
   - Add MCP tools documentation
   - Add deployment guide
   - Add troubleshooting guide

### Medium Term (Next Week)

1. **Deployment**
   - Deploy to staging environment
   - Run integration tests
   - Deploy to production

2. **Monitoring**
   - Add metrics collection
   - Add error tracking
   - Add performance monitoring

3. **Optimization**
   - Optimize classification prompt
   - Add caching for common functions
   - Optimize Durable Object state management

## Technical Debt

1. **Agent Worker:**
   - TODO comments in Durable Object (blueprint generation, phase generation, etc.)
   - Simplified WebSocket handlers (need full implementation)
   - Missing sandbox service integration
   - No error recovery logic

2. **Fn Worker:**
   - Classification confidence threshold not implemented
   - No fallback strategy for misclassification
   - Queue retry logic needs refinement
   - No result caching

3. **Both Workers:**
   - No tests yet
   - No MCP tools yet
   - No error tracking/metrics
   - No deployment automation

## Dependencies

**Agent Worker Depends On:**
- AI_SERVICE (for code generation)
- DB (for state persistence)
- QUEUE (for async operations)
- SANDBOX_BUCKET (R2) (for generated files)

**Fn Worker Depends On:**
- AI_SERVICE (for classification)
- AGENT_SERVICE (for agentic functions)
- DB (for human tasks and job tracking)
- QUEUE (for async execution)

**Gateway Depends On:**
- AGENT service binding
- FN service binding

## Configuration

**Environment Variables Required:**

```bash
# Agent worker
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CLOUDFLARE_ACCOUNT_ID=...
CUSTOM_DOMAIN=agent.do

# Fn worker
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_MODEL=gpt-4o-mini
```

**Secrets to Set:**

```bash
# Agent worker
cd workers/agent
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY

# Fn worker
cd workers/fn
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
```

## Testing Plan

### Agent Worker Tests

```typescript
describe('AgentService', () => {
  it('should create agent session', async () => {
    const result = await service.createAgent({
      query: 'Build a blog app'
    })
    expect(result.success).toBe(true)
    expect(result.sessionId).toBeDefined()
  })

  it('should get agent status', async () => {
    const result = await service.getStatus(sessionId)
    expect(result.success).toBe(true)
    expect(result.state.currentDevState).toBeDefined()
  })

  it('should handle WebSocket connections', async () => {
    // Test WebSocket upgrade and messaging
  })
})
```

### Fn Worker Tests

```typescript
describe('FnService', () => {
  describe('Classification', () => {
    it('should classify simple functions as code', async () => {
      const result = await service.executeFunction({
        description: 'Sort array of numbers'
      })
      expect(result.type).toBe('code')
      expect(result.classification.confidence).toBeGreaterThan(0.8)
    })

    it('should classify complex tasks as agentic', async () => {
      const result = await service.executeFunction({
        description: 'Build a blog application'
      })
      expect(result.type).toBe('agentic')
    })

    it('should classify data generation as object', async () => {
      const result = await service.executeFunction({
        description: 'Generate user profile JSON'
      })
      expect(result.type).toBe('object')
    })

    it('should classify reviews as human', async () => {
      const result = await service.executeFunction({
        description: 'Review code for security'
      })
      expect(result.type).toBe('human')
    })
  })

  describe('Execution', () => {
    it('should execute code functions', async () => {
      const result = await service.executeFunction({
        description: 'Calculate factorial',
        args: { n: 5 }
      })
      expect(result.result).toBe(120)
    })

    it('should handle async execution', async () => {
      const result = await service.executeFunction({
        description: 'Build app',
        options: { mode: 'async' }
      })
      expect(result.jobId).toBeDefined()
    })
  })
})
```

## Performance Targets

**Agent Worker:**
- Agent creation: < 200ms
- WebSocket connection: < 100ms
- State query: < 50ms
- Full generation: < 5 minutes (depending on complexity)

**Fn Worker:**
- Classification: < 500ms
- Code execution: < 1s
- Object generation: < 2s
- Agentic routing: < 100ms
- Human task creation: < 100ms

## Security Considerations

1. **Authentication:**
   - ✅ Both services require auth via gateway
   - ✅ Gateway validates tokens before routing
   - ⏳ Need to implement session management

2. **Rate Limiting:**
   - ⏳ Per-user rate limits for agent creation
   - ⏳ Per-user rate limits for fn execution
   - ⏳ Global rate limits for expensive operations

3. **Input Validation:**
   - ⏳ Validate function descriptions (max length, no code injection)
   - ⏳ Validate arguments (schema validation)
   - ⏳ Sanitize user input before AI processing

4. **Resource Limits:**
   - ⏳ Max concurrent agents per user
   - ⏳ Max function execution time
   - ⏳ Max generated file size

## Success Metrics

**Agent Worker:**
- Agents created/day
- Average generation time
- Success rate (% complete vs failed)
- WebSocket connection uptime
- Average files generated per session

**Fn Worker:**
- Functions executed/day
- Classification accuracy
- Average execution time per type
- Async job success rate
- Classification confidence distribution

## Conclusion

Both agent and fn workers are now implemented with complete RPC, HTTP, and Queue interfaces following the microservices architecture patterns. The gateway has been updated to route traffic to these services.

**Key Achievements:**
- ✅ Clean separation of concerns (agent logic vs function routing)
- ✅ Consistent patterns across all workers
- ✅ Comprehensive type safety
- ✅ Scalable architecture (Durable Objects + Queues)
- ✅ Well-documented APIs and usage

**Next Priority:**
1. Add tests (critical for deployment)
2. Migrate core agent logic from projects/agent/worker
3. Deploy to staging and test integration
4. Deploy to production

---

**Implementation Time:** ~4 hours
**Lines of Code:** ~1,200 (agent: 626, fn: 593)
**Files Created:** 14
**Services Integrated:** 2
**Ready for:** Testing and Core Logic Migration
