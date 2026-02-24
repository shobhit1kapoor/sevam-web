"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/hooks/useAuthStore";

/**
 * Triggers Zustand persist rehydration on the client.
 * Must be rendered inside the root layout so it runs before any route.
 * Without this, `skipHydration: true` leaves the store empty on first mount,
 * causing layouts to flash-redirect authenticated users to /login.
 */
export function StoreHydrator() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
