import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket, getAgents } from '../hooks/useWebSocket';
import ChatBubble from '../components/ChatBubble';

function Agents() {
  const { connected, events, sendCommand } = useWebSocket();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  async function loadAgents() {
    const data = await getAgents();
    setAgents(data.agents || []);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !selectedAgent) return;

    setLoading(true);
    try {
      await sendCommand(selectedAgent.id, input);
      setInput('');
    } catch (error) {
      console.error('전송 실패:', error);
    }
    setLoading(false);
  }

  // 퀵 명령
  const quickCommands = [
    { label: '시장 분석', text: 'ETH 차트 분석해줘' },
    { label: '포지션 확인', text: '현재 포지션 알려줘' },
    { label: '상태 확인', text: '네 상태는?' },
    { label: '학습 중?', text: '지금 뭐 학습하고 있어?' }
  ];

  async function handleQuickCommand(cmd) {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await sendCommand(selectedAgent.id, cmd.text);
    } catch (error) {
      console.error('전송 실패:', error);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 왼쪽: 에이전트 목록 */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="text-lg font-bold mb-4">🤖 에이전트 학교</h2>
        
        <div className="space-y-3">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full p-4 rounded-xl border-2 transition text-left ${
                selectedAgent?.id === agent.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.icon}</span>
                <div>
                  <div className="font-bold">{agent.name}</div>
                  <div className={`text-sm ${
                    agent.status === 'active' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {agent.status === 'active' ? '● 활동 중' : '○ 대기 중'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="text-sm text-gray-600 mb-2">WebSocket 상태</div>
          <div className={`flex items-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
            {connected ? '실시간 연결됨' : '연결 끊김'}
          </div>
        </div>
      </div>

      {/* 오른쪽: 채팅 */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* 헤더 */}
            <div className="bg-white border-b p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedAgent.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                    <p className="text-gray-600">클릭해서 대화를 시작하세요</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {quickCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickCommand(cmd)}
                      disabled={loading}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-sm"
                    >
                      {cmd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {events.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-lg">{selectedAgent.name}와 대화를 시작핼보세요!</p>
                  <p className="text-sm mt-2">예: "ETH 분석해줘", "지금 뭐 하고 있어?"</p>
                </div>
              )}
              
              {events.map(event => (
                <ChatBubble key={event.id} event={event} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 */}
            <form onSubmit={handleSend} className="bg-white border-t p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`${selectedAgent.name}에게 메시지...`}
                  disabled={loading || !connected}
                  className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !connected}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 font-medium"
                >
                  {loading ? '전송 중...' : '전송'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🏫</div>
              <p className="text-xl">왼쪽에서 에이전트를 선택하세요</p>
              <p className="text-sm mt-2">각 에이전트는 특정 역할을 담당하고 있습니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Agents;
