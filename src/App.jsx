import React, { useState, useEffect } from 'react'
import './index.css'
import AgentCard from './components/AgentCard'
import CommandPanel from './components/CommandPanel'
import ActivityLog from './components/ActivityLog'
import ChartPanel from './components/ChartPanel'
import { getStatus, getAgents, createAgent, executeCommand, analyzeSymbol } from './api/client'

function App() {
  const [apiStatus, setApiStatus] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [logs, setLogs] = useState([])

  // 초기 데이터 로드
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // 10초마다 갱신
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [status, agentsData] = await Promise.all([
        getStatus(),
        getAgents()
      ])
      
      if (status) setApiStatus(status)
      if (agentsData) setAgents(agentsData.agents || [])
      setLoading(false)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      addLog('시스템', '데이터 로드 실패', 'error')
    }
  }

  function addLog(agent, action, type = 'info') {
    const newLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      agent,
      action,
      type
    }
    setLogs(prev => [newLog, ...prev].slice(0, 50)) // 최근 50개만
  }

  // 명령 실행
  async function handleCommand(command, agentId) {
    addLog(agentId || '사용자', `명령 실행: ${command}`, 'info')
    
    try {
      let result
      
      switch(command) {
        case 'analyze':
          result = await analyzeSymbol('ETH')
          addLog('API', `${result.symbol} 분석 - 가격: $${result.price}, 신호: ${result.recommendation}`, 'success')
          break
          
        case 'trade':
          result = await executeCommand('trade', agentId, { symbol: 'ETH' })
          addLog('API', `매매 시뮬레이션 실행 - ${result.result?.direction || 'long'} ${result.result?.leverage || 5}x`, 'success')
          break
          
        case 'positions':
          result = await executeCommand('positions', agentId)
          addLog('API', `포지션 확인 - ${result.result?.count || 0}개`, 'success')
          break
          
        case 'status':
          result = await executeCommand('status', agentId)
          addLog('API', `상태 확인 - 자본: $${result.result?.capital?.current}`, 'success')
          break
          
        case 'pause':
          result = await executeCommand('pause', agentId)
          addLog('API', `${agentId} 일시 중지`, 'success')
          await loadData() // 에이전트 상태 갱신
          break
          
        case 'restart':
          result = await executeCommand('restart', agentId)
          addLog('API', `${agentId} 재시작`, 'success')
          await loadData() // 에이전트 상태 갱신
          break
          
        default:
          result = await executeCommand(command, agentId)
          addLog('API', `명령 완료: ${command}`, 'success')
      }
      
      // 데이터 갱신
      await loadData()
      
    } catch (error) {
      addLog('오류', `명령 실패: ${error.message}`, 'error')
    }
  }

  // 에이전트 추가
  async function handleAddAgent() {
    const name = prompt('에이전트 이름을 입력하세요:')
    if (!name) return
    
    const type = prompt('에이전트 타입을 입력하세요 (trading/research/onchain):') || 'custom'
    
    try {
      addLog('사용자', `에이전트 생성 중: ${name}`, 'info')
      const result = await createAgent(name, type)
      
      if (result.success) {
        addLog('API', `에이전트 생성 완료: ${result.agent.name}`, 'success')
        await loadData() // 에이전트 목록 갱신
      }
    } catch (error) {
      addLog('오류', `에이전트 생성 실패: ${error.message}`, 'error')
    }
  }

  // 요약 데이터
  const summaryData = apiStatus || {
    capital: { current: 10000, change: 0, change_percent: 0 },
    trades: { total: 0, win_rate: 0, winning: 0, losing: 0 }
  }

  return (
    <div className="min-h-screen bg-bg-primary" style={{ color: '#000000' }}>
      {/* 헤더 */}
      <header className="bg-bg-secondary border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <h1 className="text-xl font-bold" style={{ color: '#000000' }}>
              dongsu 관리 센터
            </h1>
            <span className={`px-2 py-1 text-xs rounded-full ${loading ? 'bg-yellow-500/20' : 'bg-accent-green/20'}`}
                  style={{ color: loading ? '#d29922' : '#3fb950' }}>
              {loading ? '● 로딩 중...' : '● 연결됨'}
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg hover:border-accent-blue transition"
              style={{ color: '#000000' }}>
              새로고침
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 */}
        <aside className="w-64 bg-bg-secondary border-r border-border min-h-screen p-4">
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: '#666666' }}>에이전트</h2>
            <div className="space-y-2">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgent?.id === agent.id}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
              <button
                onClick={handleAddAgent}
                className="w-full p-3 border border-dashed border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue/10 transition flex items-center justify-center gap-2"
                style={{ color: '#666666' }}>
                <span>+</span>
                <span>에이전트 추가</span>
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6">
          {/* 상단 요약 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-sm mb-1" style={{ color: '#666666' }}>현재 자본</div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#000000' }}>
                ${summaryData.capital?.current?.toLocaleString() || '10,000'}
              </div>
              <div style={{ color: summaryData.capital?.change >= 0 ? '#238636' : '#da3633' }}>
                {summaryData.capital?.change >= 0 ? '+' : ''}{summaryData.capital?.change || 0} 
                ({summaryData.capital?.change_percent >= 0 ? '+' : ''}{summaryData.capital?.change_percent || 0}%)
              </div>
            </div>
            
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-sm mb-1" style={{ color: '#666666' }}>승률</div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#000000' }}>
                {summaryData.trades?.win_rate || 0}%
              </div>
              <div style={{ color: '#666666' }}>
                {summaryData.trades?.winning || 0}승 {summaryData.trades?.losing || 0}패
              </div>
            </div>
            
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-sm mb-1" style={{ color: '#666666' }}>총 거래</div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#000000' }}>
                {summaryData.trades?.total || 0}
              </div>
              <div style={{ color: '#666666' }}>거래 수</div>
            </div>
            
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-sm mb-1" style={{ color: '#666666' }}>활성 에이전트</div>
              <div className="text-2xl font-bold font-mono" style={{ color: '#000000' }}>
                {agents.length}
              </div>
              <div style={{ color: '#238636' }}>활성</div>
            </div>
          </div>

          {/* 메인 패널 */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <ChartPanel apiStatus={apiStatus} />
            </div>
            <div className="space-y-6">
              <CommandPanel 
                selectedAgent={selectedAgent}
                onCommand={handleCommand}
              />
              <ActivityLog logs={logs} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
