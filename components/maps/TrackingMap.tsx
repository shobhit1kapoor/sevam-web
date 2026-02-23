"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Spinner } from "@/components/ui/spinner";

import { LatLng } from "@/types/job";

export interface TrackingMapProps {
  /** Customer / job location (blue marker) */
  jobLocation: LatLng;
  /** Worker's live location (green marker) — updates externally */
  workerLocation?: LatLng;
  height?: string;
  className?: string;
}

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI:  true,
  zoomControl:       true,
  clickableIcons:    false,
  gestureHandling:   "greedy",
};

const POLYLINE_OPTIONS = {
  strokeColor:   "#3B82F6",
  strokeOpacity: 0.8,
  strokeWeight:  3,
};

// ─── Custom SVG icons ─────────────────────────────────────────────────────────

const JOB_ICON = {
  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z",
  fillColor:    "#EF4444",
  fillOpacity:  1,
  strokeWeight: 0,
  scale:        1.6,
  anchor:       { x: 12, y: 24 } as google.maps.Point,
};

const WORKER_ICON = {
  path: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  fillColor:    "#10B981",
  fillOpacity:  1,
  strokeWeight: 0,
  scale:        1.6,
  anchor:       { x: 12, y: 12 } as google.maps.Point,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TrackingMap({
  jobLocation,
  workerLocation,
  height = "400px",
  className,
}: TrackingMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const prevWorkerRef = useRef<LatLng | undefined>(workerLocation);
  const hasFittedRef  = useRef(false);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  // Pan to worker when location changes
  useEffect(() => {
    if (!map || !workerLocation) return;
    if (
      prevWorkerRef.current?.lat === workerLocation.lat &&
      prevWorkerRef.current?.lng === workerLocation.lng
    )
      return;

    prevWorkerRef.current = workerLocation;
    map.panTo(workerLocation);
  }, [map, workerLocation]);

  // Fit bounds once when map + both markers are first available
  useEffect(() => {
    if (!map || !workerLocation || hasFittedRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(jobLocation);
    bounds.extend(workerLocation);
    map.fitBounds(bounds, /* padding */ 60);
    hasFittedRef.current = true;
  }, [map, jobLocation, workerLocation]);

  if (loadError || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl bg-surface-2 text-muted text-sm"
      >
        Map unavailable
      </div>
    );
 }

  if (!isLoaded) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl bg-surface-2"
      >
        <Spinner size="md" />
      </div>
    );
  }

  const polylinePath = workerLocation ? [workerLocation, jobLocation] : [];

  return (
    <div style={{ height }} className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", borderRadius: "12px" }}
        center={workerLocation ?? jobLocation}
        zoom={14}
        options={MAP_OPTIONS}
        onLoad={onLoad}
      >
        {/* Job / destination marker */}
        <Marker position={jobLocation} icon={JOB_ICON} title="Job location" />

        {/* Worker marker */}
        {workerLocation && (
          <Marker position={workerLocation} icon={WORKER_ICON} title="Worker location" />
        )}

        {/* Line between worker and job */}
        {polylinePath.length === 2 && (
          <Polyline path={polylinePath} options={POLYLINE_OPTIONS} />
        )}
      </GoogleMap>
    </div>
  );
}
