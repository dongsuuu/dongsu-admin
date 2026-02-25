import React, { useState, useEffect } from 'react'
import './index.css'
import AgentCard from './components/AgentCard'
import CommandPanel from './components/CommandPanel'
import ActivityLog from './components/ActivityLog'
import ChartPanel from './components/ChartPanel'

function App() {
  const [agents, setAgents] = useState([
    {
      id: 'trading',
      name: '트레이딩 에이전트',
      icon: '📈',
      status: 'running',
      statusText: '실행 중',
      description: 'BTC/ETH 레버리지 트레이딩',
      stats: {
        trades: 1,
        winRate: '100%',
        profit: '+$42',
        leverage: '1-10x'
      },
      lastActivity: '10분 전',
      color: 'blue'
    },
    {
      id: 'research',
      name: '리서치 에이전트',
      icon: '🔍',
      status: 'idle',
      statusText: '대기 중',
      description: '프로젝트/에어드랍 조사',
      stats: {
        projects: 0,
        reports: 0,
        sources: 3,
        lastScan: '-'
      },
      lastActivity: '1시간 전',
      color: 'purple'
    },
    {
      id: 'onchain',
      name: '온체인 에이전트',
      icon: '⛓️',
      status: 'running',
      statusText: '실행 중',
      description: 'Dune/Etherscan 분석',
      stats: {
        gasPrice: '25 Gwei',
        whaleAlerts: 2,
        chain: 'Base',
        monitoring: 'ETH'
      },
      lastActivity: '5분 전',
      color: 'orange'
    }
  ])

  const [selectedAgent, setSelectedAgent] = useState(null)
  const [logs, setLogs] = useState([
    { time: '10:15', agent: '트레이딩', action: 'ETH 분석 완료 - LONG 신호', type: 'success' },
    { time: '10:10', agent: '트레이딩', action: 'BTC 분석 - 관망', type: 'info' },
    { time: '10:05', agent: '온체인', action: '가스 가격 업데이트 - 25 Gwei', type: 'info' },
    { time: '10:00', agent: '시스템', action: '모든 에이전트 활성화', type: 'success' }
  ])

  const executeCommand = (command, agentId) => {
    const newLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      agent: agentId || '사용자',
      action: command,
      type: 'info'
    }
    setLogs(prev => [newLog, ...prev])
  }

  const addAgent = () => {
    const newAgent = {
      id: `agent-${Date.now()}`,
      name: '새 에이전트',
      icon: '🤖',
      status: 'idle',
      statusText: '설정 중',
      description: '새로운 에이전트',
      stats: {},
      lastActivity: '방금',
      color: 'gray'
    }
    setAgents(prev => [...prev, newAgent])
    executeCommand('새 에이전트 추가됨', '시스템')
  }

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      {/* 헤더 */}
      <header className="bg-bg-secondary border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-blue to-purple-500 bg-clip-text text-transparent">
              dongsu 관리 센터
            </h1>
            <span className="px-2 py-1 bg-accent-green/20 text-accent-green text-xs rounded-full">
              ● 시스템 정상
            </span>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg hover:border-accent-blue transition">
              설정
            </button>
            <button className="px-4 py-2 bg-accent-blue rounded-lg hover:bg-blue-600 transition">
              + 새 명령
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 사이드바 */}
        <aside className="w-64 bg-bg-secondary border-r border-border min-h-screen p-4">
          <div className="mb-6">
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">에이전트</h2>
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
                onClick={addAgent}
                className="w-full p-3 border border-dashed border-border rounded-lg hover:border-accent-blue hover:bg-accent-blue/10 transition flex items-center justify-center gap-2 text-gray-400 hover:text-white"
              >
                <span>+</span>
                <span>에이전트 추가</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">메뉴</h2>
            <nav className="space-y-1">
              <a href="#" className="block px-3 py-2 rounded-lg bg-accent-blue/20 text-accent-blue">
                📊 대시보드
              </a>
              <a href="#" className="block px-3 py-2 rounded-lg hover:bg-bg-tertiary text-gray-300">
                📈 성과 분석
              </a>
              <a href="#" className="block px-3 py-2 rounded-lg hover:bg-bg-tertiary text-gray-300">
                📖 매매일지
              </a>
              <a href="#" className="block px-3 py-2 rounded-lg hover:bg-bg-tertiary text-gray-300">
                ⚙️ 시스템 설정
              </a>
            </nav>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6">
          {/* 상단 요약 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">현재 자본</div>
              <div className="text-2xl font-bold font-mono">$10,042</div>
              <div className="text-accent-green text-sm">+$42 (+0.42%)</div>
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">승률</div>
              <div className="text-2xl font-bold font-mono">100%</div>
              <div className="text-gray-400 text-sm">1승 0패</div>
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">총 거래</div>
              <div className="text-2xl font-bold font-mono">1</div>
              <div className="text-gray-400 text-sm">Paper Trading</div>
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">활성 에이전트</div>
              <div className="text-2xl font-bold font-mono">3/3</div>
              <div className="text-accent-green text-sm">모두 활성</div>
            </div>
          </div>

          {/* 메인 패널 */}
          <div className="grid grid-cols-3 gap-6">
            {/* 차트 패널 */}
            <div className="col-span-2">
              <ChartPanel />
            </div>

            {/* 우측 패널 */}
            <div className="space-y-6">
              <CommandPanel 
                selectedAgent={selectedAgent}
                onCommand={executeCommand}
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
