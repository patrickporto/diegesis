import { Editor } from "@/components/Editor";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useYjs } from "@/hooks/useYjs";

function App() {
  const { doc, synced: indexedDbSynced } = useYjs();
  const {
    isSignedIn,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    lastSyncTime,
  } = useGoogleDrive(doc);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/70 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg shadow-lg shadow-sky-500/30 flex items-center justify-center text-white font-bold text-lg">
            D
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Diegesis Notes
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-500 border border-slate-200">
            {indexedDbSynced ? "Offline Ready" : "Initializing..."}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {lastSyncTime && (
            <span className="text-xs text-slate-400">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}

          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => syncWithDrive()}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sync Now
              </button>
              <button
                onClick={handleSignOutClick}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Sign Out
              </button>
              <div className="w-8 h-8 rounded-full bg-sky-100 border-2 border-white shadow-sm flex items-center justify-center text-sky-600 font-bold text-xs">
                G
              </div>
            </div>
          ) : (
            <button
              onClick={handleAuthClick}
              className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Login with Google Drive
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {indexedDbSynced ? (
          <Editor doc={doc} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-4"></div>
            <p>Loading your notes...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
