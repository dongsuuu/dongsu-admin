import React from 'react';

function ChatBubble({ event }) {
  const isHuman = event.actor === 'human';
  const isSystem = event.actor === 'system';
  
  const getBubbleStyle = () => {
    if (isHuman) {
      return 'bg-blue-500 text-white ml-auto';
    } else if (isSystem) {
      return 'bg-gray-200 text-gray-700 mx-auto text-center text-sm';
    } else {
      // Agent
      const agentColors = {
        'trading': 'bg-green-100 text-green-800 border-green-300',
        'research': 'bg-purple-100 text-purple-800 border-purple-300',
        'onchain': 'bg-orange-100 text-orange-800 border-orange-300'
      };
      return agentColors[event.actor_id] || 'bg-white text-gray-800 border';
    }
  };

  const getAvatar = () => {
    if (isHuman) return '👤';
    if (isSystem) return '⚙️';
    const avatars = {
      'trading': '📈',
      'research': '🔍',
      'onchain': '⛓️'
    };
    return avatars[event.actor_id] || '🤖';
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContent = () => {
    if (event.payload?.text) {
      return event.payload.text;
    }
    if (event.type === 'human.command') {
      return event.payload?.text || '명령';
    }
    return JSON.stringify(event.payload);
  };

  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isHuman && !isSystem && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
            {getAvatar()}
          </div>
          <div className="text-xs text-center text-gray-500 mt-1">
            {event.actor_id}
          </div>
        </div>
      )}
      
      <div className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${getBubbleStyle()}`}>
        <div className="text-xs opacity-75 mb-1">
          {formatTime(event.ts)}
        </div>
        <div className="whitespace-pre-wrap">{getContent()}</div>
      </div>
      
      {isHuman && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl">
            👤
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBubble;
