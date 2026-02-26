// API 설정
const API_BASE_URL = 'https://dongsu-api.onrender.com'

// API 호출 함수
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    if (!response.ok) throw new Error('API 오류')
    return await response.json()
  } catch (error) {
    console.error('API 호출 실패:', error)
    throw error
  }
}

// 상태 조회
export async function getStatus() {
  return await fetchAPI('/api/status')
}

// 에이전트 목록
export async function getAgents() {
  return await fetchAPI('/api/agents')
}

// 에이전트 생성
export async function createAgent(name, type) {
  return await fetchAPI('/api/agents/create', {
    method: 'POST',
    body: JSON.stringify({ name, type })
  })
}

// 명령 실행
export async function executeCommand(command, agentId = null, params = {}) {
  return await fetchAPI('/api/command', {
    method: 'POST',
    body: JSON.stringify({ command, agent_id: agentId, params })
  })
}

// 분석 조회
export async function analyzeSymbol(symbol) {
  return await fetchAPI(`/api/analyze/${symbol}`)
}

// 포지션 조회
export async function getPositions() {
  return await fetchAPI('/api/positions')
}

// 거래 내역 조회
export async function getTrades() {
  return await fetchAPI('/api/trades')
}

// 명령 큐 조회
export async function getCommands() {
  return await fetchAPI('/api/commands')
}
