import React, { useState, useEffect } from 'react'
import { getStatus, getAgents } from '../api/client'

function Dashboard() {
  const [status, setStatus] = useState(null)
  const [agents, setAgents] = useState([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const [statusData, agentsData] = await Promise.all([
      getStatus(),
      getAgents()
    ])
    if (statusData) setStatus(statusData)
    if (agentsData) setAgents(agentsData.agents || [])
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📊 전체 현황</h2>
      
      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600">현재 자본</div>
          <div className="text-3xl font-bold">${status?.capital?.current?.toLocaleString() || '10,000'}</div>
          <div className={`${status?.capital?.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {status?.capital?.change >= 0 ? '+' : ''}{status?.capital?.change || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600">승률</div>
          <div className="text-3xl font-bold">{status?.trades?.win_rate || 0}%</div>
          <div className="text-gray-500">{status?.trades?.winning || 0}승 {status?.trades?.losing || 0}패</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600">활성 에이전트</div>
          <div className="text-3xl font-bold">{agents.length}</div>
          <div className="text-green-600">실행 중</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600">총 거래</div>
          <div className="text-3xl font-bold">{status?.trades?.total || 0}</div>
          <div className="text-gray-500">누적</div>
        </div>
      </div>

      {/* 에이전트 상태 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">에이전트 상태</h3>
        <div className="grid grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="p-4 border rounded-lg">
              <div className="font-bold">{agent.name}</div>
              <div className={`text-sm ${agent.status === 'running' ? 'text-green-600' : 'text-gray-500'}`}>
                {agent.status === 'running' ? '● 실행 중' : '○ 대기 중'}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                마지막 활동: {new Date(agent.last_activity).toLocaleTimeString('ko-KR')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 빠른 링크 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">빠른 이동</h3>
        <div className="flex gap-4">
          <a href="/agents" className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            🤖 에이전트 관리
          </a>
          <a href="/trading" className="px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
            📈 트레이딩
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
