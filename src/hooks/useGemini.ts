import { useCallback, useState } from "react";

const STORAGE_KEY = "gemini_api_key";

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const DEFAULT_MODEL = "models/gemini-2.5-flash";

export function useGemini() {
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

      const apiMessages = [...messages, newMessage].map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: apiMessages,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || `API Error: ${response.statusText}`
          );
        }

        const data = await response.json();

        const responseText =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a response.";

        const responseMessage: Message = {
          id: crypto.randomUUID(),
          role: "model",
          text: responseText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, responseMessage]);
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
    [messages, apiKey]
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
