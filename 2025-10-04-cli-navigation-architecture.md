# CLI Navigation Architecture

**Date:** 2025-10-04
**Status:** 🔄 Design Phase

## Vision

Transform `cli.do` into a comprehensive command navigation and execution system with:
- **Hierarchical Navigation** - Dot-notation access to entities and functions
- **AI Functions** - Built-in generate, list, research operations
- **MCP Integration** - Connect to any MCP server, pre-built directory
- **Dynamic Execution** - Execute any function through MCP protocol
- **Interactive UI** - React Ink with pagination and rich displays

## Command Structure

### Dot-Notation Navigation

```bash
# Database entity navigation
cli.do db.things.list
cli.do db.occupations.search "software engineer"
cli.do db.industries.findByCode 5112

# AI operations
cli.do ai.generate "business plan for SaaS"
cli.do ai.list "100 blog post ideas"
cli.do ai.research "quantum computing applications"

# MCP server operations
cli.do mcp.github.listIssues --repo anthropics/claude-code
cli.do mcp.google.search "OAuth 2.1 spec"

# Composable operations
cli.do db.occupations.forEach.ai.generateService
cli.do db.industries.map "industry => ai.generate(\`service for \${industry}\`)"

# MCP server management
cli.do mcp.connect github
cli.do mcp.add custom https://custom-mcp.example.com
cli.do mcp.list
```

## Architecture

### 1. Command Router

**File:** `sdk/packages/cli.do/src/router.ts`

```typescript
interface Command {
  domain: string        // 'db', 'ai', 'mcp'
  entity?: string       // 'things', 'occupations', 'github'
  action: string        // 'list', 'generate', 'listIssues'
  args?: any[]
  options?: Record<string, any>
}

class CommandRouter {
  parse(input: string): Command
  execute(command: Command): Promise<any>
}
```

**Responsibilities:**
- Parse dot-notation commands
- Route to appropriate handler (db, ai, mcp)
- Handle arguments and options
- Return results for display

### 2. Database Navigation

**File:** `sdk/packages/cli.do/src/navigation/db.ts`

```typescript
interface EntityNavigator {
  list(options?: ListOptions): Promise<Entity[]>
  get(id: string): Promise<Entity>
  search(query: string): Promise<Entity[]>
  create(data: any): Promise<Entity>
  update(id: string, data: any): Promise<Entity>
  delete(id: string): Promise<void>

  // Composable operations
  forEach(fn: (entity: Entity) => Promise<any>): Promise<any[]>
  map(fn: (entity: Entity) => any): Promise<any[]>
  filter(fn: (entity: Entity) => boolean): Promise<Entity[]>
}

class DbNavigator {
  things: EntityNavigator
  occupations: EntityNavigator
  industries: EntityNavigator
  // ... all Schema.org entities
}
```

**Schema.org Entity Types:**
- Thing (base type)
- Person, Organization, Place
- CreativeWork, Event, Intangible
- Product, Offer, Action
- ... (800+ types from schema.org.ai)

### 3. AI Functions

**File:** `sdk/packages/cli.do/src/navigation/ai.ts`

```typescript
class AiNavigator {
  // Text generation
  async generate(prompt: string, options?: GenerateOptions): Promise<string>

  // List generation
  async list(prompt: string, count?: number): Promise<string[]>

  // Research operations
  async research(topic: string, options?: ResearchOptions): Promise<ResearchResult>

  // Embeddings
  async embed(text: string): Promise<number[]>

  // Chat
  async chat(messages: ChatMessage[]): Promise<string>

  // Models
  models: {
    list(): Promise<Model[]>
    get(id: string): Promise<Model>
  }
}

interface GenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

interface ResearchOptions {
  depth?: 'quick' | 'standard' | 'deep'
  sources?: string[]
  format?: 'markdown' | 'json' | 'html'
}

interface ResearchResult {
  summary: string
  sources: Source[]
  content: string
  metadata: Record<string, any>
}
```

### 4. MCP Server Registry

**File:** `sdk/packages/cli.do/src/navigation/mcp.ts`

```typescript
interface McpServer {
  id: string
  name: string
  url: string
  description: string
  category: string
  authentication?: {
    type: 'oauth2' | 'api_key' | 'none'
    config?: any
  }
  tools: McpTool[]
  status: 'connected' | 'disconnected' | 'error'
}

class McpNavigator {
  // Built-in MCP servers
  github: McpServerProxy
  google: McpServerProxy
  anthropic: McpServerProxy
  openai: McpServerProxy

  // Registry operations
  async list(): Promise<McpServer[]>
  async connect(serverId: string): Promise<void>
  async disconnect(serverId: string): Promise<void>
  async add(config: McpServerConfig): Promise<McpServer>
  async remove(serverId: string): Promise<void>

  // Dynamic access
  [serverName: string]: McpServerProxy
}

interface McpServerProxy {
  // Dynamic tool execution
  [toolName: string]: (...args: any[]) => Promise<any>

  // Metadata
  getTools(): Promise<McpTool[]>
  getResources(): Promise<McpResource[]>
  isConnected(): boolean
}
```

**Pre-Built MCP Servers:**

```typescript
const BUILTIN_MCP_SERVERS = [
  // Code & Development
  { id: 'github', name: 'GitHub', url: 'https://mcp.github.com' },
  { id: 'gitlab', name: 'GitLab', url: 'https://mcp.gitlab.com' },
  { id: 'vscode', name: 'VS Code', url: 'https://mcp.vscode.dev' },

  // AI Providers
  { id: 'anthropic', name: 'Anthropic', url: 'https://mcp.anthropic.com' },
  { id: 'openai', name: 'OpenAI', url: 'https://mcp.openai.com' },
  { id: 'google', name: 'Google AI', url: 'https://mcp.google.ai' },

  // Productivity
  { id: 'notion', name: 'Notion', url: 'https://mcp.notion.so' },
  { id: 'slack', name: 'Slack', url: 'https://mcp.slack.com' },
  { id: 'linear', name: 'Linear', url: 'https://mcp.linear.app' },

  // Data & Analytics
  { id: 'airtable', name: 'Airtable', url: 'https://mcp.airtable.com' },
  { id: 'postgres', name: 'PostgreSQL', url: 'https://mcp.postgres.ai' },
  { id: 'clickhouse', name: 'ClickHouse', url: 'https://mcp.clickhouse.com' },

  // Platform
  { id: 'do', name: 'DO Platform', url: 'https://mcp.do' },
]
```

### 5. Dynamic Function Execution

**File:** `sdk/packages/cli.do/src/execution/executor.ts`

```typescript
class FunctionExecutor {
  // Execute any function through MCP
  async execute(
    server: string,
    tool: string,
    args: any[],
    options?: ExecutionOptions
  ): Promise<any>

  // Batch execution
  async executeBatch(
    commands: Command[]
  ): Promise<any[]>

  // Streaming execution
  async executeStream(
    server: string,
    tool: string,
    args: any[]
  ): AsyncIterator<any>
}

interface ExecutionOptions {
  timeout?: number
  retry?: number
  cache?: boolean
  stream?: boolean
}

// Composable operations
class ComposableExecutor {
  // forEach: Execute function for each item
  async forEach(
    items: any[],
    fn: (item: any) => Promise<any>
  ): Promise<any[]>

  // map: Transform each item
  async map(
    items: any[],
    fn: (item: any) => any
  ): Promise<any[]>

  // filter: Filter items
  async filter(
    items: any[],
    fn: (item: any) => boolean
  ): Promise<any[]>

  // reduce: Accumulate results
  async reduce(
    items: any[],
    fn: (acc: any, item: any) => any,
    initial: any
  ): Promise<any>
}
```

### 6. React Ink UI

**File:** `sdk/packages/cli.do/src/ui/index.tsx`

```typescript
import { render, Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import Table from 'ink-table'
import SelectInput from 'ink-select-input'

interface CliUiProps {
  command: Command
  results: any
  pagination?: PaginationState
}

// Main UI component
function CliUI({ command, results, pagination }: CliUiProps) {
  return (
    <Box flexDirection="column">
      <Header command={command} />
      <Results data={results} />
      {pagination && <Pagination {...pagination} />}
    </Box>
  )
}

// Results display
function Results({ data }: { data: any }) {
  if (Array.isArray(data)) {
    return <Table data={data} />
  }

  if (typeof data === 'object') {
    return <JsonView data={data} />
  }

  return <Text>{String(data)}</Text>
}

// Pagination controls
function Pagination({ page, total, onNext, onPrev }: PaginationState) {
  return (
    <Box>
      <Text dimColor>Page {page} of {total} </Text>
      <Text>[←/→] Navigate [q] Quit</Text>
    </Box>
  )
}

// Interactive selection
function Selection({ items, onSelect }: SelectionProps) {
  return (
    <SelectInput
      items={items}
      onSelect={onSelect}
    />
  )
}
```

**UI Features:**
- **Tables** - Display lists with columns
- **JSON Views** - Pretty-print objects
- **Pagination** - Navigate large result sets
- **Spinners** - Loading states
- **Progress Bars** - Long-running operations
- **Interactive Prompts** - User input
- **Syntax Highlighting** - Code display

## Implementation Plan

### Phase 1: Core Navigation (Week 1)

**Goals:**
- Command router with dot-notation parsing
- Database entity navigation (Things, Occupations, Industries)
- Basic CRUD operations
- Simple CLI output (no UI yet)

**Deliverables:**
```bash
cli.do db.things.list
cli.do db.occupations.search "engineer"
cli.do db.industries.get 5112
```

### Phase 2: AI Functions (Week 2)

**Goals:**
- AI navigator with generate, list, research
- Integration with ai-generation, ai-embeddings packages
- Streaming support
- Chat interface

**Deliverables:**
```bash
cli.do ai.generate "business plan"
cli.do ai.list "100 ideas" --count 50
cli.do ai.research "quantum computing" --depth deep
cli.do ai.chat
```

### Phase 3: MCP Integration (Week 3)

**Goals:**
- MCP server registry
- Connection management
- Built-in server directory
- Dynamic tool execution

**Deliverables:**
```bash
cli.do mcp.list
cli.do mcp.connect github
cli.do mcp.github.listIssues --repo owner/repo
cli.do mcp.add custom https://custom-mcp.com
```

### Phase 4: Composable Operations (Week 4)

**Goals:**
- forEach, map, filter operations
- Batch execution
- Pipeline composition
- Error handling

**Deliverables:**
```bash
cli.do db.occupations.forEach.ai.generateService
cli.do db.industries.map "industry => generate(industry)"
cli.do mcp.github.listIssues | filter "issue => issue.state === 'open'"
```

### Phase 5: React Ink UI (Week 5)

**Goals:**
- Interactive CLI interface
- Pagination controls
- Table display
- Progress indicators
- Syntax highlighting

**Deliverables:**
- Rich table views for lists
- Interactive pagination
- JSON pretty-printing
- Loading spinners
- Progress bars

## File Structure

```
sdk/packages/cli.do/
├── src/
│   ├── cli.ts                    # Main CLI entrypoint
│   ├── router.ts                 # Command router
│   ├── navigation/
│   │   ├── db.ts                # Database navigation
│   │   ├── ai.ts                # AI functions
│   │   └── mcp.ts               # MCP server registry
│   ├── execution/
│   │   ├── executor.ts          # Function executor
│   │   └── composable.ts        # Composable operations
│   ├── ui/
│   │   ├── index.tsx            # React Ink UI
│   │   ├── components/
│   │   │   ├── Table.tsx
│   │   │   ├── JsonView.tsx
│   │   │   ├── Pagination.tsx
│   │   │   └── Spinner.tsx
│   │   └── hooks/
│   │       ├── usePagination.ts
│   │       └── useKeyboard.ts
│   ├── auth/
│   │   ├── token-manager.ts    # Existing
│   │   └── mcp-auth.ts         # MCP auth
│   ├── registry/
│   │   ├── builtin.ts          # Built-in MCP servers
│   │   └── custom.ts           # Custom MCP servers
│   └── types.ts
├── bin/
│   └── cli.js
└── package.json
```

## Dependencies

```json
{
  "dependencies": {
    "ink": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "ink-table": "^3.0.0",
    "ink-select-input": "^6.0.0",
    "react": "^18.0.0",
    "commander": "^12.0.0",
    "ora": "^8.0.0",
    "chalk": "^5.0.0",
    "schema.org.ai": "workspace:*",
    "do.industries": "workspace:*",
    "ai-generation": "workspace:*",
    "ai-embeddings": "workspace:*"
  }
}
```

## Usage Examples

### Database Navigation

```bash
# List all occupations
cli.do db.occupations.list

# Search for specific occupation
cli.do db.occupations.search "software engineer"

# Get occupation by O*NET code
cli.do db.occupations.get 15-1252.00

# Create new Thing
cli.do db.things.create '{"name": "My Service", "type": "SoftwareApplication"}'

# Update Thing
cli.do db.things.update thing_123 '{"description": "Updated description"}'
```

### AI Operations

```bash
# Generate text
cli.do ai.generate "Write a business plan for a SaaS product"

# Generate list
cli.do ai.list "100 blog post ideas about AI" --count 100

# Research topic
cli.do ai.research "OAuth 2.1 specification" --depth deep --format markdown

# Embed text
cli.do ai.embed "This is a sample text"

# Chat
cli.do ai.chat
> Hello
> Tell me about quantum computing
> exit
```

### MCP Server Operations

```bash
# List available MCP servers
cli.do mcp.list

# Connect to GitHub MCP server
cli.do mcp.connect github

# List GitHub issues
cli.do mcp.github.listIssues --repo anthropics/claude-code --state open

# Search Google
cli.do mcp.google.search "OAuth 2.1 spec"

# Add custom MCP server
cli.do mcp.add my-server https://mcp.example.com --auth oauth2

# List tools from server
cli.do mcp.github.tools

# Disconnect server
cli.do mcp.disconnect github
```

### Composable Operations

```bash
# Generate service for each occupation
cli.do db.occupations.forEach.ai.generateService

# Equivalent to:
for occupation in $(cli.do db.occupations.list); do
  cli.do ai.generate "Generate a service description for $occupation"
done

# Map over industries
cli.do db.industries.map "industry => ai.generate(\`business idea for \${industry.name}\`)"

# Filter and process
cli.do db.occupations.filter "occ => occ.salary > 100000" | forEach.ai.generateService

# Pipeline composition
cli.do mcp.github.listIssues --repo owner/repo \
  | filter "issue => issue.state === 'open'" \
  | map "issue => ai.generate(\`solution for: \${issue.title}\`)"
```

## Configuration

**File:** `~/.cli.do/config.json`

```json
{
  "auth": {
    "tokens": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_at": 1234567890
    }
  },
  "mcp": {
    "servers": [
      {
        "id": "custom-server",
        "name": "My Custom Server",
        "url": "https://mcp.example.com",
        "auth": {
          "type": "api_key",
          "key": "sk-..."
        }
      }
    ],
    "connected": ["github", "do", "custom-server"]
  },
  "ui": {
    "theme": "dark",
    "pageSize": 20,
    "autoRefresh": false
  }
}
```

## Security Considerations

1. **Token Storage** - Tokens stored securely in `~/.cli.do/tokens.json`
2. **MCP Auth** - Each MCP server has own authentication
3. **API Keys** - Never log or display API keys
4. **HTTPS Only** - All MCP connections must use HTTPS
5. **Sandboxing** - Limit what custom code can execute

## Performance

1. **Caching** - Cache MCP server metadata and tools
2. **Lazy Loading** - Load entity schemas on demand
3. **Streaming** - Stream large results to UI
4. **Pagination** - Paginate large lists automatically
5. **Parallelization** - Execute batch operations in parallel

## Error Handling

```typescript
class CliError extends Error {
  code: string
  details?: any

  static notFound(entity: string): CliError
  static authRequired(): CliError
  static serverUnavailable(server: string): CliError
  static invalidCommand(command: string): CliError
}

// Usage
try {
  await cli.execute(command)
} catch (error) {
  if (error instanceof CliError) {
    // Display user-friendly error
    console.error(error.message)
  } else {
    // Log technical error
    console.error('Unexpected error:', error)
  }
}
```

## Testing Strategy

1. **Unit Tests** - Test each navigator independently
2. **Integration Tests** - Test command router and execution
3. **E2E Tests** - Test full CLI workflows
4. **MCP Mock** - Mock MCP servers for testing
5. **Snapshot Tests** - Test UI output

## Documentation

1. **User Guide** - How to use CLI commands
2. **API Reference** - All available commands
3. **MCP Directory** - List of built-in MCP servers
4. **Examples** - Common workflows and patterns
5. **Troubleshooting** - Common issues and solutions

## Future Enhancements

1. **Shell Integration** - zsh/bash completion
2. **Watch Mode** - Watch entities for changes
3. **Aliases** - Custom command aliases
4. **Plugins** - Extend CLI with plugins
5. **Cloud Sync** - Sync config across machines
6. **Collaboration** - Share results with team
7. **Notebooks** - Interactive notebook mode
8. **Scheduling** - Schedule commands to run

---

**Status:** Design Complete - Ready for Implementation
**Next Step:** Phase 1 - Core Navigation (Week 1)
**Priority:** P0 - Foundation for entire CLI ecosystem
