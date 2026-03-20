import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// --- Styles (Tailwind via CDN is assumed to be available or added in index.html) ---

// --- Icons (Simple SVG versions) ---
const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a7 7 0 0 1-7 7c-1.15 0-2.21-.3-3.13-.82Z"/><path d="M11 20c0-3.33-1.67-6.67-5-10"/><path d="M11 20H2"/></svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface NutriBotProps {
  apiKey?: string;
}

const NutritionistChat: React.FC<NutriBotProps> = ({ apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Hello! I am NutriBot, your personal AI nutritionist. How can I help you achieve your health goals today? Whether it is meal planning, understanding macros, or healthy swaps, I am here for you!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<Chat | null>(null);

  useEffect(() => {
    // Initialize Gemini Chat
    const key = apiKey || (import.meta as any).env.VITE_API_KEY;
    if (!key) {
      setMessages(prev => [...prev, { role: 'bot', content: '⚠️ System Error: API Key is missing. Please check your configuration.' }]);
      return;
    }

    const ai = new GoogleGenAI({ apiKey: key });
    chatInstance.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are NutriBot, an expert nutritionist and wellness coach. 
        Your goal is to provide accurate, evidence-based dietary advice. 
        Be encouraging, professional, and clear. 
        Focus on whole foods, balanced nutrition, and sustainable habits. 
        If a user asks for medical advice beyond general nutrition, suggest they consult a doctor.
        Use markdown for lists and bolding to make information readable.`,
      },
    });
  }, [apiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !chatInstance.current) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const responseStream = await chatInstance.current.sendMessageStream({ message: userMsg });
      
      let botContent = '';
      setMessages(prev => [...prev, { role: 'bot', content: '' }]);

      for await (const chunk of responseStream) {
        const textChunk = (chunk as GenerateContentResponse).text;
        if (textChunk) {
          botContent += textChunk;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            const updated = [...prev];
            updated[prev.length - 1] = { ...last, content: botContent };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "I'm sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-2xl overflow-hidden border-x border-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <LeafIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-900 leading-tight">NutriBot</h1>
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Expert Nutrition AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-slate-500 font-medium">Live Consultant</span>
        </div>
      </header>

      {/* Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] bg-opacity-5"
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-100 text-emerald-600'}`}>
                {msg.role === 'user' ? <UserIcon /> : <LeafIcon />}
              </div>
              <div 
                className={`p-4 rounded-2xl shadow-sm border ${
                  msg.role === 'user' 
                    ? 'bg-slate-800 text-white border-slate-700' 
                    : 'bg-white text-slate-800 border-emerald-100'
                }`}
              >
                <div className="prose prose-sm prose-emerald">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'h-2' : 'mb-1 last:mb-0'}>
                      {line}
                    </p>
                  ))}
                  {msg.role === 'bot' && msg.content === '' && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length-1].role !== 'bot' && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3 max-w-[85%]">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <LeafIcon />
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 italic text-emerald-600 text-sm">
                Thinking about your health...
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-gray-100 bg-white">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about calories, meal plans, or recipes..."
            className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-3.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
          >
            <SendIcon />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-center text-slate-400 uppercase tracking-tighter">
          NutriBot is for informational purposes. Always consult a healthcare professional.
        </p>
      </footer>
    </div>
  );
};

export default NutritionistChat;
