const WebSocket = require('ws');
const { listEvents, createEvent } = require('./eventService');

const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ 
    noServer: true  // Handle upgrade manually
  });
  
  // Handle upgrade manually
  server.on('upgrade', (request, socket, head) => {
    console.log('Upgrade request:', request.url);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
  
  wss.on('connection', async (ws, req) => {
    console.log('Client connected from:', req.headers.origin);
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
            client.authed = true;
            ws.send(JSON.stringify({ type: 'auth_ok' }));
            break;
            
          case 'subscribe':
            client.subscriptions = msg.filters || {};
            
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

async function broadcastEvent(event) {
  const message = JSON.stringify({
    type: 'event',
    payload: event
  });
  
  // Get all clients from all wss instances
  // This is a workaround since we don't export wss
  // We'll use a global approach
  if (global.wssClients) {
    global.wssClients.forEach((clientInfo, ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      
      const { subscriptions } = clientInfo;
      
      if (subscriptions.types?.length > 0) {
        if (!subscriptions.types.includes(event.type)) return;
      }
      
      if (subscriptions.actors?.length > 0) {
        if (!subscriptions.actors.includes(event.actor_id)) return;
      }
      
      if (subscriptions.thread_id) {
        if (event.thread_id !== subscriptions.thread_id) return;
      }
      
      ws.send(message);
    });
  }
}

module.exports = {
  setupWebSocket,
  broadcastEvent
};
