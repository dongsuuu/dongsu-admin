-- Migration 001: Initial Schema for P0

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    actor VARCHAR(20) NOT NULL CHECK (actor IN ('human', 'agent', 'system')),
    actor_id VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
    thread_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_thread ON events(thread_id);
CREATE INDEX IF NOT EXISTS idx_events_cursor ON events(ts, id);

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_by VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_expires ON approval_requests(expires_at);

-- Agents table (P0 minimal)
CREATE TABLE IF NOT EXISTS agents (
    agent_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'paused', 'error')),
    skills TEXT[] DEFAULT '{}',
    tools TEXT[] DEFAULT '{}',
    permissions JSONB DEFAULT '{"can_create_agents": false, "can_execute_trades": false, "can_deploy": false}',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (P0 schema only)
CREATE TABLE IF NOT EXISTS tasks (
    task_id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'backlog',
    assignee VARCHAR(100),
    md_path VARCHAR(500) NOT NULL,
    priority VARCHAR(10) DEFAULT 'p2',
    tags TEXT[] DEFAULT '{}',
    created_by VARCHAR(100) NOT NULL,
    parent_task_id VARCHAR(100),
    thread_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Insert default agents
INSERT INTO agents (agent_id, name, role, status, skills, created_by) VALUES
('trading', '트레이딩 에이전트', 'trader', 'active', ARRAY['trading', 'analysis'], 'system'),
('research', '리서치 에이전트', 'researcher', 'active', ARRAY['research', 'analysis'], 'system'),
('onchain', '온체인 에이전트', 'onchain', 'active', ARRAY['onchain', 'monitoring'], 'system')
ON CONFLICT (agent_id) DO NOTHING;
