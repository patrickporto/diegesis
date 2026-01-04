import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import * as Y from "yjs";

interface EditorProps {
  doc: Y.Doc;
}

export const Editor = ({ doc }: EditorProps) => {
  // Use existing doc, BlockNote will sync with 'document' xmlFragment by default or we specify a field.
  // We need to provide the collaboration provider prop if we want it to handle it,
  // but since we manage the provider outside (in useYjs), we can just pass the fragment.
  // Actually, BlockNote's useCreateBlockNote takes `collaboration` config.

  // We need the provider to be fully connected for initial sync?
  // BlockNote handles the Yjs binding internally if we pass the fragment or the user details.

  // Let's create the editor.
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment("document-store"),
      user: {
        name: "User",
        color: "#ff0000",
      },
    },
  });

  if (!editor) {
    return <div>Loading Editor...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[500px] bg-white rounded-lg shadow-sm p-4">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
};
