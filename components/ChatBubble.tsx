import React from 'react';
import { Message } from '../types';
import { Bot, User, Cpu } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full flex items-center gap-2">
          <Cpu className="w-3 h-3" />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Images */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {message.images.map((img, idx) => (
                <img 
                  key={idx}
                  src={`data:image/jpeg;base64,${img}`} 
                  alt="User upload" 
                  className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-200 shadow-sm object-cover"
                />
              ))}
            </div>
          )}

          {/* Text Bubble */}
          <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
            isUser 
              ? 'bg-primary text-white rounded-tr-none' 
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
          }`}>
            {message.content}
          </div>
          
          {/* Timestamp or Info */}
          <div className="text-[10px] text-slate-400 px-1 opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;