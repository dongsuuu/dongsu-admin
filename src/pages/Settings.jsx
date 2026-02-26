import React from 'react'

function Settings() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">⚙️ 설정</h2>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-4">API 연결</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">API 서버</div>
                <div className="text-sm text-gray-600">https://dongsu-api.onrender.com</div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">연결됨</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">트레이딩 설정</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">기본 레버리지</label>
              <select className="w-full px-4 py-2 border rounded-lg">
                <option>3x</option>
                <option selected>5x</option>
                <option>10x</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">리스크 비율 (%)</label>
              <input 
                type="number" 
                defaultValue={10}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">알림 설정</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span>매매 신호 알림</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked />
              <span>에이전트 상태 변경 알림</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>이메일 알림</span>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            설정 저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
