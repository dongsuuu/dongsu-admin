import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://dongsu-admin-ws.onrender.com';

export function useWebSocket(filters = {}) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setReconnecting(true);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WS connected');
      setConnected(true);
      setReconnecting(false);
      reconnectAttemptRef.current = 0;
      
      // Get last_event_id from localStorage
      const lastEventId = localStorage.getItem('last_event_id');
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        filters,
        last_event_id: lastEventId || undefined
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init') {
          setEvents(data.events);
          if (data.events.length > 0) {
            const lastId = data.events[data.events.length - 1].id;
            localStorage.setItem('last_event_id', lastId);
          }
        } else if (data.type === 'event') {
          setEvents(prev => {
            // Dedupe by id
            if (prev.some(e => e.id === data.payload.id)) {
              return prev;
            }
            const newEvents = [...prev, data.payload];
            if (newEvents.length > 500) {
              return newEvents.slice(-500);
            }
            return newEvents;
          });
          localStorage.setItem('last_event_id', data.payload.id);
        }
      } catch (error) {
        console.error('Message parse error:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      reconnectAttemptRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WS error:', error);
    };
  }, [filters]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendCommand = useCallback(async (toAgentId, text) => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://dongsu-admin-ws.onrender.com';
    
    const res = await fetch(`${API_URL}/api/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_agent_id: toAgentId, text })
    });
    
    return res.json();
  }, []);

  return { connected, events, sendCommand, reconnecting };
}

export async function getAgents() {
  const API_URL = import.meta.env.VITE_API_URL || 'https://dongsu-admin-ws.onrender.com';
  const res = await fetch(`${API_URL}/api/agents`);
  return res.json();
}
