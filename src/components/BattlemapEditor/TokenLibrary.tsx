import { useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useSync } from "@/contexts/SyncContext";

import { CropImageModal } from "./CropImageModal";

interface TokenLibraryItem {
  id: string;
  imageUrl: string;
  label: string;
}

interface TokenLibraryProps {
  doc: Y.Doc;
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TokenImage = ({
  src,
  alt,
  isSignedIn,
  getFileBlob,
}: {
  src: string;
  alt: string;
  isSignedIn: boolean;
  getFileBlob: (id: string) => Promise<Blob>;
}) => {
  const [imgSrc, setImgSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      if (src.startsWith("drive://")) {
        if (!isSignedIn) return;
        try {
          const id = src.replace("drive://", "");
          const blob = await getFileBlob(id);
          objectUrl = URL.createObjectURL(blob);
          if (active) setImgSrc(objectUrl);
        } catch (e) {
          console.error("Failed to load token image", e);
        }
      } else {
        setImgSrc(src);
      }
    };
    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, isSignedIn, getFileBlob]);

  if (!imgSrc)
    return (
      <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
    );

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 hover:border-sky-500 transition-colors"
    />
  );
};

export function TokenLibrary({
  doc,
  fileId,
  isOpen,
  onClose,
}: TokenLibraryProps) {
  const [libraryTokens, setLibraryTokens] = useState<TokenLibraryItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, getFileBlob, isSignedIn } = useSync();

  const libraryArray = useMemo(
    () => doc.getArray<TokenLibraryItem>(`battlemap-library-${fileId}`),
    [doc, fileId]
  );

  useEffect(() => {
    const observer = () => setLibraryTokens(libraryArray.toArray());
    libraryArray.observe(observer);
    observer();
    return () => libraryArray.unobserve(observer);
  }, [libraryArray]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedFile(result);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = async (blob: Blob) => {
    if (!isSignedIn) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        addTokenToLibrary(base64);
      };
      reader.readAsDataURL(blob);
      return;
    }

    try {
      const file = new File([blob], `token-${uuidv7()}.webp`, {
        type: "image/webp",
      });
      const { id } = await uploadFile(file);
      addTokenToLibrary(`drive://${id}`);
    } catch (error) {
      console.error("Failed to upload token:", error);
      alert("Failed to upload token to Drive");
    }
  };

  const addTokenToLibrary = (imageUrl: string) => {
    doc.transact(() => {
      libraryArray.push([
        {
          id: uuidv7(),
          imageUrl,
          label: "New Token",
        },
      ]);
    });
  };

  const handleDragStart = (e: React.DragEvent, token: TokenLibraryItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(token));
    e.dataTransfer.effectAllowed = "copy";
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute top-20 left-4 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-30 flex flex-col max-h-[70vh] animate-in slide-in-from-left-4 duration-200">
        <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <h3 className="font-semibold text-slate-800 text-sm">
            Token Library
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 grid grid-cols-4 gap-2">
          {libraryTokens.map((token) => (
            <div
              key={token.id}
              draggable
              onDragStart={(e) => handleDragStart(e, token)}
              className="cursor-grab active:cursor-grabbing"
              title={token.label}
            >
              <TokenImage
                src={token.imageUrl}
                alt={token.label}
                isSignedIn={isSignedIn}
                getFileBlob={getFileBlob}
              />
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 text-sm bg-sky-500 hover:bg-sky-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Token
          </button>
        </div>
      </div>

      <CropImageModal
        imageSrc={selectedFile || ""}
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        onSave={handleCropSave}
      />
    </>
  );
}
