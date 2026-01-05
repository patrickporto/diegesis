import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { Editor } from "@/components/Editor";
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
  const { doc } = useNotes();
  const { activeFileId } = useFileSystem();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`relative w-72 h-full bg-white shadow-xl transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AppSidebar
            isSignedIn={isSignedIn}
            user={user}
            onSignIn={handleAuthClick}
            onSignOut={handleSignOutClick}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </div>

      {/* Desktop Sidebar: File Explorer */}
      <div className="hidden md:flex w-64 h-full shrink-0">
        <AppSidebar
          className="w-full"
          isSignedIn={isSignedIn}
          user={user}
          onSignIn={handleAuthClick}
          onSignOut={handleSignOutClick}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Bar (Mobile Toggle + Sync + Actions) */}
        <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <button
                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                onClick={() => setIsMobileMenuOpen(true)}
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
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
