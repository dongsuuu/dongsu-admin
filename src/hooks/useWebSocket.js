import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'wss://dongsu-admin-ws.onrender.com';
const API_URL = process.env.REACT_APP_API_URL || 'https://dongsu-admin-ws.onrender.com';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef(null);
  const lastEventIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    setReconnecting(true);

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
      setConnected(true);
      setReconnecting(false);
      
      // 구독 요청 (커서 기반)
      ws.send(JSON.stringify({
        type: 'subscribe',
        last_event_id: lastEventIdRef.current,
        filters: {}
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init') {
          // 초기 이벤트 로드
          setEvents(data.events);
          if (data.events.length > 0) {
            lastEventIdRef.current = data.events[data.events.length - 1].id;
          }
        } else if (data.type === 'event') {
          // 실시간 이벤트
          setEvents(prev => {
            const newEvents = [...prev, data.payload];
            // 최대 500개 유지
            if (newEvents.length > 500) {
              return newEvents.slice(-500);
            }
            return newEvents;
          });
          lastEventIdRef.current = data.payload.id;
        }
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      setConnected(false);
      wsRef.current = null;
      
      // 자동 재연결
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('재연결 시도...');
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };
  }, []);

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

  // 수동 재연결
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

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

  return { 
    connected, 
    events, 
    sendCommand, 
    reconnect, 
    reconnecting,
    lastEventId: lastEventIdRef.current 
  };
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

export async function getEvents(cursor, limit = 100) {
  try {
    const params = new URLSearchParams();
    if (cursor) params.append('after_id', cursor);
    params.append('limit', limit.toString());
    
    const response = await fetch(`${API_URL}/api/events?${params}`);
    return await response.json();
  } catch (error) {
    console.error('이벤트 조회 실패:', error);
    return { events: [] };
  }
}
