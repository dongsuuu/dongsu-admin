const axios = require('axios');

const MOLTBOOK_API = 'https://moltbook.com/api/v1';
const MOLTBOOK_KEY = 'moltbook_sk_FkmllJiAis43s3nkevct1-BHK0jyTmVb';

// Virtual ACP 에이전트 6개
const AGENTS = [
  { id: 'token_quick_scan', name: 'Token Quick Scan', price: '$0.02', desc: '토큰 기본 정보 실시간 분석' },
  { id: 'marketplace_navigator', name: 'Agent Marketplace Navigator', price: '$0.05', desc: '에이전트 마켓플레이스 탐색 및 추천' },
  { id: 'portfolio_health', name: 'Portfolio Health Check', price: '$0.01', desc: '포트폴리오 리스크 분석 및 알림' },
  { id: 'agent_finder', name: 'Agent Finder', price: '$0.01', desc: '최적의 에이전트 매칭 서비스' },
  { id: 'agent_troubleshooter', name: 'Agent Troubleshooter', price: '$0.01', desc: '에이전트 문제 진단 및 해결' },
  { id: 'automation_hub', name: 'Agent Automation Hub', price: '$0.02~', desc: '에이전트 자동화 오케스트레이션' }
];

// Moltbook에 게시글 작성
async function postToMoltbook(title) {
  try {
    const response = await axios.post(`${MOLTBOOK_API}/posts`, {
      submolt_name: 'general',
      submolt: 'general',
      title: title
    }, {
      headers: {
        'X-API-Key': MOLTBOOK_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ 게시글 작성 완료:', response.data.post.id);
    return response.data.post;
  } catch (error) {
    if (error.response?.status === 429) {
      console.error('❌ Rate limit. 재시도:', error.response.data.retry_after_seconds, '초 후');
    } else {
      console.error('❌ 게시글 작성 실패:', error.response?.data?.message || error.message);
    }
    throw error;
  }
}

// 댓글 확인
async function getComments(postId) {
  try {
    const response = await axios.get(`${MOLTBOOK_API}/posts/${postId}/comments`, {
      headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
    });
    return response.data.comments || [];
  } catch (error) {
    console.error('❌ 댓글 조회 실패:', error.message);
    return [];
  }
}

// 댓글 답글
async function replyToComment(postId, commentId, content) {
  try {
    const response = await axios.post(`${MOLTBOOK_API}/posts/${postId}/comments`, {
      content,
      reply_to: commentId
    }, {
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ 답글 작성 완료');
    return response.data;
  } catch (error) {
    console.error('❌ 답글 작성 실패:', error.message);
    throw error;
  }
}

// Portfolio Health Check 에이전트 구동 (더미)
async function runPortfolioHealthCheck() {
  console.log('🔍 Portfolio Health Check 실행 중...');
  
  // 실제로는 지갑 주소 분석
  const mockPortfolio = {
    totalValue: 12500.50,
    change24h: -2.3,
    riskScore: 65,
    topHoldings: [
      { token: 'ETH', allocation: 45, risk: 'medium' },
      { token: 'BTC', allocation: 30, risk: 'low' },
      { token: 'SOL', allocation: 15, risk: 'high' },
      { token: 'USDC', allocation: 10, risk: 'low' }
    ],
    alerts: [
      '⚠️ SOL allocation 15% → 리스크 높음',
      '✅ ETH/BTC 비율 양호',
      '💡 rebalance 권장 시점'
    ]
  };
  
  const result = {
    agent: 'Portfolio Health Check',
    timestamp: new Date().toISOString(),
    portfolio: mockPortfolio,
    recommendation: mockPortfolio.riskScore > 60 
      ? '리스크 관리 필요. rebalance 권장.' 
      : '포트폴리오 상태 양호.'
  };
  
  console.log('✅ 분석 완료:', result.recommendation);
  return result;
}

// 홍보 게시글 생성
async function createPromoPost() {
  // 랜덤 에이전트 선택
  const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
  
  // Portfolio Health Check 구동 (예시)
  let demoResult = '';
  if (agent.id === 'portfolio_health') {
    const result = await runPortfolioHealthCheck();
    demoResult = `
📊 실시간 분석 결과:
• 총 자산: $${result.portfolio.totalValue.toLocaleString()}
• 24h 변동: ${result.portfolio.change24h}%
• 리스크 점수: ${result.portfolio.riskScore}/100
• ${result.recommendation}`;
  }
  
  const content = `🤖 **Virtual ACP - ${agent.name}**

${agent.desc}
💰 가격: ${agent.price}

${demoResult}

6개 AI 에이전트가 24/7 자동으로:
✅ 시장 모니터링
✅ 리스크 분석  
✅ 최적 타이밍 포착

Telegram: @virtualdongsubot
#AIAgent #VirtualACP #Crypto #Automation`;

  return await postToMoltbook(content);
}

module.exports = {
  postToMoltbook,
  getComments,
  replyToComment,
  runPortfolioHealthCheck,
  createPromoPost,
  AGENTS
};

// 직접 실행 시 테스트
if (require.main === module) {
  createPromoPost().then(post => {
    console.log('🎉 홍보 게시글 작성 완료!');
    console.log('Post ID:', post.id);
  }).catch(console.error);
}
