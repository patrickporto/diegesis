import { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useState } from "react";
import { uuidv7 } from "uuidv7";

import { executeOpenRouterTool, OPENROUTER_TOOLS } from "@/agent/tools";
import { useFileSystem } from "@/contexts/FileSystemContext";

const STORAGE_KEY = "openrouter_api_key";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const DEFAULT_MODEL = "z-ai/glm-4.5-air:free";

const SYSTEM_INSTRUCTION = `You are Diegesis AI, an intelligent assistant integrated into a block-based note-taking app.
Your goal is to help users manage their personal knowledge base, create content, and organize files.

You have access to a set of tools to:
- Manage the file system (create, delete, rename, move files/folders).
- Interact with the active editor (read content, insert notes, clear document).

CRITICAL INSTRUCTION - THINKING PROCESS:
For EVERY user request, you MUST perform a deep step-by-step reasoning before taking action or responding.
1. Analyze the user's intent.
2. Check which tools are available and relevant.
3. Formulate a plan.
4. Verify if the plan is safe and correct.

Output your reasoning process wrapped in <thinking>...</thinking> tags at the very beginning of your response.
After the thinking block, perform the necessary tool calls or provide the final answer.
Do not be verbose in the final answer if the tool execution is self-explanatory, but always be helpful.`;

interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenRouterChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
    code?: number;
  };
}

export function useOpenRouter(editor?: BlockNoteEditor | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  const fileSystem = useFileSystem();

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
        setError("Please add your OpenRouter API key.");
        return;
      }

      const newMessage: Message = {
        id: uuidv7(),
        role: "user",
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
      setIsLoading(true);
      setError(null);

      // Token Optimization: Limit context window and filter invalid messages
      const validHistory = messages.filter(
        (msg) => !msg.text.startsWith("Error:")
      );
      const recentHistory = validHistory.slice(-20);

      // Build OpenRouter messages array
      const openRouterMessages: OpenRouterMessage[] = [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...(recentHistory.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        })) as OpenRouterMessage[]),
        { role: "user", content: text },
      ];

      try {
        let finished = false;

        while (!finished) {
          const body: {
            model: string;
            messages: OpenRouterMessage[];
            tools?: unknown[];
          } = {
            model: DEFAULT_MODEL,
            messages: openRouterMessages,
          };

          // Only add tools if editor is available
          if (editor) {
            body.tools = OPENROUTER_TOOLS;
          }

          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Diegesis Notes",
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

          const data = (await response.json()) as OpenRouterResponse;
          const choice = data.choices?.[0];
          const message = choice?.message;

          if (!message) {
            throw new Error("No response from model");
          }

          // Check for tool calls (OpenAI format)
          if (message.tool_calls && message.tool_calls.length > 0) {
            // Add assistant message with tool calls
            openRouterMessages.push({
              role: "assistant",
              content: message.content || "",
              tool_calls: message.tool_calls,
            });

            // Process each tool call
            for (const toolCall of message.tool_calls) {
              const functionName = toolCall.function.name;
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch {
                args = {};
              }

              let result = "Error: Editor not connected.";
              if (editor) {
                result = await executeOpenRouterTool(
                  functionName,
                  args,
                  editor,
                  fileSystem
                );
              }

              // Add tool response
              openRouterMessages.push({
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
                name: functionName,
              });
            }

            // Continue loop to get final response
            continue;
          }

          // Fallback: Parse XML-style tool calls (for models like GLM)
          const responseContent = message.content || "";
          const xmlToolRegex = /<(\w+)(?:\s+([^>]*))?>(?:([\s\S]*?)<\/\1>)?/g;
          const xmlToolMatches = [...responseContent.matchAll(xmlToolRegex)];

          // Known tool names to look for
          const knownTools = [
            "insert_note_content",
            "read_document",
            "clear_document",
            "create_file",
            "create_folder",
            "rename_item",
            "delete_item",
            "move_item",
            "list_files",
          ];

          const foundXmlTools = xmlToolMatches.filter((match) =>
            knownTools.includes(match[1])
          );

          if (foundXmlTools.length > 0) {
            // Execute XML-style tool calls
            const toolResults: string[] = [];

            for (const toolMatch of foundXmlTools) {
              const toolName = toolMatch[1];
              const toolContent = toolMatch[3] || "";

              // Parse arguments from content or attributes
              let args: Record<string, unknown> = {};
              if (toolContent.trim()) {
                // Try to parse as JSON or use as content
                try {
                  args = JSON.parse(toolContent);
                } catch {
                  args = { content: toolContent.trim() };
                }
              }

              let result = "Error: Editor not connected.";
              if (editor) {
                result = await executeOpenRouterTool(
                  toolName,
                  args,
                  editor,
                  fileSystem
                );
              }
              toolResults.push(`[${toolName}]: ${result}`);
            }

            // Add the tool results to the message and continue
            openRouterMessages.push({
              role: "assistant",
              content: responseContent,
            });

            openRouterMessages.push({
              role: "user",
              content: `Tool execution results:\n${toolResults.join(
                "\n"
              )}\n\nPlease provide a final response to the user.`,
            });

            continue;
          } else {
            // No tool calls, final response
            const responseText =
              message.content || "I couldn't generate a response.";

            const responseMessage: Message = {
              id: uuidv7(),
              role: "assistant",
              text: responseText,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, responseMessage]);
            finished = true;
          }
        }
      } catch (err: unknown) {
        console.error("Error sending message to OpenRouter:", err);
        const errorMessageText =
          (err as Error).message || "Failed to get response from OpenRouter.";
        setError(errorMessageText);

        const errorMessage: Message = {
          id: uuidv7(),
          role: "assistant",
          text: `Error: ${errorMessageText}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, apiKey, editor, fileSystem]
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
