import { useState } from "react";

import { useNotes } from "@/contexts/NotesContext";
import { useOpenRouter } from "@/hooks/useOpenRouter";

import { ChatInterface } from "./ChatInterface";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { editor } = useNotes();
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    apiKey,
    setApiKey,
    hasApiKey,
  } = useOpenRouter(editor);

  const [showApiKeyInput, setShowApiKeyInput] = useState(!hasApiKey);
  const [tempApiKey, setTempApiKey] = useState(apiKey);

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    if (tempApiKey) {
      setShowApiKeyInput(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[350px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-slate-200 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6.97 6.97a.75.75 0 011.06 0l.44.44a.75.75 0 11-1.06 1.06l-.44-.44a.75.75 0 010-1.06zm9.54 0a.75.75 0 011.06 0l.44.44a.75.75 0 11-1.06 1.06l-.44-.44a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-700">OpenRouter</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`p-2 hover:bg-slate-100 rounded-lg transition-colors ${
                hasApiKey ? "text-emerald-500" : "text-amber-500"
              }`}
              title={hasApiKey ? "API Key configured" : "Configure API Key"}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </button>
            <button
              onClick={clearMessages}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Clear chat"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="px-4 py-3 border-b border-slate-100 bg-emerald-50/50">
            <div className="text-xs font-medium text-slate-600 mb-2">
              OpenRouter API Key
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:underline ml-2"
              >
                Get one →
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Save
              </button>
            </div>
            {hasApiKey && (
              <button
                onClick={() => {
                  setApiKey("");
                  setTempApiKey("");
                }}
                className="text-xs text-rose-500 hover:underline mt-2"
              >
                Remove key
              </button>
            )}
          </div>
        )}

        {/* Model Selector */}
        {hasApiKey && (
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/30">
            <div className="text-[10px] text-slate-400 text-center">
              Using Gemini 2.0 Flash (Free)
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
          />
        </div>
      </div>
    </>
  );
}
