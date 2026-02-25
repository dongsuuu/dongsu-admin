import React from 'react'

function AgentCard({ agent, selected, onClick }) {
  const statusColors = {
    running: 'bg-accent-green',
    idle: 'bg-gray-500',
    error: 'bg-accent-red',
    setting: 'bg-gray-600'
  }

  const borderColors = {
    blue: 'border-accent-blue',
    purple: 'border-accent-purple',
    orange: 'border-accent-orange',
    gray: 'border-gray-600'
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-lg border-l-4 cursor-pointer transition
        ${selected ? 'bg-bg-tertiary ' + borderColors[agent.color] : 'border-transparent hover:bg-bg-tertiary'}
      `}
      style={{ borderLeftColor: selected ? undefined : 'transparent' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{agent.icon}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{agent.name}</div>
          <div className="text-xs text-gray-400">{agent.description}</div>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]} animate-pulse`}></div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {agent.statusText} · {agent.lastActivity}
      </div>
    </div>
  )
}

export default AgentCard
