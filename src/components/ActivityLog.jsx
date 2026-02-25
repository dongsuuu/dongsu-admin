import React from 'react'

function ActivityLog({ logs }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <span>📜</span>
        활동 로그
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`
              p-3 rounded-lg text-sm
              ${log.type === 'success' ? 'bg-accent-green/10 border border-accent-green/30' : 'bg-bg-tertiary'}
            `}
          >
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <span>{log.time}</span>
              <span className="text-accent-blue">[{log.agent}]</span>
            </div>
            <div className={log.type === 'success' ? 'text-accent-green' : ''}>
              {log.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActivityLog
