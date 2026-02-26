const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { createEvent, listEvents } = require('./services/eventService');

const app = express();
const server = http.createServer(app);

// CORS - DEBUG
console.log('Setting up CORS...');
app.use(cors({
  origin: ['https://dongsu-admin.onrender.com', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
console.log('CORS setup complete');

app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ['https://dongsu-admin.onrender.com', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket connection handling
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send hello
  socket.emit('hello', {
    server_time: new Date().toISOString(),
    version: 'P0'
  });
  
  // Handle subscribe
  socket.on('subscribe', async (data) => {
    const { filters, last_event_id, after_ts } = data;
    
    const params = {
      limit: 200,
      types: filters?.types,
      actor_ids: filters?.actors,
      thread_id: filters?.thread_id
    };
    
    if (last_event_id) {
      params.after_id = last_event_id;
    } else if (after_ts) {
      params.after_ts = after_ts;
    } else if (filters?.since) {
      params.since = filters.since;
    }
    
    const events = await listEvents(params);
    socket.emit('init', { events, count: events.length });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast function
async function broadcastEvent(event) {
  io.emit('event', event);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'P0-socketio' });
});

// POST /api/commands
app.post('/api/commands', async (req, res) => {
  try {
    const { to_agent_id, text, thread_id } = req.body;
    
    const newThreadId = thread_id || `thread-${uuidv4()}`;
    
    const event = await createEvent({
      type: 'human.command',
      actor: 'human',
      actor_id: 'user',
      target_id: to_agent_id,
      payload: { text, to_agent_id },
      severity: 'info',
      thread_id: newThreadId
    });
    
    await broadcastEvent(event);
    
    // Stub agent response
    setTimeout(async () => {
      const responses = {
        'trading': ['ETH 차트 분석 중... RSI 65', '볼린저 밴드 상단 접근', '5x 롱 고려'],
        'research': ['DeFi 프로토콜 3개 발굴', 'EigenLayer TVL $15B', 'zkSync 리포트 작성 중'],
        'onchain': ['가스 25 Gwei', '고래 ETH 1000개 이동', 'Base TVL 10% 증가']
      };
      
      const agentResponses = responses[to_agent_id] || ['명령 수신 완료', '처리 중...'];
      const responseText = agentResponses[Math.floor(Math.random() * agentResponses.length)];
      
      const responseEvent = await createEvent({
        type: 'agent.message',
        actor: 'agent',
        actor_id: to_agent_id || 'stub_agent',
        target_id: 'user',
        payload: { 
          text: responseText,
          reply_to: event.id
        },
        severity: 'info',
        thread_id: newThreadId
      });
      
      await broadcastEvent(responseEvent);
    }, 1000 + Math.random() * 2000);
    
    res.json({ 
      ok: true, 
      thread_id: newThreadId,
      event_id: event.id
    });
    
  } catch (error) {
    console.error('Command error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/events
app.get('/api/events', async (req, res) => {
  try {
    const params = {
      limit: req.query.limit || 100,
      types: req.query.types?.split(','),
      actor_ids: req.query.actors?.split(','),
      thread_id: req.query.thread_id,
      after_id: req.query.after_id,
      after_ts: req.query.after_ts,
      since: req.query.since
    };
    
    const events = await listEvents(params);
    res.json({ events, count: events.length });
    
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents
app.get('/api/agents', async (req, res) => {
  try {
    const { pool } = require('./services/eventService');
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    res.json({ agents: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/approvals
app.get('/api/approvals', async (req, res) => {
  try {
    const { pool } = require('./services/eventService');
    const status = req.query.status || 'pending';
    
    const result = await pool.query(
      'SELECT * FROM approval_requests WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    res.json({ approvals: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Socket.IO: ws://localhost:${PORT}`);
});
