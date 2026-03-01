/**
 * Lazy-loaded map exports using Next.js dynamic imports.
 *
 * Google Maps components (@react-google-maps/api) are browser-only.
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
import type { ComponentProps } from "react";
import type { JobMap } from "./JobMap";
import type { TrackingMap } from "./TrackingMap";

// ── Shared skeleton ──────────────────────────────────────────────────────────
export function MapSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="w-full rounded-xl bg-muted/40 animate-pulse"
      style={{ height }}
    >
      <span className="sr-only">Loading map…</span>
    </div>
  );
}

// ── JobMap ───────────────────────────────────────────────────────────────────
export const LazyJobMap = dynamic<ComponentProps<typeof JobMap>>(
  () => import("./JobMap").then((m) => m.JobMap),
  {
    ssr:     false,
    loading: () => <MapSkeleton />,
  },
);

// ── TrackingMap ──────────────────────────────────────────────────────────────
export const LazyTrackingMap = dynamic<ComponentProps<typeof TrackingMap>>(
  () => import("./TrackingMap").then((m) => m.TrackingMap),
  {
    ssr:     false,
    loading: () => <MapSkeleton />,
  },
);
