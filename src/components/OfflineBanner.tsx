import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "Back Online" briefly? Or just hide?
      // For now, let's just hide after a small delay to show "Reconnected" if we wanted
      // But simple is better: hide immediately or show success state
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner && isOnline) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out transform ${
        showBanner
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-10 opacity-0 scale-95"
      }`}
    >
      <div
        className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 min-w-[300px] justify-center ${
          isOnline
            ? "bg-emerald-500/90 border-emerald-400 text-white"
            : "bg-slate-900/90 border-slate-700 text-white"
        }`}
      >
        {!isOnline ? (
          <>
            <svg
              className="w-5 h-5 text-rose-400 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <div className="flex flex-col">
              <span className="font-medium text-sm">You are offline</span>
              <span className="text-xs text-slate-300">
                Changes will sync when you reconnect
              </span>
            </div>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-white"
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
            <span className="font-medium text-sm">Back online</span>
          </>
        )}
      </div>
    </div>
  );
}
