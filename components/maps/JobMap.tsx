"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Spinner } from "@/components/ui/spinner";

import { LatLng } from "@/types/job";

export interface JobMapProps {
  /** Initial centre of the map */
  center?: LatLng;
  /** If provided, the map shows this pin (non-interactive) */
  value?: LatLng;
  /** Called when user clicks the map to pick a new location */
  onChange?: (latlng: LatLng) => void;
  /** Whether clicking the map moves the pin */
  interactive?: boolean;
  height?: string;
  className?: string;
}

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }; // India centre
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export function JobMap({
  center,
  value,
  onChange,
  interactive = true,
  height = "300px",
  className,
}: JobMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [pin, setPin] = useState<LatLng | undefined>(value);
  const [isLoaded, setIsLoaded] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Sync pin when the value prop changes externally
  useEffect(() => {
    setPin(value);
  }, [value]);

  const handleClick = useCallback(
    (latlng: LatLng) => {
      if (!interactive) return;
      setPin(latlng);
      onChange?.(latlng);
    },
    [interactive, onChange]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter = center ?? pin ?? DEFAULT_CENTER;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: center || pin ? 15 : 5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setIsLoaded(true));

    map.on("click", (e) => {
      handleClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [center, handleClick, mapboxToken, pin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pin) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      return;
    }

    markerRef.current.setLngLat([pin.lng, pin.lat]);
  }, [pin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.setCenter([center.lng, center.lat]);
    if (map.getZoom() < 12) map.setZoom(15);
  }, [center]);

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
