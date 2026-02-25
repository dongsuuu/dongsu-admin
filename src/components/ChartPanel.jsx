import React from 'react'

function ChartPanel() {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 h-96">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <span>📈</span>
          실시간 차트
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm bg-accent-blue/20 text-accent-blue rounded">BTC</button>
          <button className="px-3 py-1 text-sm bg-bg-tertiary text-gray-400 rounded">ETH</button>
          <button className="px-3 py-1 text-sm bg-bg-tertiary text-gray-400 rounded">SOL</button>
        </div>
      </div>

      <div className="h-64 bg-bg-tertiary rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div>차트 연동 준비 중</div>
          <div className="text-sm mt-2">API 서버 배포 후 실시간 데이터 표시</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-gray-400 text-xs">현재가</div>
          <div className="font-mono">$67,843</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">24h 변화</div>
          <div className="font-mono text-accent-green">+1.23%</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">거래량</div>
          <div className="font-mono">$28.5B</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">신호</div>
          <div className="font-mono text-accent-blue">관망</div>
        </div>
      </div>
    </div>
  )
}

export default ChartPanel
