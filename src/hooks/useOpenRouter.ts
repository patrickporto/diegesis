import { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";

import { executeOpenRouterTool, OPENROUTER_TOOLS } from "@/agent/tools";
import { useFileSystem } from "@/contexts/FileSystemContext";
import { useNotes } from "@/contexts/NotesContext";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `You are Diegesis AI.
You help users manage notes and files.
You MUST use the tools provided for any action.
- To create a note: create_document(title: string)
- To add text to the open note: insert_note_content(content: string)
- To create a note with content, call create_document THEN insert_note_content.
- To list files: list_files()

Thinking process:
- Use <thinking>...</thinking> for reasoning.
- After thinking, emit tool calls OR a final response.`;

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

export function useOpenRouter(editor?: BlockNoteEditor | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { doc } = useNotes();
  const [apiKey, setApiKeyState] = useState<string>("");

  const fileSystem = useFileSystem();
  const editorRef = useRef<BlockNoteEditor | null>(editor || null);

  // Sync ref with prop
  useEffect(() => {
    editorRef.current = editor || null;
  }, [editor]);

  // Sync API Key with Y.js doc
  useEffect(() => {
    if (!doc) return;

    const settings = doc.getMap<string>("settings");

    // Initial load
    setApiKeyState(settings.get("openrouter_api_key") || "");

    // Observe changes
    const displayApiKey = () => {
      setApiKeyState(settings.get("openrouter_api_key") || "");
    };

    settings.observe(displayApiKey);

    return () => {
      settings.unobserve(displayApiKey);
    };
  }, [doc]);

  const setApiKey = useCallback(
    (key: string) => {
      if (!doc) return;
      const settings = doc.getMap<string>("settings");

      // We update local state immediately for responsiveness,
      // though the observer would also catch it.
      setApiKeyState(key);

      if (key) {
        settings.set("openrouter_api_key", key);
      } else {
        settings.delete("openrouter_api_key");
      }
    },
    [doc]
  );

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
            stream?: boolean;
          } = {
            model: DEFAULT_MODEL,
            messages: openRouterMessages,
            stream: true,
          };

          // Always provide tools - they will return error messages if editor/fs is missing
          body.tools = OPENROUTER_TOOLS;

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

          // Process streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let accumulatedContent = "";
          const toolCalls: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }> = [];
          const streamingMessageId = uuidv7();
          let hasAddedMessage = false;

          let streamDone = false;
          // eslint-disable-next-line no-constant-condition
          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) {
              streamDone = true;
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  if (delta?.content) {
                    accumulatedContent += delta.content;

                    // Update message in real-time
                    if (!hasAddedMessage) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: streamingMessageId,
                          role: "assistant",
                          text: accumulatedContent,
                          timestamp: new Date(),
                        },
                      ]);
                      hasAddedMessage = true;
                    } else {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageId
                            ? { ...m, text: accumulatedContent }
                            : m
                        )
                      );
                    }
                  }

                  // Collect tool calls
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const index = tc.index ?? 0;
                      if (!toolCalls[index]) {
                        toolCalls[index] = {
                          id: tc.id || "",
                          type: "function",
                          function: { name: "", arguments: "" },
                        };
                      }
                      if (tc.id) toolCalls[index].id = tc.id;
                      if (tc.function?.name)
                        toolCalls[index].function.name += tc.function.name;
                      if (tc.function?.arguments)
                        toolCalls[index].function.arguments +=
                          tc.function.arguments;
                    }
                  }
                } catch {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }

          // Handle tool calls (OpenAI format)
          if (toolCalls.length > 0 && toolCalls[0]?.function?.name) {
            openRouterMessages.push({
              role: "assistant",
              content: accumulatedContent,
              tool_calls: toolCalls,
            });

            // Remove the streaming message since we're continuing
            if (hasAddedMessage) {
              setMessages((prev) =>
                prev.filter((m) => m.id !== streamingMessageId)
              );
            }

            for (const toolCall of toolCalls) {
              const functionName = toolCall.function.name;
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch {
                args = {};
              }

              // Robust wait for editor if it's not yet connected (e.g. right after creation)
              let currentEditor = editorRef.current;
              if (
                !currentEditor &&
                (functionName === "insert_note_content" ||
                  functionName === "read_document" ||
                  functionName === "clear_document")
              ) {
                console.log(
                  `useOpenRouter: Editor missing for ${functionName}, waiting...`
                );
                for (let i = 0; i < 15; i++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (editorRef.current) {
                    console.log(
                      `useOpenRouter: Editor connected after ${i + 1} retries`
                    );
                    currentEditor = editorRef.current;
                    break;
                  }
                }
              }

              if (
                !currentEditor &&
                (functionName === "insert_note_content" ||
                  functionName === "read_document")
              ) {
                console.warn(
                  `useOpenRouter: Proceeding with ${functionName} despite null editor (might fail)`
                );
              }

              const result = await executeOpenRouterTool(
                functionName,
                args,
                currentEditor,
                fileSystem
              );

              // Small delay to allow BlockNote/React to sync state if a document was created
              if (
                functionName === "create_document" ||
                functionName === "move_item" ||
                functionName === "delete_item"
              ) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              openRouterMessages.push({
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
                name: functionName,
              });
            }

            continue;
          }

          // Fallback: Parse XML-style tool calls (for models like GLM)
          const responseContent = accumulatedContent;

          // First try to parse <tool> tags with nested content
          const toolTagRegex = /<tool>\s*(\w+)\s*(\{[\s\S]*?\})\s*<\/tool>/g;
          const toolTagMatches = [...responseContent.matchAll(toolTagRegex)];

          if (toolTagMatches.length > 0) {
            // Remove streaming message
            if (hasAddedMessage) {
              setMessages((prev) =>
                prev.filter((m) => m.id !== streamingMessageId)
              );
            }

            const toolResults: string[] = [];

            for (const toolMatch of toolTagMatches) {
              const toolName = toolMatch[1];
              const toolArgsStr = toolMatch[2];

              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(toolArgsStr);
              } catch {
                args = {};
              }

              // Robust wait for editor if it's not yet connected
              let currentEditor = editorRef.current;
              const toolsNeedingEditor = [
                "insert_note_content",
                "read_document",
                "clear_document",
              ];
              if (!currentEditor && toolsNeedingEditor.includes(toolName)) {
                console.log(
                  `useOpenRouter: Editor missing for ${toolName} (XML), waiting...`
                );
                for (let i = 0; i < 15; i++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (editorRef.current) {
                    console.log(
                      `useOpenRouter: Editor connected after ${i + 1} retries`
                    );
                    currentEditor = editorRef.current;
                    break;
                  }
                }
              }

              if (
                !currentEditor &&
                (toolName === "insert_note_content" ||
                  toolName === "read_document")
              ) {
                console.warn(
                  `useOpenRouter: Proceeding with ${toolName} despite null editor (might fail)`
                );
              }

              const result = await executeOpenRouterTool(
                toolName,
                args,
                currentEditor,
                fileSystem
              );

              // Small delay to allow BlockNote/React to sync state if a document was created
              if (
                toolName === "create_document" ||
                toolName === "move_item" ||
                toolName === "delete_item"
              ) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              toolResults.push(`[${toolName}]: ${result}`);
            }

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
          }

          // Also try direct XML tags like <create_file>...</create_file>
          const xmlToolRegex = /<(\w+)(?:\s+([^>]*))?>(?:([\s\S]*?)<\/\1>)?/g;
          const xmlToolMatches = [...responseContent.matchAll(xmlToolRegex)];

          const knownTools = [
            "insert_note_content",
            "read_document",
            "clear_document",
            "create_document",
            "create_folder",
            "rename_item",
            "delete_item",
            "move_item",
            "list_files",
            "get_active_document",
          ];

          const foundXmlTools = xmlToolMatches.filter((match) =>
            knownTools.includes(match[1])
          );

          if (foundXmlTools.length > 0) {
            // Remove streaming message
            if (hasAddedMessage) {
              setMessages((prev) =>
                prev.filter((m) => m.id !== streamingMessageId)
              );
            }

            const toolResults: string[] = [];

            for (const toolMatch of foundXmlTools) {
              const toolName = toolMatch[1];
              const toolContent = toolMatch[3] || "";

              let args: Record<string, unknown> = {};
              if (toolContent.trim()) {
                try {
                  args = JSON.parse(toolContent);
                } catch {
                  args = { content: toolContent.trim() };
                }
              }

              // Robust wait for editor if it's not yet connected
              let currentEditor = editorRef.current;
              const toolsNeedingEditor = [
                "insert_note_content",
                "read_document",
                "clear_document",
              ];
              if (!currentEditor && toolsNeedingEditor.includes(toolName)) {
                console.log(
                  `useOpenRouter: Editor missing for ${toolName} (Tag), waiting...`
                );
                for (let i = 0; i < 15; i++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (editorRef.current) {
                    console.log(
                      `useOpenRouter: Editor connected after ${i + 1} retries`
                    );
                    currentEditor = editorRef.current;
                    break;
                  }
                }
              }

              if (
                !currentEditor &&
                (toolName === "insert_note_content" ||
                  toolName === "read_document")
              ) {
                console.warn(
                  `useOpenRouter: Proceeding with ${toolName} despite null editor (might fail)`
                );
              }

              const result = await executeOpenRouterTool(
                toolName,
                args,
                currentEditor,
                fileSystem
              );

              // Small delay to allow BlockNote/React to sync state if a document was created
              if (
                toolName === "create_document" ||
                toolName === "move_item" ||
                toolName === "delete_item"
              ) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }

              toolResults.push(`[${toolName}]: ${result}`);
            }

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
            // No tool calls, streaming message is already added
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
    [messages, apiKey, fileSystem]
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
