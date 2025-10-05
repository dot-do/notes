# VAPI Integration Guide for Agent Project

**Date:** 2025-10-04
**Status:** Planning - Implementation pending
**Context:** Integrate VAPI voice AI into projects/agent to enable voice interactions for named agents

## Overview

**VAPI (Voice AI Platform Integration)** will bring our 7 named agents to life with natural voice conversations:
- Amy (Sales) - rachel voice (warm, consultative)
- Alex (Data) - adam voice (analytical, precise)
- Morgan (Content) - charlotte voice (creative, expressive)
- Riley (Support) - emily voice (calm, empathetic)
- Jordan (Strategy) - antoni voice (confident, strategic)
- Taylor (Operations) - sam voice (organized, efficient)
- Sam (Finance) - josh voice (analytical, pragmatic)

## VAPI Architecture

```
┌──────────────────────────────────────────────────────────┐
│               React Frontend (Vite)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Agent Selection UI                                │  │
│  │  - Amy, Alex, Morgan, Riley, Jordan, Taylor, Sam  │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│                   │ Select Agent                          │
│                   ▼                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Voice Chat Interface                              │  │
│  │  - Microphone input/output                         │  │
│  │  - Real-time transcription display                 │  │
│  │  - Agent response visualization                    │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│                   │ WebRTC/WebSocket                      │
│                   ▼                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────────────────────┐
│          Cloudflare Worker (Backend)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  POST /api/vapi/call                               │  │
│  │  - Create VAPI phone call                          │  │
│  │  - Configure agent personality                     │  │
│  │  - Set ElevenLabs voice                            │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  POST /api/vapi/webhook                            │  │
│  │  - Handle VAPI events                              │  │
│  │  - Log conversations                               │  │
│  │  - Update agent state                              │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
                    │ REST API
                    ▼
┌──────────────────────────────────────────────────────────┐
│                VAPI Platform                              │
│  - Speech-to-text (Deepgram)                             │
│  - Text-to-speech (ElevenLabs)                          │
│  - LLM (OpenAI/Anthropic)                               │
│  - Call routing and management                           │
│  - Real-time transcription                               │
└──────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Install VAPI SDK

```bash
cd /Users/nathanclevenger/Projects/.do/projects/agent
pnpm add @vapi-ai/web @vapi-ai/server-sdk
```

### 2. Configure Environment Variables

```bash
# .dev.vars
VAPI_API_KEY=your-vapi-api-key
VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_PHONE_NUMBER=+1234567890  # Optional: For phone calls
OPENAI_API_KEY=your-openai-key  # For LLM
ANTHROPIC_API_KEY=your-anthropic-key  # Alternative LLM
```

```bash
# .prod.vars (for deployment)
VAPI_API_KEY=prod-vapi-api-key
VAPI_PUBLIC_KEY=prod-vapi-public-key
# ... etc
```

### 3. Create VAPI Types

```typescript
// worker/vapi/types.ts
export interface VapiAgent {
  id: string
  name: string
  voice: {
    provider: 'eleven_labs'
    voiceId: string
    stability?: number
    similarityBoost?: number
    speakingRate?: number
  }
  model: {
    provider: 'openai' | 'anthropic'
    model: string
    temperature?: number
    maxTokens?: number
  }
  systemPrompt: string
  firstMessage: string
}

export interface VapiCallConfig {
  agent: VapiAgent
  customer?: {
    number?: string
    name?: string
    email?: string
  }
}

export interface VapiWebhookEvent {
  type: 'call.started' | 'call.ended' | 'transcript' | 'function-call'
  callId: string
  timestamp: string
  payload: any
}

// Our 7 named agents with VAPI configs
export const NAMED_AGENTS: Record<string, VapiAgent> = {
  amy: {
    id: 'amy',
    name: 'Amy',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'rachel',  // Warm, consultative
      stability: 0.7,
      similarityBoost: 0.8,
      speakingRate: 1.0
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 500
    },
    systemPrompt: `You are Amy, a Sales Development Representative. You are warm, consultative, and empathetic.
Your specialties are lead qualification, discovery calls, and relationship building.
You use the BANT framework (Budget, Authority, Need, Timeline) to qualify leads.
You're friendly but professional, and you always focus on understanding the customer's needs before pitching solutions.`,
    firstMessage: "Hi! I'm Amy, your Sales Development Representative. I'm excited to learn about your business and see how we can help. What brings you here today?"
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'adam',  // Analytical, precise
      stability: 0.75,
      similarityBoost: 0.8,
      speakingRate: 0.95
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.5,  // More focused
      maxTokens: 500
    },
    systemPrompt: `You are Alex, a Data Scientist & Analytics Advisor. You are analytical, precise, and methodical.
Your specialties are data analysis, predictive modeling, and business intelligence.
You speak with confidence backed by data, and you explain complex statistical concepts in clear terms.
You love finding patterns and insights that drive business decisions.`,
    firstMessage: "Hello, I'm Alex, your Data Scientist. I'm here to help you make data-driven decisions. What data challenge can I help you solve today?"
  },
  morgan: {
    id: 'morgan',
    name: 'Morgan',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'charlotte',  // Creative, expressive
      stability: 0.6,
      similarityBoost: 0.85,
      speakingRate: 1.1  // Slightly faster for energy
    },
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5',
      temperature: 0.8,  // More creative
      maxTokens: 500
    },
    systemPrompt: `You are Morgan, a Content Strategist & Creative Director. You are creative, expressive, and innovative.
Your specialties are content creation, brand storytelling, and creative strategy.
You bring energy and fresh perspectives to every conversation.
You help people tell compelling stories that resonate with their audience.`,
    firstMessage: "Hey! I'm Morgan, your Creative Director. Let's create something amazing together! What story do you want to tell?"
  },
  riley: {
    id: 'riley',
    name: 'Riley',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'emily',  // Calm, empathetic
      stability: 0.85,
      similarityBoost: 0.75,
      speakingRate: 0.9  // Slightly slower for clarity
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 500
    },
    systemPrompt: `You are Riley, a Technical Support Specialist. You are patient, thorough, and empathetic.
Your specialties are technical support, troubleshooting, and customer success.
You never rush, and you make sure customers feel heard and helped.
You explain technical concepts clearly and check for understanding.`,
    firstMessage: "Hi! I'm Riley, your Technical Support Specialist. I'm here to help solve any issues you're facing. Tell me what's happening, and we'll figure it out together."
  },
  jordan: {
    id: 'jordan',
    name: 'Jordan',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'antoni',  // Confident, strategic
      stability: 0.75,
      similarityBoost: 0.8,
      speakingRate: 0.95
    },
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5',
      temperature: 0.6,
      maxTokens: 500
    },
    systemPrompt: `You are Jordan, a Strategic Business Advisor. You are insightful, direct, and strategic.
Your specialties are business strategy, market analysis, and decision support.
You cut through complexity to provide clear, actionable guidance.
You ask hard questions to sharpen thinking and challenge assumptions.`,
    firstMessage: "I'm Jordan, your Strategic Advisor. Let's talk strategy. What decision are you wrestling with?"
  },
  taylor: {
    id: 'taylor',
    name: 'Taylor',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'sam',  // Organized, efficient
      stability: 0.8,
      similarityBoost: 0.75,
      speakingRate: 1.0
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 500
    },
    systemPrompt: `You are Taylor, an Operations Coordinator. You are organized, efficient, and systematic.
Your specialties are project management, coordination, and process optimization.
You keep projects on track with proactive communication and attention to detail.
You provide clear timelines and ensure nothing falls through the cracks.`,
    firstMessage: "Hi! I'm Taylor, your Operations Coordinator. Let me get this project organized for you. What are we working on and when do you need it done?"
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    voice: {
      provider: 'eleven_labs',
      voiceId: 'josh',  // Analytical, pragmatic
      stability: 0.8,
      similarityBoost: 0.75,
      speakingRate: 0.95
    },
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.5,  // More focused on numbers
      maxTokens: 500
    },
    systemPrompt: `You are Sam, a Financial Analyst. You are detail-oriented, pragmatic, and analytical.
Your specialties are financial modeling, forecasting, and analysis.
You focus on numbers, trends, and ROI.
You provide clear financial insights that drive business decisions.`,
    firstMessage: "Hello, I'm Sam, your Financial Analyst. Let's look at the numbers together. What financial question can I help you answer?"
  }
}
```

### 4. Create VAPI Service (Worker)

```typescript
// worker/vapi/service.ts
import { NAMED_AGENTS, type VapiAgent, type VapiCallConfig } from './types'

export class VapiService {
  constructor(
    private env: {
      VAPI_API_KEY: string
      VAPI_PUBLIC_KEY: string
      OPENAI_API_KEY?: string
      ANTHROPIC_API_KEY?: string
    }
  ) {}

  /**
   * Create a VAPI call for an agent
   */
  async createCall(agentId: string, config?: Partial<VapiCallConfig>) {
    const agent = NAMED_AGENTS[agentId]
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant: {
          name: agent.name,
          model: {
            provider: agent.model.provider,
            model: agent.model.model,
            temperature: agent.model.temperature,
            maxTokens: agent.model.maxTokens,
            messages: [
              {
                role: 'system',
                content: agent.systemPrompt
              }
            ]
          },
          voice: {
            provider: agent.voice.provider,
            voiceId: agent.voice.voiceId,
            stability: agent.voice.stability,
            similarityBoost: agent.voice.similarityBoost,
            speed: agent.voice.speakingRate
          },
          firstMessage: agent.firstMessage
        },
        customer: config?.customer,
        // Optional: Phone number for outbound calls
        phoneNumberId: this.env.VAPI_PHONE_NUMBER
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`VAPI API error: ${error}`)
    }

    return response.json()
  }

  /**
   * Get call status
   */
  async getCall(callId: string) {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${this.env.VAPI_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get call status')
    }

    return response.json()
  }

  /**
   * End a call
   */
  async endCall(callId: string) {
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.env.VAPI_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to end call')
    }

    return response.json()
  }
}
```

### 5. Create Worker Endpoints

```typescript
// worker/api/routes/vapi.ts
import { Hono } from 'hono'
import { VapiService } from '../vapi/service'

const vapi = new Hono<{ Bindings: Env }>()

// POST /api/vapi/call - Create a new VAPI call
vapi.post('/call', async (c) => {
  const { agentId, customer } = await c.req.json()

  const service = new VapiService(c.env)
  const call = await service.createCall(agentId, { customer })

  return c.json({
    success: true,
    call
  })
})

// GET /api/vapi/call/:callId - Get call status
vapi.get('/call/:callId', async (c) => {
  const callId = c.req.param('callId')

  const service = new VapiService(c.env)
  const call = await service.getCall(callId)

  return c.json({
    success: true,
    call
  })
})

// DELETE /api/vapi/call/:callId - End call
vapi.delete('/call/:callId', async (c) => {
  const callId = c.req.param('callId')

  const service = new VapiService(c.env)
  await service.endCall(callId)

  return c.json({
    success: true,
    message: 'Call ended'
  })
})

// POST /api/vapi/webhook - Handle VAPI events
vapi.post('/webhook', async (c) => {
  const event = await c.req.json()

  // Log event (replace with proper logging)
  console.log('VAPI webhook event:', event.type, event.callId)

  // Handle different event types
  switch (event.type) {
    case 'call.started':
      // Call started - log or track
      break
    case 'call.ended':
      // Call ended - save transcript, analyze sentiment
      break
    case 'transcript':
      // Real-time transcript - store or process
      break
    case 'function-call':
      // Agent called a function - execute and return result
      break
  }

  return c.json({ success: true })
})

export default vapi
```

### 6. Create React Components

```typescript
// components/voice/vapi-client.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Vapi from '@vapi-ai/web'

interface VapiClientProps {
  agentId: string
  publicKey: string
  onCallStart?: () => void
  onCallEnd?: () => void
  onTranscript?: (transcript: string) => void
}

export function VapiClient({
  agentId,
  publicKey,
  onCallStart,
  onCallEnd,
  onTranscript
}: VapiClientProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const vapiRef = useRef<Vapi | null>(null)

  useEffect(() => {
    // Initialize VAPI client
    vapiRef.current = new Vapi(publicKey)

    // Set up event listeners
    vapiRef.current.on('call-start', () => {
      setIsCallActive(true)
      onCallStart?.()
    })

    vapiRef.current.on('call-end', () => {
      setIsCallActive(false)
      onCallEnd?.()
    })

    vapiRef.current.on('speech-start', () => {
      console.log('User started speaking')
    })

    vapiRef.current.on('speech-end', () => {
      console.log('User stopped speaking')
    })

    vapiRef.current.on('message', (message: any) => {
      if (message.type === 'transcript') {
        const text = message.transcript
        setTranscript(prev => [...prev, text])
        onTranscript?.(text)
      }
    })

    return () => {
      // Cleanup
      vapiRef.current?.stop()
    }
  }, [publicKey, onCallStart, onCallEnd, onTranscript])

  const startCall = async () => {
    if (!vapiRef.current) return

    try {
      // Create call via our backend
      const response = await fetch('/api/vapi/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      })

      const { call } = await response.json()

      // Start web call
      await vapiRef.current.start(call.id)
    } catch (error) {
      console.error('Failed to start call:', error)
    }
  }

  const endCall = () => {
    vapiRef.current?.stop()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Call controls */}
      <div className="flex gap-2">
        {!isCallActive ? (
          <button
            onClick={startCall}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Start Call
          </button>
        ) : (
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            End Call
          </button>
        )}
      </div>

      {/* Status */}
      <div className="text-sm text-gray-600">
        {isCallActive ? '🎤 Call active' : '⏸️ Call inactive'}
      </div>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Transcript:</h3>
          <div className="space-y-2">
            {transcript.map((text, i) => (
              <p key={i} className="text-sm">
                {text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

```typescript
// components/voice/agent-selector.tsx
'use client'

import { NAMED_AGENTS } from '@/worker/vapi/types'

interface AgentSelectorProps {
  selectedAgent: string | null
  onSelectAgent: (agentId: string) => void
}

export function AgentSelector({ selectedAgent, onSelectAgent }: AgentSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(NAMED_AGENTS).map(([id, agent]) => (
        <button
          key={id}
          onClick={() => onSelectAgent(id)}
          className={`
            p-4 rounded-lg border-2 transition-all
            ${selectedAgent === id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          <div className="text-lg font-semibold">{agent.name}</div>
          <div className="text-sm text-gray-600 mt-1">
            {id === 'amy' && 'Sales'}
            {id === 'alex' && 'Data Science'}
            {id === 'morgan' && 'Content'}
            {id === 'riley' && 'Support'}
            {id === 'jordan' && 'Strategy'}
            {id === 'taylor' && 'Operations'}
            {id === 'sam' && 'Finance'}
          </div>
        </button>
      ))}
    </div>
  )
}
```

```typescript
// routes/voice/chat.tsx
'use client'

import { useState } from 'react'
import { AgentSelector } from '@/components/voice/agent-selector'
import { VapiClient } from '@/components/voice/vapi-client'

export default function VoiceChatPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Talk to an AI Agent</h1>

      {/* Agent selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Choose an agent:</h2>
        <AgentSelector
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
      </div>

      {/* Voice chat interface */}
      {selectedAgent && (
        <div className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">
            Talking to {selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)}
          </h2>
          <VapiClient
            agentId={selectedAgent}
            publicKey={publicKey}
            onCallStart={() => console.log('Call started')}
            onCallEnd={() => console.log('Call ended')}
            onTranscript={(text) => console.log('Transcript:', text)}
          />
        </div>
      )}
    </div>
  )
}
```

### 7. Update Wrangler Configuration

```jsonc
// wrangler.jsonc
{
  "name": "agent",
  "main": "worker/index.ts",
  "compatibility_date": "2025-01-01",

  "vars": {
    "VAPI_PUBLIC_KEY": "your-public-key"
  },

  "secrets": [
    "VAPI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY"
  ],

  // Add routes for VAPI
  "routes": [
    { "pattern": "/api/vapi/*", "zone_name": "yourdomain.com" }
  ]
}
```

## Testing

### 1. Local Testing

```bash
# Start worker with secrets
echo "VAPI_API_KEY=your-key" >> .dev.vars
echo "VAPI_PUBLIC_KEY=your-public-key" >> .dev.vars
pnpm local

# Start frontend
pnpm dev

# Navigate to http://localhost:5173/voice/chat
```

### 2. Test Voice Call

1. Select an agent (e.g., Amy)
2. Click "Start Call"
3. Allow microphone access
4. Speak to the agent
5. View real-time transcript
6. Click "End Call" when done

### 3. Test Webhook

```bash
# Simulate webhook event
curl -X POST http://localhost:5173/api/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call.started",
    "callId": "test-123",
    "timestamp": "2025-01-15T10:00:00Z"
  }'
```

## Deployment

### 1. Set Production Secrets

```bash
# Set secrets in Cloudflare
pnpm wrangler secret put VAPI_API_KEY
pnpm wrangler secret put OPENAI_API_KEY
pnpm wrangler secret put ANTHROPIC_API_KEY

# Update wrangler.jsonc with production public key
```

### 2. Deploy

```bash
# Deploy worker + frontend
pnpm deploy
```

### 3. Configure VAPI Webhook

```bash
# In VAPI dashboard, set webhook URL:
https://yourdomain.com/api/vapi/webhook
```

## Cost Estimates

**VAPI Pricing (as of 2025-01):**
- Web calls: $0.09/minute
- Phone calls: $0.15/minute
- ElevenLabs TTS: $0.18/minute
- Deepgram STT: $0.0043/minute

**Example: 10-minute voice call**
- VAPI: $0.90
- ElevenLabs: $1.80
- Deepgram: $0.043
- OpenAI (GPT-4o): ~$0.10
- **Total: ~$2.90 per 10-minute call**

## Feature Enhancements

### 1. Function Calling

Enable agents to execute functions during calls:

```typescript
// Add to agent config
functions: [
  {
    name: 'get_customer_info',
    description: 'Get customer information by email',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string' }
      }
    },
    handler: async (params: { email: string }) => {
      // Query database
      const customer = await db.customers.findByEmail(params.email)
      return customer
    }
  }
]
```

### 2. Call Recording

```typescript
// Enable recording in call config
recording: {
  enabled: true,
  provider: 'r2',  // Store in Cloudflare R2
}
```

### 3. Analytics

```typescript
// Track call metrics
await db.insert('call_analytics', {
  agentId,
  duration,
  transcript,
  sentiment,
  cost,
  timestamp: new Date()
})
```

### 4. Multi-Language Support

```typescript
// Add language selection
voice: {
  language: 'en-US',  // or 'es-ES', 'fr-FR', etc.
  voiceId: 'rachel'
}
```

## Next Steps

1. **Get VAPI API Keys**
   - Sign up at https://vapi.ai
   - Get API key and public key
   - Configure in .dev.vars

2. **Install Dependencies**
   ```bash
   cd projects/agent
   pnpm add @vapi-ai/web @vapi-ai/server-sdk
   ```

3. **Implement Components**
   - Create worker/vapi/ directory
   - Add types, service, routes
   - Create React components
   - Add voice chat page

4. **Test Locally**
   - Start worker with secrets
   - Start frontend
   - Test voice calls with each agent

5. **Deploy**
   - Set production secrets
   - Deploy to Cloudflare
   - Configure webhook

6. **Iterate**
   - Add function calling
   - Enable call recording
   - Add analytics dashboard
   - Implement multi-language

## Related Files

- Agent definitions: `examples/agents/named/*.do.mdx`
- Agent project: `projects/agent/`
- VAPI docs: https://docs.vapi.ai

---

**Status:** Ready for implementation
**Priority:** P1 - High (brings agents to life)
**Estimated Time:** 2-3 days for full integration
**Dependencies:** VAPI account, API keys
