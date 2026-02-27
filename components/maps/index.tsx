/**
 * Lazy-loaded map exports using Next.js dynamic imports.
 *
 * Map libraries (Leaflet, Mapbox, etc.) are large and browser-only.
 * Dynamic imports ensure they are excluded from the server bundle and only
 * loaded when the component is actually rendered on the client.
 *
 * Usage (instead of directly importing JobMap / TrackingMap):
 *
 *   import { LazyJobMap, LazyTrackingMap } from "@/components/maps";
 *   import { MapErrorBoundary } from "@/components/MapErrorBoundary";
 *   import { Suspense } from "react";
 *
 *   <MapErrorBoundary>
 *     <Suspense fallback={<MapSkeleton />}>
 *       <LazyJobMap ... />
 *     </Suspense>
 *   </MapErrorBoundary>
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// ── Shared skeleton ──────────────────────────────────────────────────────────
export function MapSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading map…"
      className="w-full rounded-xl bg-muted/40 animate-pulse"
      style={{ height }}
    />
  );
}

// ── JobMap ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyJobMap: ComponentType<any> = dynamic(
  () => import("./JobMap").then((m) => m.JobMap),
  {
    ssr:     false,
    loading: () => <MapSkeleton />,
  },
);

// ── TrackingMap ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LazyTrackingMap: ComponentType<any> = dynamic(
  () => import("./TrackingMap").then((m) => m.TrackingMap),
  {
    ssr:     false,
    loading: () => <MapSkeleton />,
  },
);
