import { useEffect, useRef, useState } from "react";

import { Message } from "@/hooks/useGemini";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

function QuotaError({ initialSeconds }: { initialSeconds: number }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl p-4 shadow-sm text-sm">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-50 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-bold mb-1">Rate Limit Reached</h4>
            <p className="mb-2 text-amber-800">
              You&apos;ve hit the free tier limit for Gemini. Please wait a
              moment before sending more messages.
            </p>
            <div className="font-mono bg-white/50 px-2 py-1 rounded inline-block text-amber-700 font-bold border border-amber-100">
              {timeLeft > 0 ? (
                <>Try again in {Math.ceil(timeLeft)}s</>
              ) : (
                <>Ready to retry!</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to parse thinking blocks
function ThinkingBlock({ text }: { text: string }) {
  // Split by thinking tag
  const parts = text.split(/(<thinking>[\s\S]*?<\/thinking>)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("<thinking>") && part.endsWith("</thinking>")) {
          const content = part.replace(/<\/?thinking>/g, "").trim();
          return (
            <details
              key={index}
              className="mb-2 group"
              open={process.env.NODE_ENV === "development"}
            >
              <summary className="text-xs font-medium text-slate-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-slate-700">
                <svg
                  className="w-3 h-3 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Thinking Process
              </summary>
              <div className="mt-1 pl-4 border-l-2 border-slate-200 text-xs text-slate-500 font-mono whitespace-pre-wrap">
                {content}
              </div>
            </details>
          );
        }
        if (!part.trim()) return null;
        return <span key={index}>{part}</span>;
      })}
    </>
  );
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

        {messages.map((msg) => {
          const isQuotaError = msg.text.includes("Quota exceeded");
          const retryMatch = msg.text.match(/retry in (\d+(\.\d+)?)s/);
          const secondsToWait = retryMatch ? parseFloat(retryMatch[1]) : null;

          if (isQuotaError && secondsToWait) {
            return <QuotaError key={msg.id} initialSeconds={secondsToWait} />;
          }

          return (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.text.startsWith("Error:")
                    ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-none"
                    : msg.role === "user"
                    ? "bg-sky-500 text-white rounded-br-none"
                    : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                }`}
              >
                {msg.text.startsWith("Error:") ? (
                  msg.text.replace("Error: ", "")
                ) : msg.role === "user" ? (
                  msg.text
                ) : (
                  <ThinkingBlock text={msg.text} />
                )}
              </div>
            </div>
          );
        })}

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
