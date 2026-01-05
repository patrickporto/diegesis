import { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useState } from "react";

import { executeTool, GEMINI_TOOLS } from "@/agent/tools";

const STORAGE_KEY = "gemini_api_key";

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const DEFAULT_MODEL = "models/gemini-2.5-flash";

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: unknown;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

export function useGemini(editor?: BlockNoteEditor | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!apiKey) {
        setError("Please add your Gemini API key.");
        return;
      }

      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
      setIsLoading(true);
      setError(null);

      // We use a local variable to track conversation history including function calls for this turn
      const currentTurnMessages = [
        ...messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        })),
        { role: "user", parts: [{ text }] },
      ];

      try {
        let finished = false;

        // Loop to handle potential multiple function calls
        while (!finished) {
          const body: { contents: unknown[]; tools?: unknown[] } = {
            contents: currentTurnMessages,
          };

          // Only add tools if editor is available
          if (editor) {
            body.tools = GEMINI_TOOLS;
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error?.message || `API Error: ${response.statusText}`
            );
          }

          const data = (await response.json()) as GeminiResponse;
          const candidate = data.candidates?.[0];
          const content = candidate?.content;
          const parts = content?.parts || [];

          // Check for explicit text response first
          const textPart = parts.find((p) => p.text);

          // Check for function call
          const functionCallPart = parts.find((p) => p.functionCall);

          if (functionCallPart && functionCallPart.functionCall) {
            // Handle Function Call
            const { name, args } = functionCallPart.functionCall;

            currentTurnMessages.push({
              role: "model",
              parts: [functionCallPart], // keeping structure compatible with API input
            });

            let result = "Error: Editor not connected.";
            if (editor) {
              result = await executeTool(name, args, editor);
            }

            // Add function response to history
            currentTurnMessages.push({
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: name,
                    response: { name: name, content: result },
                  },
                },
              ],
            });

            // Loop continues to send this response back to Gemini
            continue;
          } else {
            // No function call, final response
            const responseText =
              textPart?.text || "I couldn't generate a response.";

            const responseMessage: Message = {
              id: crypto.randomUUID(),
              role: "model",
              text: responseText,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, responseMessage]);
            finished = true;
          }
        }
      } catch (err: unknown) {
        console.error("Error sending message to Gemini:", err);
        const errorMessageText =
          (err as Error).message || "Failed to get response from Gemini.";
        setError(errorMessageText);

        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "model",
          text: `Error: ${errorMessageText}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, apiKey, editor]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    apiKey,
    setApiKey,
    hasApiKey: !!apiKey,
  };
}
