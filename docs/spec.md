# Multi-Agent Collaboration Dashboard - System Specification

## 1. Overview

### Goals
- Real-time multi-agent collaboration dashboard with "comic speech bubble" UI
- Trading monitoring page with position tracking and decision logs
- Agent runtime orchestrator with budget, approval gates, and role-based permissions

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │   Agents    │  │      Trading        │ │
│  │  (Overview) │  │  (Chat UI)  │  │  (Charts/Positions) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                         │                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         WebSocket Client (Real-time Events)         │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / WSS
┌───────────────────────────┴─────────────────────────────────┐
│              BACKEND (Node.js/Express)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  REST API   │  │  WebSocket  │  │  Agent Orchestrator │ │
│  │   Routes    │  │   Server    │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                         │                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Event Bus (Redis Pub/Sub)              │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│              DATA LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  PostgreSQL │  │    Redis    │  │   File System       │ │
│  │  (Events,   │  │  (Session,  │  │   (tasks/*.md)      │ │
│  │   Agents)   │  │   Cache)    │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. Data Models

### 2.1 Event Model (Unified)

```typescript
interface Event {
  id: string;                    // UUID v4
  ts: string;                    // ISO 8601 timestamp
  type: EventType;               // See below
  actor: 'human' | 'agent' | 'system';
  actor_id: string;              // 'alice', 'planner', 'trading_bot'
  target_id?: string;            // task_id, symbol, agent_id
  payload: JSON;                 // Flexible payload based on type
  severity: 'info' | 'warn' | 'error' | 'critical';
  thread_id?: string;            // For grouping conversations
  metadata?: {
    ip?: string;
    user_agent?: string;
    correlation_id?: string;
  };
}

type EventType = 
  // Human interactions
  | 'human.command'
  | 'human.approval'
  | 'human.rejection'
  
  // Agent messages
  | 'agent.message'
  | 'agent.debate'
  | 'agent.review'
  | 'agent.request_hire'
  
  // Task lifecycle
  | 'task.created'
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.review_requested'
  
  // Trading events
  | 'trade.intent'
  | 'trade.order'
  | 'trade.fill'
  | 'trade.fee'
  | 'trade.pnl_update'
  | 'trade.decision_log'
  
  // System events
  | 'system.alert'
  | 'system.agent_registered'
  | 'system.budget_exceeded'
  | 'system.rate_limited'
  
  // ✅ 추가: Approval events
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired';
```

### 2.2 Agent Registry Model

```typescript
interface Agent {
  agent_id: string;              // Unique identifier
  name: string;                  // Display name
  role: AgentRole;               // Primary role
  status: 'idle' | 'active' | 'paused' | 'error';
  
  // Capabilities
  skills: string[];              // ['trading', 'analysis', 'coding']
  tools: string[];               // ['binance_api', 'dune', 'github']
  
  // Budget & Limits
  budget: {
    daily_max: number;           // USD
    monthly_max: number;         // USD
    current_usage: number;       // USD
  };
  rate_limits: {
    requests_per_minute: number;
    tokens_per_day: number;
  };
  
  // Permissions
  permissions: {
    can_create_agents: boolean;  // Requires approval
    can_execute_trades: boolean; // Requires approval for live
    can_deploy: boolean;         // Requires approval
    auto_approve_simulation: boolean; // Sim trades OK
  };
  
  // Relationships
  created_by: string;            // 'human:alice' or 'agent:planner'
  parent_agent_id?: string;      // If spawned by another agent
  
  // Metadata
  created_at: string;
  updated_at: string;
  policy_version: string;
}

type AgentRole = 
  | 'supervisor'      // Orchestrator
  | 'triage'          // Task routing
  | 'planner'         // Task decomposition
  | 'coder'           // Code generation
  | 'tester'          // Testing/validation
  | 'reviewer'        // Code review
  | 'trader'          // Trading strategy
  | 'researcher'      // Market research
  | 'executor';       // Trade execution (human-approved)
```

### 2.3 Task Model (MD-based)

```typescript
interface Task {
  task_id: string;
  title: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  
  // Assignment
  assignee?: string;             // agent_id
  reviewer?: string;             // agent_id for review
  
  // Content (Source of Truth: tasks/{task_id}.md)
  md_path: string;               // Relative path to MD file
  
  // Index fields (for DB queries)
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  tags: string[];
  created_by: string;
  
  // Timeline
  created_at: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  
  // Relationships
  parent_task_id?: string;
  subtask_ids: string[];
  thread_id: string;             // Links to event thread
}
```

### 2.4 Trading State Model

```typescript
interface TradingState {
  account: {
    balance: number;             // Total balance
    available: number;           // Available for trading
    margin_used: number;         // Locked in positions
    unrealized_pnl: number;      // Open PnL
  };
  
  positions: Position[];
  
  risk_metrics: {
    total_exposure: number;      // Sum of position sizes
    max_leverage: number;        // Current max leverage
    margin_ratio: number;        // Margin health
    daily_drawdown: number;      // Today's drawdown
  };
}

interface Position {
  position_id: string;
  symbol: string;                // 'BTC-USDT'
  direction: 'long' | 'short';
  leverage: number;              // 1-10x
  
  // Entry
  entry_price: number;
  entry_time: string;
  margin: number;                // Collateral
  size: number;                  // Position size in base asset
  
  // Current
  mark_price: number;
  liquidation_price?: number;
  
  // PnL
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;          // From partial closes
  
  // Fees
  entry_fee: number;
  funding_fees: number;
  
  // Decision
  decision_log: {
    signals: string[];           // ['ema_cross', 'rsi_oversold']
    confidence: number;          // 0-1
    expected_profit: number;     // After fees
    risk_reward: number;
  };
}
```

## 3. API Specification

### 3.1 REST Endpoints

#### Agents
```
GET    /api/agents              // List all agents
GET    /api/agents/:id          // Get agent details
POST   /api/agents              // Create new agent (with approval gate)
PATCH  /api/agents/:id/status   // Pause/resume agent
DELETE /api/agents/:id          // Deregister agent
```

#### Tasks
```
GET    /api/tasks               // List tasks (with filters)
GET    /api/tasks/:id           // Get task + MD content
POST   /api/tasks               // Create task
PATCH  /api/tasks/:id           // Update status/assignee
POST   /api/tasks/:id/subtasks  // Add subtask
```

#### Events
```
GET    /api/events              // Query events (time range, type, actor)
GET    /api/events/stream       // SSE endpoint for events
POST   /api/events              // Create event (internal use)
```

#### Trading
```
GET    /api/trading/state       // Current positions, balance, metrics
GET    /api/trading/events      // Trade events (orders, fills, pnl)
GET    /api/trading/decision-log // Bot decision rationale
POST   /api/trading/intent      // Submit trade intent (for approval)
```

#### Commands
```
POST   /api/commands            // Send command to agent
Body: { to_agent_id, text, thread_id? }
```

### 3.2 WebSocket Protocol

#### Connection
```
WS /ws

// Authentication (first message)
{
  type: 'auth',
  token: 'jwt_token'
}
```

#### Client → Server
```
// Subscribe to events
{
  type: 'subscribe',
  filters: {
    types: ['agent.message', 'trade.fill'],
    actors: ['trading_bot'],
    since: '2026-02-26T00:00:00Z'
  },
  last_event_id: 'evt_123',      // ✅ 추가: 커서 기반 재연결
  after_ts: '2026-02-26T12:00:00Z'  // ✅ 추가: 타임스탬프 기반
}

// Send command
{
  type: 'command',
  payload: {
    to_agent_id: 'planner',
    text: 'Analyze ETH chart',
    thread_id: 'thread_123'
  }
}

// Request approval
{
  type: 'approval_request',
  payload: {
    request_id: 'req_456',
    action: 'agent_hire',
    details: { name: 'coder_v2', role: 'coder' }
  }
}
```

#### Server → Client
```
// Event broadcast
{
  type: 'event',
  payload: {
    id: 'evt_789',
    ts: '2026-02-26T12:34:56Z',
    type: 'agent.message',
    actor: 'agent',              // ✅ 수정: 'human' | 'agent' | 'system'
    actor_id: 'planner',         // ✅ 수정: 구체적 ID
    payload: { 
      text: 'Analysis complete: bullish signal'  // ✅ 필수 필드
    },
    thread_id: 'thread_123'
  }
}

// Approval required
{
  type: 'approval_required',
  payload: {
    request_id: 'req_456',
    action: 'agent_hire',
    requested_by: 'supervisor',
    details: { ... },
    timeout_seconds: 300
  }
}
```

## 4. Security & Approval Gates

### 4.1 Approval Required Actions

| Action | Default | Can Auto-Approve |
|--------|---------|------------------|
| Create new agent | ❌ Requires approval | If budget < $X AND role in whitelist |
| Execute live trade | ❌ Requires approval | Simulation only (auto) |
| Deploy to production | ❌ Requires approval | Never (always human) |
| Increase budget | ❌ Requires approval | Never |
| Change permissions | ❌ Requires approval | Never |

### 4.2 Budget & Rate Limits

```typescript
// Default limits per agent
const DEFAULT_LIMITS = {
  daily_budget: 10.00,           // USD
  monthly_budget: 100.00,        // USD
  requests_per_minute: 60,
  tokens_per_day: 100000,
  trades_per_day: 10,            // Live trades
  sim_trades_per_day: 1000       // Simulation unlimited
};

// Hard limits (cannot be exceeded even with approval)
const HARD_LIMITS = {
  max_leverage: 10,
  max_position_size: 0.5,        // 50% of balance
  max_daily_drawdown: 0.1        // 10% of balance
};
```

## 5. MVP Implementation Priority

### P0 (Must Have - Week 1)
1. Event system (DB schema + basic API)
2. WebSocket server with pub/sub
3. Agent chat UI with speech bubbles
4. Stub agent that responds to commands
5. Basic approval gate UI

### P1 (Should Have - Week 2)
1. Agent registry with roles/permissions
2. Task creation/assignment flow
3. Trading state API
4. Position cards in UI
5. Decision log display

### P2 (Nice to Have - Week 3)
1. Full trading chart integration
2. Advanced agent collaboration (debate, review)
3. Budget tracking dashboard
4. Rate limiting enforcement
5. Mobile responsiveness

## 6. Database Schema (PostgreSQL)

```sql
-- Events table (partitioned by month recommended)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    actor VARCHAR(20) NOT NULL CHECK (actor IN ('human', 'agent', 'system')),
    actor_id VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'info',
    thread_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_events_ts ON events(ts DESC);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor_id);
CREATE INDEX idx_events_thread ON events(thread_id);

-- Agents table
CREATE TABLE agents (
    agent_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle',
    skills TEXT[],
    tools TEXT[],
    budget_daily_max DECIMAL(10,2),
    budget_monthly_max DECIMAL(10,2),
    budget_current_usage DECIMAL(10,2) DEFAULT 0,
    permissions JSONB DEFAULT '{}',
    created_by VARCHAR(100) NOT NULL,
    parent_agent_id VARCHAR(100) REFERENCES agents(agent_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (MD paths stored, content in files)
CREATE TABLE tasks (
    task_id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'backlog',
    assignee VARCHAR(100) REFERENCES agents(agent_id),
    reviewer VARCHAR(100) REFERENCES agents(agent_id),
    md_path VARCHAR(500) NOT NULL,
    priority VARCHAR(10) DEFAULT 'p2',
    tags TEXT[],
    created_by VARCHAR(100) NOT NULL,
    parent_task_id VARCHAR(100) REFERENCES tasks(task_id),
    subtask_ids TEXT[] DEFAULT '{}',
    thread_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ
);
```

## 7. File Structure

```
dongsu-admin/
├── docs/
│   ├── spec.md              # This file
│   └── tasks.md             # Implementation tasks
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── websocket/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── eventService.ts
│   │   │   ├── agentService.ts
│   │   │   ├── taskService.ts
│   │   │   └── tradingService.ts
│   │   └── models/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── bubbles/
│   │   │   └── trading/
│   │   └── services/
│   │       └── websocket.ts
│   └── package.json
└── tasks/                   # MD task files
    └── .gitkeep
```

---

## Summary: MVP First 5 Features

1. **Event System**: Unified Event table with WebSocket streaming
2. **Chat UI**: Real-time speech bubbles with actor differentiation
3. **Stub Agent**: Responds to commands with simulated processing
4. **Command API**: POST /api/commands with WS broadcast
5. **Basic Approval UI**: Shows pending approvals with approve/reject buttons
