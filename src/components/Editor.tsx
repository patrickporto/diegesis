import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { useFileSystem } from "@/contexts/FileSystemContext";
import { useNotes } from "@/contexts/NotesContext";

export const Editor = () => {
  const { doc, provider } = useNotes();
  const { activeFileId } = useFileSystem();

  // We need to use a memoized key or similar to force re-creation if fileId changes,
  // OR we rely on useCreateBlockNote to handle dependency updates if we pass different fragment.
  // Actually, useCreateBlockNote doesn't automatically swapping fragments easily without a key change or effect.

  // Best approach: A sub-component that takes fileId as key.

  if (!activeFileId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>Select a file to edit</p>
      </div>
    );
  }

  return (
    <ActiveEditor
      key={activeFileId}
      fileId={activeFileId}
      doc={doc}
      provider={provider}
    />
  );
};

function ActiveEditor({
  fileId,
  doc,
  provider,
}: {
  fileId: string;
  doc: Y.Doc;
  provider: IndexeddbPersistence | null;
}) {
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment(`content-${fileId}`),
      user: {
        name: "User",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      },
      provider: provider,
    },
  });

  if (!editor) return <div>Loading...</div>;

  return (
    <div className="w-full h-full min-h-[500px] bg-white sm:rounded-lg sm:shadow-sm p-0 sm:p-4">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
