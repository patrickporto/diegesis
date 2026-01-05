import { FileTree } from "@/components/FileTree";
import { useNotes } from "@/contexts/NotesContext";

interface GoogleUser {
  name: string;
  email: string;
  imageUrl: string;
}

interface AppSidebarProps {
  className?: string;
  user: GoogleUser | null;
  isSignedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onClose?: () => void; // For mobile to close header/drawer
}

export function AppSidebar({
  className = "",
  user,
  isSignedIn,
  onSignIn,
  onSignOut,
  onClose,
}: AppSidebarProps) {
  const { synced } = useNotes();

  return (
    <div
      className={`bg-slate-50 border-r border-slate-200 flex flex-col h-full ${className}`}
    >
      <div className="p-4 border-b border-slate-200 bg-white/50 flex items-center justify-between">
        <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center text-white text-xs">
            D
          </div>
          Diegesis
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <FileTree />
      </div>
      {/* User Profile / Info at bottom of sidebar */}
      <div className="p-4 border-t border-slate-200 bg-white/50 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-2 h-2 rounded-full ${
              synced ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></span>
          <span className="text-xs text-slate-500 font-medium">
            {synced ? "Ready" : "Offline"}
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
              onClick={onSignOut}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold block"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full bg-sky-500 text-white text-xs font-bold py-1.5 rounded hover:bg-sky-600 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
