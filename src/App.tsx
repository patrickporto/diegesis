import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState } from "react";

import { Editor } from "@/components/Editor";
import { Sidebar } from "@/components/Sidebar";
import { NotesProvider, useNotes } from "@/contexts/NotesContext";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
  const { synced: indexedDbSynced, doc } = useNotes();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    isSignedIn,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    lastSyncTime,
    user,
    syncStatus,
  } = useGoogleDrive(doc);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/70 border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-500 rounded-xl shadow-lg shadow-sky-500/30 flex items-center justify-center text-white font-bold text-xl">
              D
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-tight">
                Diegesis Notes
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    indexedDbSynced
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  }`}
                ></span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {indexedDbSynced ? "Offline Active" : "Connecting..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isSignedIn && (
              <button
                onClick={() => syncWithDrive()}
                disabled={syncStatus === "syncing"}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all group"
                title={
                  lastSyncTime
                    ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
                    : "Sync with Drive"
                }
              >
                {getSyncIcon()}
                <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 hidden md:block">
                  {syncStatus === "syncing"
                    ? "Syncing..."
                    : syncStatus === "synced"
                    ? "Synced"
                    : syncStatus === "expired"
                    ? "Session Expired"
                    : "Sync Now"}
                </span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {isSignedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-end hidden md:flex">
                  <span className="text-sm font-bold text-slate-700 leading-none">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none mt-1">
                    {user?.email}
                  </span>
                </div>

                <div className="relative group cursor-pointer">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="w-9 h-9 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-sky-100 border-2 border-white shadow-sm flex items-center justify-center text-sky-600 font-bold">
                      {user?.name?.[0]}
                    </div>
                  )}

                  <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-2 min-w-[140px]">
                      <div className="px-3 py-2 border-b border-slate-50 md:hidden">
                        <p className="text-xs font-bold text-slate-700">
                          {user?.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {user?.email}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOutClick}
                        className="w-full text-left px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-2"
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
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAuthClick}
                className="bg-sky-500 hover:bg-sky-400 text-white px-4 sm:px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-sky-500/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] flex items-center gap-2"
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
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">Connect Google Drive</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}

            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative"
              title="Open Assistant"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM6.97 6.97a.75.75 0 011.06 0l.44.44a.75.75 0 11-1.06 1.06l-.44-.44a.75.75 0 010-1.06zm9.54 0a.75.75 0 011.06 0l.44.44a.75.75 0 11-1.06 1.06l-.44-.44a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {indexedDbSynced ? (
          <Editor />
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-4"></div>
            <p>Loading your notes...</p>
          </div>
        )}
      </main>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
        <AppContent />
      </NotesProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
