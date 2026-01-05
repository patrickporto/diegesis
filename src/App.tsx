import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";

import { Editor } from "@/components/Editor";
import { FileTree } from "@/components/FileTree";
import { OmniSearch } from "@/components/OmniSearch";
import { Sidebar } from "@/components/Sidebar";
import {
  FileSystemProvider,
  useFileSystem,
} from "@/contexts/FileSystemContext";
import { NotesProvider, useNotes } from "@/contexts/NotesContext";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function MainLayout() {
  const { synced: indexedDbSynced, doc } = useNotes();
  const { activeFileId } = useFileSystem();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const {
    isSignedIn,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    user,
    syncStatus,
  } = useGoogleDrive(doc);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return (
          <svg
            className="animate-spin h-4 w-4 text-sky-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      case "synced":
        return (
          <svg
            className="h-4 w-4 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="h-4 w-4 text-rose-500"
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
        );
      case "expired":
        return (
          <svg
            className="h-4 w-4 text-amber-500 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar: File Explorer */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white/50">
          <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center text-white text-xs">
              D
            </div>
            Diegesis
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FileTree />
        </div>
        {/* User Profile / Info at bottom of sidebar */}
        <div className="p-4 border-t border-slate-200 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`w-2 h-2 rounded-full ${
                indexedDbSynced ? "bg-emerald-500" : "bg-amber-500"
              }`}
            ></span>
            <span className="text-xs text-slate-500 font-medium">
              {indexedDbSynced ? "Ready" : "Offline"}
            </span>
          </div>
          {isSignedIn ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user?.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-xs flex items-center justify-center font-bold">
                    {user?.name?.[0]}
                  </div>
                )}
                <span className="text-xs font-bold truncate">{user?.name}</span>
              </div>
              <button
                onClick={handleSignOutClick}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold block"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleAuthClick}
              className="w-full bg-sky-500 text-white text-xs font-bold py-1.5 rounded hover:bg-sky-600 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Bar (Mobile Toggle + Sync + Actions) */}
        <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              {/* Mobile Menu Toggle (TODO) */}
              <button className="p-1 text-slate-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
            {/* Breadcrumbs or Active File Name */}
            <span className="text-sm font-medium text-slate-600 truncate">
              {/* Breadcrumbs here */}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isSignedIn && (
              <button
                onClick={() => syncWithDrive()}
                disabled={syncStatus === "syncing"}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sync"
              >
                {getSyncIcon()}
              </button>
            )}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Editor Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="max-w-4xl mx-auto h-full px-2 py-4 sm:px-8 sm:py-8">
            {activeFileId ? (
              <Editor />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium">
                  Select a file from the sidebar
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <OmniSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

function App() {
  if (!CLIENT_ID) {
    return <div>Missing VITE_GOOGLE_CLIENT_ID</div>;
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <NotesProvider>
        <FileSystemProvider>
          <MainLayout />
        </FileSystemProvider>
      </NotesProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
