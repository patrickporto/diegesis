import { useEffect, useRef, useState } from "react";

import { Message } from "@/hooks/useGemini";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-8 text-sm">
            <p>👋 Hi! I&apos;m your Gemini assistant.</p>
            <p>Ask me anything about your notes or general questions.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === "user"
                  ? "bg-sky-500 text-white rounded-br-none"
                  : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-white text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5 transform rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
