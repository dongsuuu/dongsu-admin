import React, { useState, useEffect } from 'react'
import { getStatus, analyzeSymbol, executeCommand } from '../api/client'

function Trading() {
  const [symbol, setSymbol] = useState('ETH')
  const [analysis, setAnalysis] = useState(null)
  const [simulation, setSimulation] = useState({
    capital: 10000,
    position: null,
    trades: []
  })
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    setLoading(true)
    const result = await analyzeSymbol(symbol)
    if (result) setAnalysis(result)
    setLoading(false)
  }

  async function handleSimulateTrade(direction) {
    if (!analysis) {
      alert('먼저 분석을 실행하세요!')
      return
    }

    const leverage = 5
    const entryPrice = analysis.price
    const margin = simulation.capital * 0.1
    const positionSize = (margin * leverage) / entryPrice

    const newTrade = {
      id: Date.now(),
      symbol,
      direction,
      entryPrice,
      leverage,
      margin,
      positionSize,
      timestamp: new Date().toLocaleString('ko-KR')
    }

    setSimulation(prev => ({
      ...prev,
      position: newTrade,
      trades: [...prev.trades, newTrade]
    }))

    // API 호출
    await executeCommand('trade', null, { symbol, direction, leverage })
  }

  async function handleClosePosition() {
    if (!simulation.position) return

    const exitPrice = analysis?.price || simulation.position.entryPrice
    const pnl = simulation.position.direction === 'long'
      ? (exitPrice - simulation.position.entryPrice) / simulation.position.entryPrice * simulation.position.margin * simulation.position.leverage
      : (simulation.position.entryPrice - exitPrice) / simulation.position.entryPrice * simulation.position.margin * simulation.position.leverage

    setSimulation(prev => ({
      ...prev,
      capital: prev.capital + pnl,
      position: null
    }))

    alert(`포지션 청산! PnL: $${pnl.toFixed(2)}`)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">📈 트레이딩 시뮬레이션</h2>
        <div className="flex gap-4 items-center">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
          
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '분석 중...' : '분석 실행'}
          </button>
          
          <div className="ml-auto text-right">
            <div className="text-gray-600">시뮬레이션 자본</div>
            <div className="text-2xl font-bold">${simulation.capital.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 차트 영역 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">차트</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            {analysis ? (
              <div className="text-center">
                <div className="text-3xl font-bold">${analysis.price?.toLocaleString()}</div>
                <div className={`text-lg ${analysis.signal === 'buy' ? 'text-green-600' : analysis.signal === 'sell' ? 'text-red-600' : 'text-gray-600'}`}>
                  신호: {analysis.signal?.toUpperCase()}
                </div>
                <div className="text-gray-600">신뢰도: {(analysis.confidence * 100)?.toFixed(0)}%</div>
              </div>
            ) : (
              <div className="text-gray-400">분석을 실행하세요</div>
            )}
          </div>
        </div>

        {/* 시뮬레이션 영역 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">매매 시뮬레이션</h3>
          
          {simulation.position ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-bold">현재 포지션</div>
                <div>{simulation.position.symbol} {simulation.position.direction.toUpperCase()}</div>
                <div>진입가: ${simulation.position.entryPrice?.toLocaleString()}</div>
                <div>레버리지: {simulation.position.leverage}x</div>
                <div>증거금: ${simulation.position.margin?.toLocaleString()}</div>
              </div>
              
              <button
                onClick={handleClosePosition}
                className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                포지션 청산
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSimulateTrade('long')}
                disabled={!analysis}
                className="py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                🟢 LONG 5x
              </button>
              
              <button
                onClick={() => handleSimulateTrade('short')}
                disabled={!analysis}
                className="py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                🔴 SHORT 5x
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 거래 내역 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">거래 내역 ({simulation.trades.length}건)</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {simulation.trades.map(trade => (
            <div key={trade.id} className="p-3 bg-gray-50 rounded-lg flex justify-between">
              <div>
                <span className="font-bold">{trade.symbol}</span>{' '}
                <span className={trade.direction === 'long' ? 'text-green-600' : 'text-red-600'}>
                  {trade.direction.toUpperCase()} {trade.leverage}x
                </span>
              </div>
              <div className="text-gray-600 text-sm">{trade.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Trading
