"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
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

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const ROUTE_SOURCE_ID = "worker-route";
const ROUTE_LAYER_ID = "worker-route-line";

function markerElement(color: string) {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "9999px";
  el.style.backgroundColor = color;
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.15)";
  return el;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrackingMap({
  jobLocation,
  workerLocation,
  height = "400px",
  className,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const workerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [isLoaded, setIsLoaded] = useState(false);
  const prevWorkerRef = useRef<LatLng | undefined>(workerLocation);
  const hasFittedRef  = useRef(false);

  const upsertRoute = useCallback((map: mapboxgl.Map, path: [number, number][]) => {
    const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    const geojson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: path,
      },
      properties: {},
    } as const;

    if (source) {
      source.setData(geojson);
      return;
    }

    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: geojson,
    });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      paint: {
        "line-color": "#3b82f6",
        "line-width": 3,
        "line-opacity": 0.8,
      },
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [jobLocation.lng, jobLocation.lat],
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      setIsLoaded(true);

      jobMarkerRef.current = new mapboxgl.Marker({ element: markerElement("#ef4444") })
        .setLngLat([jobLocation.lng, jobLocation.lat])
        .addTo(map);

      if (workerLocation) {
        workerMarkerRef.current = new mapboxgl.Marker({ element: markerElement("#10b981") })
          .setLngLat([workerLocation.lng, workerLocation.lat])
          .addTo(map);
        upsertRoute(map, [
          [workerLocation.lng, workerLocation.lat],
          [jobLocation.lng, jobLocation.lat],
        ]);
      }
    });

    mapRef.current = map;

    return () => {
      jobMarkerRef.current?.remove();
      workerMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      jobMarkerRef.current = null;
      workerMarkerRef.current = null;
    };
  }, [jobLocation.lat, jobLocation.lng, mapboxToken, upsertRoute, workerLocation]);

  // Pan to worker when location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !workerLocation) return;

    if (!workerMarkerRef.current) {
      workerMarkerRef.current = new mapboxgl.Marker({ element: markerElement("#10b981") })
        .setLngLat([workerLocation.lng, workerLocation.lat])
        .addTo(map);
    }

    if (
      prevWorkerRef.current?.lat === workerLocation.lat &&
      prevWorkerRef.current?.lng === workerLocation.lng
    )
      return;

    prevWorkerRef.current = workerLocation;
    workerMarkerRef.current.setLngLat([workerLocation.lng, workerLocation.lat]);
    map.panTo([workerLocation.lng, workerLocation.lat]);

    upsertRoute(map, [
      [workerLocation.lng, workerLocation.lat],
      [jobLocation.lng, jobLocation.lat],
    ]);
  }, [jobLocation.lat, jobLocation.lng, upsertRoute, workerLocation]);

  // Keep job marker synced if job location changes
  useEffect(() => {
    if (!jobMarkerRef.current) return;
    jobMarkerRef.current.setLngLat([jobLocation.lng, jobLocation.lat]);
  }, [jobLocation]);

  // Fit bounds once when map + both markers are first available
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !workerLocation || hasFittedRef.current) return;

    const bounds = new mapboxgl.LngLatBounds(
      [jobLocation.lng, jobLocation.lat],
      [jobLocation.lng, jobLocation.lat]
    );
    bounds.extend([workerLocation.lng, workerLocation.lat]);
    map.fitBounds(bounds, { padding: 60 });
    hasFittedRef.current = true;
  }, [jobLocation, workerLocation]);

  if (!mapboxToken) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl bg-surface-2 text-muted text-sm"
      >
        Map unavailable
      </div>
    );
 }

  return (
    <div style={{ height }} className={`relative ${className ?? ""}`}>
      <div ref={mapContainerRef} className="h-full w-full rounded-xl" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface-2">
          <Spinner size="md" />
        </div>
      )}
    </div>
  );
}
