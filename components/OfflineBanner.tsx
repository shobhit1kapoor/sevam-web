"use client";

import { useState, useEffect } from "react";

/**
 * Banner that appears at the top of the page when the device goes offline,
 * and disappears once the connection is restored.
 *
 * Usage: add <OfflineBanner /> inside the root layout or any layout component.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    // Initialise from current navigator state (not available during SSR)
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      // Show "reconnected" banner briefly, then hide it.
      const t = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(t);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium",
        "transition-all duration-300",
        isOffline
          ? "bg-red-600 text-white"
          : "bg-green-600 text-white",
      ].join(" ")}
    >
      {isOffline
        ? "⚠️ You're offline — some features may not be available."
        : "✅ Back online!"}
    </div>
  );
}
