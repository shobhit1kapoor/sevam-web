"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LazyJobMap as JobMap, MapSkeleton } from "@/components/maps";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { Suspense } from "react";
import { createJob } from "@/server/actions/jobs/create-job";
import { formatPrice } from "@/lib/utils/pricing";
import { estimatePrice } from "@/lib/utils/pricing";
import { JOB_TYPE_META } from "@/types/job";
import type { JobType } from "@/lib/generated/prisma/client";
import type { LatLng } from "@/types/job";

const JOB_TYPE_OPTIONS = Object.entries(JOB_TYPE_META).map(([value, meta]) => ({
  value,
  label: `${meta.icon} ${meta.label}`,
}));

export default function CustomerHomePage() {
  const router = useRouter();

  const [type,        setType]        = useState<JobType | "">("");
  const [description, setDescription] = useState("");
  const [address,     setAddress]     = useState("");
  const [location,    setLocation]    = useState<LatLng | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const estimate = type ? estimatePrice(type as JobType) : null;

  const handleLocationPick = useCallback((latlng: LatLng) => {
    setLocation(latlng);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!type)     return setError("Please select a job type.");
    if (!address)  return setError("Please enter your address.");
    if (!location) return setError("Please pick your location on the map.");
    if (description.length < 10) return setError("Description must be at least 10 characters.");

    setLoading(true);
    const result = await createJob({
      type: type as JobType,
      description,
      address,
      lat: location.lat,
      lng: location.lng,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/jobs`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Book a Service</h1>
        <p className="text-sm text-muted mt-1">Connect with skilled professionals near you</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Job type picker */}
        <Select
          label="Service Type"
          options={JOB_TYPE_OPTIONS}
          placeholder="Choose a service…"
          value={type}
          onChange={(e) => setType(e.target.value as JobType)}
        />

        {/* Description */}
        <Textarea
          label="Describe the problem"
          placeholder="e.g. Leaking pipe under bathroom sink, needs urgent fix…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxChars={500}
          rows={4}
        />

        {/* Address */}
        <Input
          label="Your address"
          placeholder="House no., street, area, city"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={500}
        />

        {/* Map picker */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Pin your location <span className="text-muted">(tap the map)</span>
          </p>
          <MapErrorBoundary>
            <Suspense fallback={<MapSkeleton height={260} />}>
              <JobMap
                value={location ?? undefined}
                onChange={handleLocationPick}
                height="260px"
              />
            </Suspense>
          </MapErrorBoundary>
        </div>

        {/* Price estimate */}
        {estimate && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Estimated Price</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(estimate.total)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>Base: {formatPrice(estimate.base)}</p>
                  {estimate.distanceSurcharge > 0 && (
                    <p>Distance: +{formatPrice(estimate.distanceSurcharge)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="text-sm text-error rounded-lg bg-error/10 px-4 py-3">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={loading}>
          Book Now
        </Button>
      </form>
    </div>
  );
}
