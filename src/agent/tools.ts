import { BlockNoteEditor } from "@blocknote/core";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { ColumnType } from "@/components/TableEditor/types";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FileSystemContextType } from "@/contexts/FileSystemContext";

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
      {
        name: "create_file",
        description: "Creates a new file (note) in the file system.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "The name of the file to create.",
            },
            parentId: {
              type: "STRING",
              description:
                "Optional ID of the parent folder. If not provided, creates in root.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "create_folder",
        description: "Creates a new folder in the file system.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "The name of the folder to create.",
            },
            parentId: {
              type: "STRING",
              description:
                "Optional ID of the parent folder. If not provided, creates in root.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "rename_item",
        description: "Renames an existing file or folder.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: {
              type: "STRING",
              description: "The ID of the file or folder to rename.",
            },
            newName: {
              type: "STRING",
              description: "The new name for the item.",
            },
          },
          required: ["id", "newName"],
        },
      },
      {
        name: "delete_item",
        description:
          "Deletes a file or folder. Warning: This action is irreversible.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: {
              type: "STRING",
              description: "The ID of the file or folder to delete.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "move_item",
        description: "Moves a file or folder to a new parent folder.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: {
              type: "STRING",
              description: "The ID of the file or folder to move.",
            },
            newParentId: {
              type: "STRING",
              description:
                "The ID of the new parent folder. Use null to move to root.",
            },
          },
          required: ["id", "newParentId"],
        },
      },
      {
        name: "list_files",
        description: "Lists all files and folders in the file system.",
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
  editor: BlockNoteEditor | null | undefined, // Editor might be null if we are just doing file ops
  fileSystem?: FileSystemContextType, // We pass the file system context here
  doc?: Y.Doc | null // Yjs doc for table manipulation
): Promise<string> {
  console.log(`Executing tool: ${functionName}`, args);

  try {
    switch (functionName) {
      case "insert_note_content": {
        if (!editor) return "Error: No active editor to insert content into.";
        const content = args.content as string;
        const blocks = await editor.tryParseMarkdownToBlocks(content);
        // ... (check doc empty logic)
        const isDocEmpty =
          (editor.document.length === 1 &&
            editor.document[0].content === undefined &&
            (editor.document[0] as unknown as { content: unknown[] }).content
              ?.length === 0) ||
          (editor.document[0].content as unknown as string) === "" ||
          JSON.stringify(editor.document[0].content) === "[]";

        const currentBlock = editor.getTextCursorPosition().block;
        const index = editor.document.indexOf(currentBlock);

        if (isDocEmpty) {
          editor.replaceBlocks(editor.document, blocks);
        } else if (index !== -1) {
          editor.insertBlocks(blocks, currentBlock, "after");
        } else {
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
        if (!editor) return "Error: No active editor to read.";
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        return markdown || "(Empty Document)";
      }

      case "clear_document": {
        if (!editor) return "Error: No active editor to clear.";
        const titleBlock = { type: "paragraph", content: "" } as const;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.replaceBlocks(editor.document, [titleBlock as any]);
        return "Document cleared.";
      }

      case "create_document": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { title, parentId } = args as {
          title: string;
          parentId?: string;
        };
        const id = fileSystem.createFile(title, parentId || null);
        // Automatically open the new file if possible
        if (id && fileSystem.setActiveFileId) {
          fileSystem.setActiveFileId(id);
        }
        return `Document created with ID: ${id}. The document is now open. You can now use 'insert_note_content' to add content to it.`;
      }

      case "create_folder": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { name, parentId } = args as { name: string; parentId?: string };
        const id = fileSystem.createFolder(name, parentId || null);
        return `Folder created with ID: ${id}`;
      }

      case "rename_item": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { id, newName } = args as { id: string; newName: string };
        fileSystem.renameItem(id, newName);
        return `Item renamed to: ${newName}`;
      }

      case "move_item": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { id, newParentId } = args as {
          id: string;
          newParentId: string | null;
        };
        fileSystem.moveItem(id, newParentId);
        return `Item moved to parent: ${newParentId}`;
      }

      case "delete_item": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { id } = args as { id: string };
        fileSystem.deleteItem(id);
        return `Item deleted: ${id}`;
      }

      case "list_files": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const files: string[] = [];
        fileSystem.fileMap.forEach((f) => {
          files.push(
            `- [${f.type}] ${f.name} (ID: ${f.id}, Parent: ${
              f.parentId || "root"
            })`
          );
        });
        if (files.length === 0) {
          return "No files or folders in the system. The file system is empty.";
        }
        return `Files in system:\n${files.join("\n")}`;
      }

      case "get_active_document": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        if (!fileSystem.activeFileId) return "No document is currently open.";
        const activeFile = fileSystem.fileMap.get(fileSystem.activeFileId);
        if (!activeFile)
          return "Error: Active document found in state but not in the file system.";
        return `Active Document: ${activeFile.name} (ID: ${activeFile.id})`;
      }

      case "open_document": {
        if (!fileSystem)
          return "Error: File system not available for this tool.";
        const { id } = args as { id: string };
        const file = fileSystem.fileMap.get(id);
        if (!file) return `Error: Document with ID ${id} not found.`;
        if (file.type !== "file")
          return `Error: ID ${id} is a folder, not a document.`;
        fileSystem.setActiveFileId(id);
        return `Opened document: ${file.name} (ID: ${id})`;
      }

      case "add_table_row": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to add row to.";
        const fileId = fileSystem.activeFileId;
        const rowsArray = doc.getArray<Y.Map<unknown>>(`rows-${fileId}`);
        doc.transact(() => {
          const newRowMap = new Y.Map();
          newRowMap.set("id", uuidv7());
          rowsArray.push([newRowMap]);
        });
        return "Row added successfully.";
      }

      case "add_table_column": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to add column to.";
        const fileId = fileSystem.activeFileId;
        const { name, type } = args as { name: string; type: ColumnType };
        const schemaArray = doc.getArray(`schema-${fileId}`);
        doc.transact(() => {
          schemaArray.push([{ id: uuidv7(), name, type }]);
        });
        return `Column "${name}" of type "${type}" added successfully.`;
      }

      case "delete_table_row": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to delete row from.";
        const fileId = fileSystem.activeFileId;
        const { rowIndex } = args as { rowIndex: number };
        const rowsArray = doc.getArray(`rows-${fileId}`);
        if (rowIndex < 0 || rowIndex >= rowsArray.length)
          return `Error: Row index ${rowIndex} is out of bounds.`;
        doc.transact(() => {
          rowsArray.delete(rowIndex, 1);
        });
        return `Row ${rowIndex} deleted successfully.`;
      }

      case "delete_table_column": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to delete column from.";
        const fileId = fileSystem.activeFileId;
        const { columnId } = args as { columnId: string };
        const schemaArray = doc.getArray(`schema-${fileId}`);
        const schema = schemaArray.toArray() as Array<{
          id: string;
          name: string;
          type: ColumnType;
        }>;
        const colIndex = schema.findIndex((col) => col.id === columnId);
        if (colIndex === -1)
          return `Error: Column with ID ${columnId} not found.`;
        doc.transact(() => {
          schemaArray.delete(colIndex, 1);
        });
        return `Column deleted successfully.`;
      }

      case "update_table_cell": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to update cell in.";
        const fileId = fileSystem.activeFileId;
        const { rowIndex, columnId, value } = args as {
          rowIndex: number;
          columnId: string;
          value: string | number | string[];
        };
        const rowsArray = doc.getArray<Y.Map<unknown>>(`rows-${fileId}`);
        if (rowIndex < 0 || rowIndex >= rowsArray.length)
          return `Error: Row index ${rowIndex} is out of bounds.`;
        doc.transact(() => {
          const rowMap = rowsArray.get(rowIndex);
          rowMap.set(columnId, value);
        });
        return `Cell updated successfully.`;
      }

      case "read_table_structure": {
        if (!doc)
          return "Error: No document context available for table operations.";
        if (!fileSystem || !fileSystem.activeFileId)
          return "Error: No active document to read table from.";
        const fileId = fileSystem.activeFileId;
        const schemaArray = doc.getArray(`schema-${fileId}`);
        const rowsArray = doc.getArray<Y.Map<unknown>>(`rows-${fileId}`);
        const schema = schemaArray.toArray();
        const rows = rowsArray.toArray().map((yMap) => yMap.toJSON());
        return JSON.stringify(
          { schema, rows, rowCount: rows.length, columnCount: schema.length },
          null,
          2
        );
      }

      default:
        return `Error: Unknown tool ${functionName}`;
    }
  } catch (err: unknown) {
    console.error("Tool execution error:", err);
    return `Error executing ${functionName}: ${(err as Error).message}`;
  }
}

// OpenRouter/OpenAI compatible tools format
export const OPENROUTER_TOOLS = [
  {
    type: "function",
    function: {
      name: "insert_note_content",
      description:
        "Appends new content to the end of the document. Use this to take notes, write summaries, or add information.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content to insert. Supports markdown.",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_document",
      description:
        "Reads the current content of the document to understand context.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_document",
      description: "Clears all content from the document. Use with caution.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_document",
      description: "Creates a new document (note) in the file system.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the document to create.",
          },
          parentId: {
            type: "string",
            description:
              "Optional ID of the parent folder. If not provided, creates in root.",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Creates a new folder in the file system.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the folder to create.",
          },
          parentId: {
            type: "string",
            description:
              "Optional ID of the parent folder. If not provided, creates in root.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_item",
      description: "Renames an existing file or folder.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the file or folder to rename.",
          },
          newName: {
            type: "string",
            description: "The new name for the item.",
          },
        },
        required: ["id", "newName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_item",
      description:
        "Deletes a file or folder. Warning: This action is irreversible.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the file or folder to delete.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_item",
      description: "Moves a file or folder to a new parent folder.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the file or folder to move.",
          },
          newParentId: {
            type: "string",
            description:
              "The ID of the new parent folder. Use null to move to root.",
          },
        },
        required: ["id", "newParentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Lists all files and folders in the file system.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_document",
      description:
        "Returns the name and ID of the document currently open in the editor.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_document",
      description:
        "Opens a document by its ID. Use list_files to discover document IDs.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the document to open.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_table_row",
      description:
        "Adds a new row to the table in the currently active document.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_table_column",
      description:
        "Adds a new column to the table in the currently active document.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the column.",
          },
          type: {
            type: "string",
            description:
              "The type of the column. Valid types: text, number, select, multi-select, formula, date",
            enum: [
              "text",
              "number",
              "select",
              "multi-select",
              "formula",
              "date",
            ],
          },
        },
        required: ["name", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_table_row",
      description:
        "Deletes a row from the table in the currently active document.",
      parameters: {
        type: "object",
        properties: {
          rowIndex: {
            type: "number",
            description: "The 0-based index of the row to delete.",
          },
        },
        required: ["rowIndex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_table_column",
      description:
        "Deletes a column from the table in the currently active document.",
      parameters: {
        type: "object",
        properties: {
          columnId: {
            type: "string",
            description:
              "The ID of the column to delete. Use read_table_structure to find column IDs.",
          },
        },
        required: ["columnId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_table_cell",
      description:
        "Updates a cell value in the table of the currently active document.",
      parameters: {
        type: "object",
        properties: {
          rowIndex: {
            type: "number",
            description: "The 0-based index of the row.",
          },
          columnId: {
            type: "string",
            description:
              "The ID of the column. Use read_table_structure to find column IDs.",
          },
          value: {
            description:
              "The value to set. Can be string, number, or array of strings (for multi-select).",
          },
        },
        required: ["rowIndex", "columnId", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_table_structure",
      description:
        "Reads the structure and data of the table in the currently active document. Returns column schema and all rows.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Reuse the same execution logic for OpenRouter
export const executeOpenRouterTool = executeTool;
