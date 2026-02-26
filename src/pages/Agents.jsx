import React, { useState, useEffect, useRef } from 'react'
import { getAgents, executeCommand } from '../api/client'

function Agents() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadAgents()
    const interval = setInterval(loadAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadAgents() {
    const data = await getAgents()
    if (data) setAgents(data.agents || [])
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function addMessage(sender, text, type = 'text') {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      type,
      time: new Date().toLocaleTimeString('ko-KR')
    }])
  }

  async function handleSend() {
    if (!input.trim() || !selectedAgent) return

    const userMessage = input.trim()
    addMessage('사용자', userMessage)
    setInput('')
    setLoading(true)

    // 명령어 파싱
    const command = parseCommand(userMessage)
    
    try {
      addMessage(selectedAgent.name, '명령 실행 중...', 'typing')
      
      const result = await executeCommand(command.action, selectedAgent.id, command.params)
      
      // 타이핑 메시지 제거
      setMessages(prev => prev.filter(m => m.type !== 'typing'))
      
      // 결과 표시
      addMessage(selectedAgent.name, formatResult(result), 'result')
      
      // 에이전트 상태 갱신
      await loadAgents()
      
    } catch (error) {
      setMessages(prev => prev.filter(m => m.type !== 'typing'))
      addMessage('시스템', `오류: ${error.message}`, 'error')
    }
    
    setLoading(false)
  }

  function parseCommand(text) {
    const lower = text.toLowerCase()
    
    if (lower.includes('분석') || lower.includes('analyze')) {
      return { action: 'analyze', params: { symbol: 'ETH' } }
    }
    if (lower.includes('매매') || lower.includes('trade')) {
      return { action: 'trade', params: { symbol: 'ETH' } }
    }
    if (lower.includes('포지션') || lower.includes('position')) {
      return { action: 'positions' }
    }
    if (lower.includes('상태') || lower.includes('status')) {
      return { action: 'status' }
    }
    if (lower.includes('중지') || lower.includes('pause')) {
      return { action: 'pause' }
    }
    if (lower.includes('시작') || lower.includes('restart')) {
      return { action: 'restart' }
    }
    
    return { action: 'chat', params: { message: text } }
  }

  function formatResult(result) {
    if (!result) return '결과 없음'
    return JSON.stringify(result.result, null, 2)
  }

  // 퀵 명령 버튼
  const quickCommands = [
    { label: '시장 분석', cmd: 'analyze', icon: '📊' },
    { label: '포지션 확인', cmd: 'positions', icon: '📋' },
    { label: '상태 확인', cmd: 'status', icon: '✅' },
    { label: '일시 중지', cmd: 'pause', icon: '⏸️' },
  ]

  async function handleQuickCommand(cmd) {
    if (!selectedAgent) {
      addMessage('시스템', '에이전트를 먼저 선택하세요', 'error')
      return
    }
    
    addMessage('사용자', `[퀵 명령] ${cmd.label}`)
    setLoading(true)
    
    try {
      addMessage(selectedAgent.name, '처리 중...', 'typing')
      const result = await executeCommand(cmd.cmd, selectedAgent.id)
      setMessages(prev => prev.filter(m => m.type !== 'typing'))
      addMessage(selectedAgent.name, formatResult(result), 'result')
      await loadAgents()
    } catch (error) {
      setMessages(prev => prev.filter(m => m.type !== 'typing'))
      addMessage('시스템', `오류: ${error.message}`, 'error')
    }
    
    setLoading(false)
  }

  return (
    <div className="flex h-screen">
      {/* 왼쪽: 에이전트 목록 */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="text-lg font-bold mb-4">에이전트 목록</h2>
        <div className="space-y-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full p-3 rounded-lg text-left transition ${
                selectedAgent?.id === agent.id 
                  ? 'bg-blue-100 border-blue-500 border' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{agent.name}</div>
              <div className={`text-sm ${
                agent.status === 'running' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {agent.status === 'running' ? '● 실행 중' : '○ 대기 중'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 오른쪽: 채팅 + 명령 */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* 헤더 */}
            <div className="bg-white border-b p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                  <p className="text-gray-600">{selectedAgent.description || 'AI 에이전트'}</p>
                </div>
                <div className="flex gap-2">
                  {quickCommands.map(cmd => (
                    <button
                      key={cmd.cmd}
                      onClick={() => handleQuickCommand(cmd)}
                      disabled={loading}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm disabled:opacity-50"
                    >
                      {cmd.icon} {cmd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 채팅 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  💬 {selectedAgent.name}에게 명령을 날려보세요!
                  <br />
                  예: "ETH 분석해줘", "포지션 확인", "상태 알려줘"
                </div>
              )}
              
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === '사용자' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-lg p-3 rounded-lg ${
                      msg.sender === '사용자'
                        ? 'bg-blue-500 text-white'
                        : msg.type === 'error'
                        ? 'bg-red-100 text-red-800'
                        : msg.type === 'result'
                        ? 'bg-green-100 text-green-800 font-mono text-sm'
                        : 'bg-white border'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">{msg.sender} · {msg.time}</div>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`${selectedAgent.name}에게 명령 입력...`}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '실행 중...' : '전송'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            왼쪽에서 에이전트를 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}

export default Agents
