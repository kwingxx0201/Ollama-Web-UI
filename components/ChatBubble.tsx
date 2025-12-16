import React, { useMemo } from 'react';
import { Message } from '../types';
import { Bot, User, Cpu, BrainCircuit } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Memoize the parsing to avoid re-running on every render if content hasn't changed
  const { displayHtml, thinkHtml } = useMemo(() => {
    if (isSystem) return { displayHtml: message.content, thinkHtml: null };

    // 1. Separate <think> blocks
    let thinkContent = '';
    let mainContent = message.content;

    // Regex to capture content inside <think> tags. 
    // Uses non-greedy match for content.
    const thinkMatch = mainContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
    
    if (thinkMatch) {
      thinkContent = thinkMatch[1];
      // Remove the full <think>...</think> block from display
      mainContent = mainContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '');
    }

    // 2. Parse Markdown
    // We treat empty content as just empty string
    const rawHtml = mainContent ? marked.parse(mainContent) : '';
    const cleanDisplayHtml = DOMPurify.sanitize(rawHtml as string);

    // 3. Parse Think block markdown if exists
    const rawThinkHtml = thinkContent ? marked.parse(thinkContent) : '';
    const cleanThinkHtml = thinkContent ? DOMPurify.sanitize(rawThinkHtml as string) : null;

    return { displayHtml: cleanDisplayHtml, thinkHtml: cleanThinkHtml };
  }, [message.content, isSystem]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-slate-200 shadow-sm">
          <Cpu className="w-3 h-3" />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? 'bg-primary text-white' : 'bg-white text-emerald-600 border border-slate-200'
        }`}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Content Container */}
        <div className={`flex flex-col gap-2 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Images Uploaded by User */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {message.images.map((img, idx) => (
                <img 
                  key={idx}
                  src={`data:image/jpeg;base64,${img}`} 
                  alt="User upload" 
                  className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-200 shadow-sm object-cover hover:scale-[1.02] transition-transform cursor-pointer"
                  onClick={() => window.open(`data:image/jpeg;base64,${img}`, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Assistant Reasoning Block (DeepSeek etc) */}
          {!isUser && thinkHtml && (
            <div className="max-w-full">
              <details className="group">
                <summary className="list-none cursor-pointer text-xs font-medium text-slate-500 hover:text-primary flex items-center gap-1.5 select-none mb-1 transition-colors">
                   <BrainCircuit className="w-3 h-3" />
                   <span>Reasoning Process</span>
                   <span className="opacity-0 group-hover:opacity-100 text-[10px] transition-opacity">(Click to expand)</span>
                </summary>
                <div 
                  className="think-block prose prose-sm max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{ __html: thinkHtml }}
                />
              </details>
            </div>
          )}

          {/* Main Message Bubble */}
          <div className={`px-4 py-3 rounded-2xl shadow-sm overflow-hidden ${
            isUser 
              ? 'bg-primary text-white rounded-tr-none user-bubble' 
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
          }`}>
             <div 
               className="prose" 
               dangerouslySetInnerHTML={{ __html: displayHtml }} 
             />
             {/* Fallback for empty content (e.g. just started thinking) */}
             {!displayHtml && !thinkHtml && (
               <span className="opacity-50 italic">...</span>
             )}
          </div>
          
          {/* Timestamp */}
          <div className="text-[10px] text-slate-400 px-1 opacity-70 flex gap-2">
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;