import React, { useState } from 'react'

function CommandPanel({ selectedAgent, onCommand }) {
  const [command, setCommand] = useState('')

  const quickCommands = [
    { label: '시장 분석', cmd: 'analyze', icon: '📊' },
    { label: '즉시 매매', cmd: 'trade', icon: '💰' },
    { label: '포지션 확인', cmd: 'positions', icon: '📋' },
    { label: '일지 작성', cmd: 'journal', icon: '📝' },
    { label: '일시 중지', cmd: 'pause', icon: '⏸️' },
    { label: '재시작', cmd: 'restart', icon: '▶️' }
  ]

  const handleCommand = (cmd) => {
    onCommand(cmd, selectedAgent?.name || '시스템')
    setCommand('')
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <span>🎮</span>
        명령 패널
        {selectedAgent && (
          <span className="text-sm text-gray-400">- {selectedAgent.name}</span>
        )}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {quickCommands.map((item) => (
          <button
            key={item.cmd}
            onClick={() => handleCommand(item.cmd)}
            className="p-3 bg-bg-tertiary hover:bg-accent-blue/20 border border-border hover:border-accent-blue rounded-lg transition text-left"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-sm">{item.label}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="직접 명령 입력..."
          className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:border-accent-blue outline-none"
          onKeyPress={(e) => e.key === 'Enter' && handleCommand(command)}
        />
        <button
          onClick={() => handleCommand(command)}
          className="px-4 py-2 bg-accent-blue rounded-lg hover:bg-blue-600 transition"
        >
          실행
        </button>
      </div>
    </div>
  )
}

export default CommandPanel
