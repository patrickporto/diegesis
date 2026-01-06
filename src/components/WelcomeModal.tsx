import { useEffect, useState } from "react";

import { useSync } from "@/contexts/SyncContext";

const ONBOARDING_STORAGE_KEY = "diegesis_onboarding_completed";

export function WelcomeModal() {
  const { isSignedIn, handleAuthClick } = useSync();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const onboardingCompleted =
        localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
      // Show if not signed in AND onboarding not completed
      if (!isSignedIn && !onboardingCompleted) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    checkVisibility();

    // We no longer need to observe Yjs settings since it's global localStorage
  }, [isSignedIn]);

  const handleWorkLocally = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleSignIn = () => {
    handleAuthClick();
    // Optimistically hide the modal, though auth flow will eventually trigger isSignedIn update
    // We don't mark onboarding as completed here, assuming signing in is a form of onboarding
    // or we might want to show it again if they sign out and haven't "chosen" work locally explicitly?
    // For now, let's keep it simple. If they sign in, they are "onboarded" into the account flow.
    // But per requirements, "Work Locally" explicitly sets the preference.
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Diegesis
          </h1>
          <p className="text-slate-500 text-lg">
            Your personal knowledge base for RPG campaigns.
          </p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={handleSignIn}
            className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="p-2 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Continue with Google
              </span>
              <span className="text-xs text-slate-500">
                Sync across devices
              </span>
            </div>
          </button>

          <button
            onClick={handleWorkLocally}
            className="w-full group flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 hover:bg-white border-2 border-transparent hover:border-slate-200 rounded-xl transition-all duration-200 hover:shadow-md"
          >
            <div className="p-2 text-slate-400 group-hover:text-slate-600 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                Work Locally
              </span>
              <span className="text-xs text-slate-500">
                Data stays on this device
              </span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 px-8">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
