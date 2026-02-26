const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Payload validation rules
const PAYLOAD_RULES = {
  'human.command': ['text'],
  'agent.message': ['text'],
  'agent.debate': ['text'],
  'agent.review': ['text'],
  'trade.intent': ['symbol', 'mode'],
  'trade.order': ['symbol', 'mode'],
  'trade.fill': ['symbol', 'mode'],
  'trade.fee': ['symbol', 'mode'],
  'trade.pnl_update': ['symbol', 'mode'],
  'trade.decision_log': ['symbol', 'mode'],
  'task.created': ['task_id'],
  'task.assigned': ['task_id'],
  'task.started': ['task_id'],
  'task.completed': ['task_id'],
  'task.failed': ['task_id'],
  'approval.requested': ['request_id'],
  'approval.approved': ['request_id'],
  'approval.rejected': ['request_id']
};

function validatePayload(type, payload) {
  const required = PAYLOAD_RULES[type];
  if (!required) return true; // No validation for unknown types
  
  for (const field of required) {
    if (payload[field] === undefined) {
      throw new Error(`Payload validation failed: ${type} requires ${field}`);
    }
  }
  
  // Validate trade mode
  if (type.startsWith('trade.')) {
    if (!['paper', 'live'].includes(payload.mode)) {
      throw new Error(`Payload validation failed: trade events require mode to be 'paper' or 'live'`);
    }
  }
  
  return true;
}

async function createEvent(input) {
  // Validate payload
  validatePayload(input.type, input.payload || {});
  
  const event = {
    id: uuidv4(),
    ts: new Date().toISOString(),
    type: input.type,
    actor: input.actor,
    actor_id: input.actor_id,
    target_id: input.target_id || null,
    payload: input.payload || {},
    severity: input.severity || 'info',
    thread_id: input.thread_id || null,
    metadata: input.metadata || {}
  };
  
  const result = await pool.query(
    `INSERT INTO events (id, ts, type, actor, actor_id, target_id, payload, severity, thread_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      event.id,
      event.ts,
      event.type,
      event.actor,
      event.actor_id,
      event.target_id,
      JSON.stringify(event.payload),
      event.severity,
      event.thread_id,
      JSON.stringify(event.metadata)
    ]
  );
  
  return result.rows[0];
}

async function listEvents(params = {}) {
  const { 
    limit = 100, 
    types, 
    actor_ids, 
    thread_id, 
    after_id, 
    after_ts, 
    since 
  } = params;
  
  let query = 'SELECT * FROM events WHERE 1=1';
  const queryParams = [];
  let paramIdx = 1;
  
  // Priority: after_id > after_ts > since > latest
  if (after_id) {
    query += ` AND (ts, id) > (SELECT ts, id FROM events WHERE id = $${paramIdx})`;
    queryParams.push(after_id);
    paramIdx++;
  } else if (after_ts) {
    query += ` AND ts > $${paramIdx}`;
    queryParams.push(after_ts);
    paramIdx++;
  } else if (since) {
    query += ` AND ts > $${paramIdx}`;
    queryParams.push(since);
    paramIdx++;
  }
  
  if (types && types.length > 0) {
    query += ` AND type = ANY($${paramIdx})`;
    queryParams.push(types);
    paramIdx++;
  }
  
  if (actor_ids && actor_ids.length > 0) {
    query += ` AND actor_id = ANY($${paramIdx})`;
    queryParams.push(actor_ids);
    paramIdx++;
  }
  
  if (thread_id) {
    query += ` AND thread_id = $${paramIdx}`;
    queryParams.push(thread_id);
    paramIdx++;
  }
  
  query += ` ORDER BY ts ASC LIMIT $${paramIdx}`;
  queryParams.push(parseInt(limit));
  
  const result = await pool.query(query, queryParams);
  return result.rows;
}

async function getLatestCursor() {
  const result = await pool.query(
    'SELECT id as last_event_id, ts as last_ts FROM events ORDER BY ts DESC LIMIT 1'
  );
  return result.rows[0] || { last_event_id: null, last_ts: null };
}

module.exports = {
  createEvent,
  listEvents,
  getLatestCursor,
  pool
};
