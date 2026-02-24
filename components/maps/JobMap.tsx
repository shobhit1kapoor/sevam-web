"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
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
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI:  true,
  zoomControl:       true,
  clickableIcons:    false,
  gestureHandling:   "greedy",
};

export function JobMap({
  center,
  value,
  onChange,
  interactive = true,
  height = "300px",
  className,
}: JobMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [pin, setPin] = useState<LatLng | undefined>(value);

  // Sync pin when the value prop changes externally
  useEffect(() => {
    setPin(value);
  }, [value]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!interactive || !e.latLng) return;
      const latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPin(latlng);
      onChange?.(latlng);
    },
    [interactive, onChange]
  );

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

  return (
    <div style={{ height }} className={className}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", borderRadius: "12px" }}
        center={center ?? pin ?? DEFAULT_CENTER}
        zoom={center || pin ? 15 : 5}
        options={MAP_OPTIONS}
        onLoad={onLoad}
        onClick={handleClick}
      >
        {pin && <Marker position={pin} />}
      </GoogleMap>
    </div>
  );
}
