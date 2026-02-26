import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Trading from './pages/Trading'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* 네비게이션 */}
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold">🤖 dongsu 관리 센터</Link>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-blue-200">대시보드</Link>
              <Link to="/agents" className="hover:text-blue-200">에이전트</Link>
              <Link to="/trading" className="hover:text-blue-200">트레이딩</Link>
              <Link to="/settings" className="hover:text-blue-200">설정</Link>
            </div>
          </div>
        </nav>

        {/* 페이지 라우팅 */}
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
