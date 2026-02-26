-- PostgreSQL Schema for Multi-Agent Dashboard

-- Events table (partitioned by month recommended for production)
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

-- Indexes
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
    requested_by_actor VARCHAR(20) NOT NULL,
    details JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_request_id ON approval_requests(request_id);

-- Agents registry
CREATE TABLE IF NOT EXISTS agents (
    agent_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'paused', 'error')),
    skills TEXT[] DEFAULT '{}',
    tools TEXT[] DEFAULT '{}',
    budget_daily_max DECIMAL(10,2) DEFAULT 10.00,
    budget_monthly_max DECIMAL(10,2) DEFAULT 100.00,
    budget_current_usage DECIMAL(10,2) DEFAULT 0.00,
    permissions JSONB DEFAULT '{"can_create_agents": false, "can_execute_trades": false, "can_deploy": false, "auto_approve_simulation": true}',
    created_by VARCHAR(100) NOT NULL,
    created_by_actor VARCHAR(20) NOT NULL,
    parent_agent_id VARCHAR(100) REFERENCES agents(agent_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default agents
INSERT INTO agents (agent_id, name, role, status, skills, created_by, created_by_actor) VALUES
('trading', '트레이딩 에이전트', 'trader', 'active', ARRAY['trading', 'analysis'], 'system', 'system'),
('research', '리서치 에이전트', 'researcher', 'active', ARRAY['research', 'analysis'], 'system', 'system'),
('onchain', '온체인 에이전트', 'onchain', 'active', ARRAY['onchain', 'monitoring'], 'system', 'system')
ON CONFLICT (agent_id) DO NOTHING;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Event type whitelist for validation
CREATE TABLE IF NOT EXISTS event_type_whitelist (
    type VARCHAR(50) PRIMARY KEY,
    description TEXT,
    requires_approval BOOLEAN DEFAULT false
);

INSERT INTO event_type_whitelist (type, description, requires_approval) VALUES
('human.command', 'Human command to agent', false),
('human.approval', 'Human approved action', false),
('human.rejection', 'Human rejected action', false),
('agent.message', 'Agent response message', false),
('agent.debate', 'Agent debate/discussion', false),
('agent.review', 'Agent code review', false),
('agent.request_hire', 'Agent requests to hire new agent', true),
('task.created', 'Task created', false),
('task.assigned', 'Task assigned', false),
('task.started', 'Task started', false),
('task.completed', 'Task completed', false),
('task.failed', 'Task failed', false),
('trade.intent', 'Trade intent declared', false),
('trade.order', 'Trade order submitted', true),
('trade.fill', 'Trade filled', false),
('trade.fee', 'Trade fee charged', false),
('trade.pnl_update', 'PnL updated', false),
('trade.decision_log', 'Trading decision rationale', false),
('system.alert', 'System alert', false),
('system.agent_registered', 'New agent registered', false),
('system.budget_exceeded', 'Budget limit exceeded', false),
('system.rate_limited', 'Rate limit hit', false),
('approval.requested', 'Approval requested', false),
('approval.approved', 'Approval granted', false),
('approval.rejected', 'Approval rejected', false)
ON CONFLICT (type) DO NOTHING;
