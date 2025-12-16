import React, { useState, useEffect, useRef } from 'react';
import { Message, AppSettings } from './types';
import { streamChat } from './services/ollamaService';
import SettingsDialog from './components/SettingsDialog';
import ChatBubble from './components/ChatBubble';
import InputArea from './components/InputArea';
import { Settings, MessageSquarePlus, Trash2, Bot } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  host: 'http://127.0.0.1:11434',
  selectedModel: '',
  systemPrompt: 'You are a helpful AI assistant.',
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ollama_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('ollama_settings', JSON.stringify(settings));
  }, [settings]);

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (text: string, images: string[]) => {
    // 1. Add User Message
    const userMsg: Message = {
      role: 'user',
      content: text,
      images: images,
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    // 2. Add placeholder Assistant Message
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      role: 'assistant',
      content: '', // Empty initially
      timestamp: Date.now(),
      id: assistantId
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Prepare context for API
    // We filter out any empty assistant messages or transient states if needed, 
    // but here we just pass the history + current user message.
    // NOTE: We don't send the empty assistant message we just added to the UI yet.
    const apiMessages = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
      images: m.images
    }));

    // Inject System Prompt if exists
    if (settings.systemPrompt) {
      apiMessages.unshift({
        role: 'system',
        content: settings.systemPrompt,
        images: undefined
      });
    }

    // 3. Stream Response
    await streamChat(
      settings,
      apiMessages,
      (chunk) => {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id === assistantId) {
              return { ...msg, content: msg.content + chunk };
            }
            return msg;
          });
        });
      },
      () => {
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id === assistantId) {
              return { ...msg, content: msg.content + `\n\n*[Error: ${error.message}]*` };
            }
            return msg;
          });
        });
        // If it's a connection error, maybe open settings
        if (error.message.includes('Failed to fetch') || error.message.includes('Ollama Error')) {
            // Optional: Auto-open settings or show toast
        }
      }
    );
  };

  const isConfigured = settings.host && settings.selectedModel;

  return (
    <div className="flex flex-col h-screen bg-white md:bg-slate-50">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-primary to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Ollama Chat</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-amber-400'}`}></span>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {isConfigured ? settings.selectedModel : 'Not Connected'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={handleClearChat}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear History"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-lg transition-all ${
              !isConfigured ? 'bg-primary text-white animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 md:px-0">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
                <MessageSquarePlus className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Ollama Chat</h2>
              <p className="text-slate-500 max-w-md mb-8">
                Connect to your local LLM to start chatting. You can upload images for multimodal models like LLaVA.
              </p>
              {!isConfigured && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-primary/30 hover:bg-blue-600 transition-transform active:scale-95"
                >
                  Connect to Ollama
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 py-6 flex flex-col justify-end min-h-0">
               {/* Spacer to push content down if few messages */}
               <div className="flex-1"></div>
               {messages.map((msg) => (
                 <ChatBubble key={msg.id} message={msg} />
               ))}
               {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm ml-4 mb-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                    </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="bg-white md:bg-slate-50">
        <InputArea 
          onSend={handleSendMessage} 
          isLoading={isLoading} 
          disabled={!isConfigured} 
        />
      </div>

      <SettingsDialog 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
      />

    </div>
  );
}