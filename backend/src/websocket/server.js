const WebSocket = require('ws');
const { listEvents, createEvent } = require('./eventService');

const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws'  // ✅ path 고정
  });
  
  wss.on('connection', async (ws, req) => {
    console.log('Client connected');
    clients.set(ws, { subscriptions: {}, authed: false });
    
    // Send hello
    ws.send(JSON.stringify({
      type: 'hello',
      server_time: new Date().toISOString(),
      version: 'P0'
    }));
    
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        const client = clients.get(ws);
        
        switch (msg.type) {
          case 'auth':
            // P0: optional auth
            client.authed = true;
            ws.send(JSON.stringify({ type: 'auth_ok' }));
            break;
            
          case 'subscribe':
            // Store subscriptions
            client.subscriptions = msg.filters || {};
            
            // Fetch backlog based on priority: last_event_id > after_ts > since
            const params = {
              limit: msg.limit || 200,
              types: msg.filters?.types,
              actor_ids: msg.filters?.actors,
              thread_id: msg.filters?.thread_id
            };
            
            if (msg.last_event_id) {
              params.after_id = msg.last_event_id;
            } else if (msg.after_ts) {
              params.after_ts = msg.after_ts;
            } else if (msg.filters?.since) {
              params.since = msg.filters.since;
            }
            
            const events = await listEvents(params);
            
            // Send backlog
            ws.send(JSON.stringify({
              type: 'init',
              events: events,
              count: events.length
            }));
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        console.error('WS message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: error.message 
        }));
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WS error:', error);
      clients.delete(ws);
    });
  });
  
  return wss;
}

// Broadcast event to all subscribers
async function broadcastEvent(event) {
  const message = JSON.stringify({
    type: 'event',
    payload: event
  });
  
  clients.forEach((client, ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    
    const { subscriptions } = client;
    
    // Filter by type
    if (subscriptions.types?.length > 0) {
      if (!subscriptions.types.includes(event.type)) return;
    }
    
    // Filter by actor
    if (subscriptions.actors?.length > 0) {
      if (!subscriptions.actors.includes(event.actor_id)) return;
    }
    
    // Filter by thread
    if (subscriptions.thread_id) {
      if (event.thread_id !== subscriptions.thread_id) return;
    }
    
    ws.send(message);
  });
}

module.exports = {
  setupWebSocket,
  broadcastEvent
};
