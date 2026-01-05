import { BlockNoteEditor } from "@blocknote/core";

export const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: "insert_note_content",
        description:
          "Appends new content to the end of the document. Use this to take notes, write summaries, or add information.",
        parameters: {
          type: "OBJECT",
          properties: {
            content: {
              type: "STRING",
              description: "The content to insert. Supports markdown.",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "read_document",
        description:
          "Reads the current content of the document to understand context.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "clear_document",
        description: "Clears all content from the document. Use with caution.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];

export async function executeTool(
  functionName: string,
  args: Record<string, unknown>,
  editor: BlockNoteEditor
): Promise<string> {
  console.log(`Executing tool: ${functionName}`, args);

  try {
    switch (functionName) {
      case "insert_note_content": {
        const content = args.content as string;
        // simplistic markdown conversion or just simple insertion
        // BlockNote's insertBlocks is widely supported
        const blocks = await editor.tryParseMarkdownToBlocks(content);
        // Check if document is empty (has only one empty paragraph)
        const isDocEmpty =
          (editor.document.length === 1 &&
            editor.document[0].content === undefined && // or empty array
            (editor.document[0] as unknown as { content: unknown[] }).content
              ?.length === 0) ||
          (editor.document[0].content as unknown as string) === "" || // Handling BlockNote variations
          JSON.stringify(editor.document[0].content) === "[]";

        const currentBlock = editor.getTextCursorPosition().block;
        const index = editor.document.indexOf(currentBlock);

        if (isDocEmpty) {
          // If document is effectively empty, replace the empty block with new content
          editor.replaceBlocks(editor.document, blocks);
        } else if (index !== -1) {
          // Insert after cursor
          editor.insertBlocks(blocks, currentBlock, "after");
        } else {
          // Append to end
          const lastBlock = editor.document[editor.document.length - 1];
          if (lastBlock) {
            editor.insertBlocks(blocks, lastBlock, "after");
          } else {
            editor.replaceBlocks(editor.document, blocks);
          }
        }
        return "Content inserted successfully.";
      }

      case "read_document": {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        return markdown || "(Empty Document)";
      }

      case "clear_document": {
        const titleBlock = { type: "paragraph", content: "" } as const;
        // The type needs to match BlockNote's expected input which might satisfy the partial block definition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.replaceBlocks(editor.document, [titleBlock as any]);
        return "Document cleared.";
      }

      default:
        return `Error: Unknown tool ${functionName}`;
    }
  } catch (err: unknown) {
    console.error("Tool execution error:", err);
    return `Error executing ${functionName}: ${(err as Error).message}`;
  }
}
