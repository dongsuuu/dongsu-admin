import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'wss://dongsu-admin-ws.onrender.com';
const API_URL = 'https://dongsu-admin-ws.onrender.com';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'init') {
        setEvents(data.events);
      } else if (data.type === 'event') {
        setEvents(prev => [...prev, data.payload]);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendCommand = useCallback(async (toAgentId, text) => {
    try {
      const response = await fetch(`${API_URL}/api/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_agent_id: toAgentId,
          text,
          thread_id: `thread-${Date.now()}`
        })
      });
      return await response.json();
    } catch (error) {
      console.error('명령 전송 실패:', error);
      throw error;
    }
  }, []);

  return { connected, events, sendCommand };
}

export async function getAgents() {
  try {
    const response = await fetch(`${API_URL}/api/agents`);
    return await response.json();
  } catch (error) {
    console.error('에이전트 조회 실패:', error);
    return { agents: [] };
  }
}
