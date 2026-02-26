import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'https://dongsu-admin-ws.onrender.com';

export function useWebSocket(filters = {}) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Subscribe with last_event_id
      const lastEventId = localStorage.getItem('last_event_id');
      socket.emit('subscribe', {
        filters,
        last_event_id: lastEventId || undefined
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('init', (data) => {
      setEvents(data.events);
      if (data.events.length > 0) {
        const lastId = data.events[data.events.length - 1].id;
        localStorage.setItem('last_event_id', lastId);
      }
    });

    socket.on('event', (event) => {
      setEvents(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        const newEvents = [...prev, event];
        if (newEvents.length > 500) return newEvents.slice(-500);
        return newEvents;
      });
      localStorage.setItem('last_event_id', event.id);
    });

    return () => {
      socket.disconnect();
    };
  }, [filters]);

  const sendCommand = useCallback(async (toAgentId, text) => {
    const API_URL = import.meta.env.VITE_API_BASE || 'https://dongsu-admin-ws.onrender.com';
    
    const res = await fetch(`${API_URL}/api/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_agent_id: toAgentId, text })
    });
    
    return res.json();
  }, []);

  return { connected, events, sendCommand };
}

export async function getAgents() {
  const API_URL = import.meta.env.VITE_API_BASE || 'https://dongsu-admin-ws.onrender.com';
  const res = await fetch(`${API_URL}/api/agents`);
  return res.json();
}
