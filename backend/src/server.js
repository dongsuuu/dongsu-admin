const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// 메모리에 이벤트 저장 (임시)
const events = [];
const clients = new Set();

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  console.log('클이언트 연결됨');
  clients.add(ws);
  
  // 최근 50개 이벤트 전송
  const recentEvents = events.slice(-50);
  ws.send(JSON.stringify({
    type: 'init',
    events: recentEvents
  }));
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// 이벤트 브로드캐스트
function broadcast(event) {
  const message = JSON.stringify({
    type: 'event',
    payload: event
  });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API

// 이벤트 생성
app.post('/api/events', (req, res) => {
  const event = {
    id: uuidv4(),
    ts: new Date().toISOString(),
    type: req.body.type || 'system.message',
    actor: req.body.actor || 'system',
    actor_id: req.body.actor_id || 'system',
    target_id: req.body.target_id,
    payload: req.body.payload || {},
    severity: req.body.severity || 'info',
    thread_id: req.body.thread_id
  };
  
  events.push(event);
  
  // WebSocket으로 브로드캐스트
  broadcast(event);
  
  res.json({ success: true, event });
});

// 이벤트 조회
app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const recentEvents = events.slice(-limit);
  res.json({ events: recentEvents, count: recentEvents.length });
});

// 명령 실행
app.post('/api/commands', async (req, res) => {
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
  
  events.push(commandEvent);
  broadcast(commandEvent);
  
  // Stub agent 응답 (1-3초 후)
  setTimeout(() => {
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
    
    events.push(responseEvent);
    broadcast(responseEvent);
  }, 1000 + Math.random() * 2000);
  
  res.json({ 
    success: true, 
    command_id: commandEvent.id,
    thread_id: commandEvent.thread_id
  });
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

// 에이전트 목록
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      { id: 'trading', name: '트레이딩 에이전트', status: 'active', icon: '📈' },
      { id: 'research', name: '리서치 에이전트', status: 'active', icon: '🔍' },
      { id: 'onchain', name: '온체인 에이전트', status: 'active', icon: '⛓️' }
    ]
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});
