const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// PostgreSQL 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/dongsu',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 이벤트 타입 화이트리스트
const VALID_EVENT_TYPES = new Set([
  'human.command', 'human.approval', 'human.rejection',
  'agent.message', 'agent.debate', 'agent.review', 'agent.request_hire',
  'task.created', 'task.assigned', 'task.started', 'task.completed', 'task.failed',
  'trade.intent', 'trade.order', 'trade.fill', 'trade.fee', 'trade.pnl_update', 'trade.decision_log',
  'system.alert', 'system.agent_registered', 'system.budget_exceeded', 'system.rate_limited',
  'approval.requested', 'approval.approved', 'approval.rejected'
]);

app.use(cors());
app.use(express.json());

// WebSocket 클라이언트 관리
const clients = new Map(); // ws -> { subscriptions: [], lastEventId }

// 이벤트 브로드캐스트
async function broadcastEvent(event) {
  const message = JSON.stringify({
    type: 'event',
    payload: event
  });
  
  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      // 필터링 로직 (subscriptions 기반)
      const { subscriptions } = clientInfo;
      if (subscriptions.length === 0 || subscriptions.includes(event.type)) {
        ws.send(message);
      }
    }
  });
}

// 이벤트 저장 + 브로드캐스트
async function saveAndBroadcast(event) {
  try {
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
        JSON.stringify(event.metadata || {})
      ]
    );
    
    await broadcastEvent(result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('이벤트 저장 실패:', error);
    throw error;
  }
}

// WebSocket 연결 처리
wss.on('connection', async (ws, req) => {
  console.log('클리언트 연결됨');
  
  clients.set(ws, {
    subscriptions: [],
    lastEventId: null
  });
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      const clientInfo = clients.get(ws);
      
      switch (msg.type) {
        case 'subscribe':
          // 구독 설정
          clientInfo.subscriptions = msg.filters?.types || [];
          clientInfo.lastEventId = msg.last_event_id;
          
          // 최근 이벤트 또는 커서 기반 이벤트 전송
          let recentEvents;
          if (msg.last_event_id) {
            // 커서 기반 (재연결 시)
            const result = await pool.query(
              `SELECT * FROM events 
               WHERE (ts, id) > (SELECT ts, id FROM events WHERE id = $1)
               ORDER BY ts ASC
               LIMIT 200`,
              [msg.last_event_id]
            );
            recentEvents = result.rows;
          } else {
            // 최근 50개
            const result = await pool.query(
              `SELECT * FROM events ORDER BY ts DESC LIMIT 50`
            );
            recentEvents = result.rows.reverse();
          }
          
          ws.send(JSON.stringify({
            type: 'init',
            events: recentEvents
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('WS 메시지 처리 오류:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WS 오류:', error);
    clients.delete(ws);
  });
});

// REST API

// 이벤트 생성 (남부 전용 - 외부 API가 직접 호출하지 않음)
app.post('/api/events', async (req, res) => {
  try {
    // 화이트리스트 검증
    if (!VALID_EVENT_TYPES.has(req.body.type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    
    const event = {
      id: uuidv4(),
      ts: new Date().toISOString(),
      type: req.body.type,
      actor: req.body.actor,
      actor_id: req.body.actor_id,
      target_id: req.body.target_id,
      payload: req.body.payload || {},
      severity: req.body.severity || 'info',
      thread_id: req.body.thread_id,
      metadata: req.body.metadata || {}
    };
    
    const saved = await saveAndBroadcast(event);
    res.json({ success: true, event: saved });
    
  } catch (error) {
    console.error('이벤트 생성 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 이벤트 조회 (커서 기반 페이지네이션)
app.get('/api/events', async (req, res) => {
  try {
    const { after_id, before_id, limit = 100, type, actor_id } = req.query;
    
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    
    if (after_id) {
      query += ` AND (ts, id) > (SELECT ts, id FROM events WHERE id = $${paramIdx})`;
      params.push(after_id);
      paramIdx++;
    }
    
    if (before_id) {
      query += ` AND (ts, id) < (SELECT ts, id FROM events WHERE id = $${paramIdx})`;
      params.push(before_id);
      paramIdx++;
    }
    
    if (type) {
      query += ` AND type = $${paramIdx}`;
      params.push(type);
      paramIdx++;
    }
    
    if (actor_id) {
      query += ` AND actor_id = $${paramIdx}`;
      params.push(actor_id);
      paramIdx++;
    }
    
    query += ` ORDER BY ts DESC LIMIT $${paramIdx}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    res.json({ events: result.rows, count: result.rows.length });
    
  } catch (error) {
    console.error('이벤트 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 명령 실행 (외부 API - human.command 생성)
app.post('/api/commands', async (req, res) => {
  try {
    const { to_agent_id, text, thread_id } = req.body;
    
    // human.command 이벤트 생성
    const commandEvent = {
      id: uuidv4(),
      ts: new Date().toISOString(),
      type: 'human.command',
      actor: 'human',
      actor_id: 'user',
      target_id: to_agent_id,
      payload: { text, to_agent_id },
      severity: 'info',
      thread_id: thread_id || uuidv4()
    };
    
    await saveAndBroadcast(commandEvent);
    
    // Stub agent 응답 (비동기)
    setTimeout(async () => {
      const responseEvent = {
        id: uuidv4(),
        ts: new Date().toISOString(),
        type: 'agent.message',
        actor: 'agent',
        actor_id: to_agent_id || 'stub_agent',
        target_id: 'user',
        payload: { 
          text: generateAgentResponse(to_agent_id, text),
          reply_to: commandEvent.id
        },
        severity: 'info',
        thread_id: commandEvent.thread_id
      };
      
      await saveAndBroadcast(responseEvent);
    }, 1000 + Math.random() * 2000);
    
    res.json({ 
      success: true, 
      command_id: commandEvent.id,
      thread_id: commandEvent.thread_id
    });
    
  } catch (error) {
    console.error('명령 실행 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 에이전트 목록
app.get('/api/agents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    res.json({ agents: result.rows });
  } catch (error) {
    console.error('에이전트 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 승인 요청 생성
app.post('/api/approvals/request', async (req, res) => {
  try {
    const { action, details, requested_by, expires_in_minutes = 30 } = req.body;
    
    const requestId = `req-${uuidv4().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + expires_in_minutes * 60000);
    
    const result = await pool.query(
      `INSERT INTO approval_requests 
       (request_id, action, status, requested_by, requested_by_actor, details, expires_at)
       VALUES ($1, $2, 'pending', $3, 'agent', $4, $5)
       RETURNING *`,
      [requestId, action, requested_by, JSON.stringify(details), expiresAt]
    );
    
    // approval.requested 이벤트 생성
    await saveAndBroadcast({
      id: uuidv4(),
      ts: new Date().toISOString(),
      type: 'approval.requested',
      actor: 'agent',
      actor_id: requested_by,
      payload: { request_id: requestId, action, details },
      severity: 'warn'
    });
    
    res.json({ success: true, request: result.rows[0] });
    
  } catch (error) {
    console.error('승인 요청 생성 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 승인/거부
app.post('/api/approvals/:requestId/resolve', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, resolved_by } = req.body; // 'approved' | 'rejected'
    
    const result = await pool.query(
      `UPDATE approval_requests 
       SET status = $1, resolved_at = NOW(), resolved_by = $2
       WHERE request_id = $3
       RETURNING *`,
      [status, resolved_by, requestId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // 이벤트 생성
    await saveAndBroadcast({
      id: uuidv4(),
      ts: new Date().toISOString(),
      type: `approval.${status}`,
      actor: 'human',
      actor_id: resolved_by,
      payload: { request_id: requestId, action: result.rows[0].action },
      severity: 'info'
    });
    
    res.json({ success: true, request: result.rows[0] });
    
  } catch (error) {
    console.error('승인 처리 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stub agent 응답 생성
function generateAgentResponse(agentId, command) {
  const responses = {
    'trading': [
      'ETH 차트 분석 중... RSI 65로 중립적입니다.',
      '볼린저 밴드 상단에 접근 중. 조정 가능성 있음.',
      '거래량 증가 + 가격 상승 = 강한 추세',
      '5x 롱 포지션 진입을 고려핼만 합니다.'
    ],
    'research': [
      '새로운 DeFi 프로토콜 3개 발굴했습니다.',
      'EigenLayer TVL $15B 돌파. 리스크 점검 필요.',
      '에어드랍 후보 프로젝트 분석 완료.',
      'zkSync 생태계 리포트 작성 중...'
    ],
    'onchain': [
      '가스 25 Gwei. 평균보다 낮음.',
      '고래 ETH 1000개 이동 감지.',
      'Base 체인 TVL 10% 증가.',
      '스마트 컨트랙트 50개 배포됨.'
    ],
    'default': [
      '명령을 이해했습니다. 처리 중...',
      '데이터를 분석하고 있습니다.',
      '작업을 완료했습니다.',
      '추가 명령이 있으신가요?'
    ]
  };
  
  const agentResponses = responses[agentId] || responses['default'];
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
