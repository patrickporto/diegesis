import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";

import { useNotes } from "@/contexts/NotesContext";

export const Editor = () => {
  const { editor } = useNotes();

  if (!editor) {
    return <div>Loading Editor...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[500px] bg-white rounded-lg shadow-sm p-4">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
};
