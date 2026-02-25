// API 설정
const API_BASE_URL = 'https://dongsu-api.onrender.com'

// API 호출 함수
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) throw new Error('API 오류')
    return await response.json()
  } catch (error) {
    console.error('API 호출 실패:', error)
    return null
  }
}

// 상태 조회
export async function getStatus() {
  return await fetchAPI('/api/status')
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
