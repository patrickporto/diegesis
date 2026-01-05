import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import { Message } from "@/hooks/useOpenRouter";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

// Helper to parse thinking blocks and render markdown
function ThinkingBlock({ text }: { text: string }) {
  // Split by complete thinking tags OR open thinking tags (streaming)
  const parts = text.split(/(<thinking>[\s\S]*?(?:<\/thinking>|$))/g);

  return (
    <>
      {parts.map((part, index) => {
        // Handle complete or streaming thinking block
        if (part.startsWith("<thinking>")) {
          const isComplete = part.endsWith("</thinking>");
          const content = part.replace(/<\/?thinking>/g, "").trim();
          return (
            <details key={index} className="mb-2 group" open={true}>
              <summary className="text-xs font-medium text-slate-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-slate-700">
                <svg
                  className={`w-3 h-3 transition-transform group-open:rotate-90 ${
                    !isComplete ? "animate-pulse" : ""
                  }`}
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
                {isComplete ? "Thinking Process" : "Thinking..."}
              </summary>
              <div className="mt-1 pl-4 border-l-2 border-slate-200 text-xs text-slate-500 font-mono whitespace-pre-wrap">
                {content}
                {!isComplete && <span className="animate-pulse">▌</span>}
              </div>
            </details>
          );
        }

        // Handle tool tags during streaming (show as code block)
        if (part.includes("<tool>") && !part.includes("</tool>")) {
          return (
            <div
              key={index}
              className="bg-slate-100 rounded p-2 text-xs font-mono text-slate-600"
            >
              <span className="text-slate-400">Executing tool...</span>
              <span className="animate-pulse ml-1">▌</span>
            </div>
          );
        }

        if (!part.trim()) return null;
        // Render other content as markdown
        return (
          <div key={index} className="prose prose-sm prose-slate max-w-none">
            <Markdown>{part}</Markdown>
          </div>
        );
      })}
    </>
  );
}

function QuotaBanner({ initialSeconds }: { initialSeconds: number }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  return (
    <div className="bg-amber-50 border-t border-amber-200 p-3 shadow-inner">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-amber-900">
          <svg
            className="w-5 h-5 text-amber-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold">Rate Limit Reached</span>
            <span className="hidden sm:inline text-amber-300">|</span>
            <span className="text-amber-800">
              Please wait before sending more messages.
            </span>
          </div>
        </div>
        <div className="font-mono bg-white px-3 py-1 rounded text-amber-700 font-bold border border-amber-200 text-xs shrink-0">
          {timeLeft > 0 ? <>Retry in {Math.ceil(timeLeft)}s</> : <>Ready!</>}
        </div>
      </div>
    </div>
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
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

  // Find latest rate limit error (supports various formats)
  let latestQuotaErrorSeconds: number | null = null;
  // Iterate backwards to find the most recent error
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const isRateLimitError =
      msg.text.includes("Quota exceeded") ||
      msg.text.includes("rate limit") ||
      msg.text.includes("Rate limit") ||
      msg.text.includes("429") ||
      msg.text.includes("Too Many Requests") ||
      msg.text.includes("Provider returned error");

    if (isRateLimitError && msg.role === "assistant") {
      // Try to extract retry time, default to 30 seconds if not found
      const retryMatch = msg.text.match(/retry in (\d+(\.\d+)?)s/i);
      latestQuotaErrorSeconds = retryMatch ? parseFloat(retryMatch[1]) : 30;
      break;
    }
  }

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
          // We intentionally skip rendering quota errors in the message list now
          // as they will be shown in the banner.
          if (isQuotaError) return null;

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

      {/* Quota Banner (if active) */}
      {latestQuotaErrorSeconds !== null && (
        <QuotaBanner
          key={latestQuotaErrorSeconds} // Reset timer if new error comes
          initialSeconds={latestQuotaErrorSeconds}
        />
      )}

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
