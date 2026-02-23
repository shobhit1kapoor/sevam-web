"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/db/supabase";
import { getJobDetails } from "@/server/actions/jobs/customer-jobs";
import { TrackingMap } from "@/components/maps/TrackingMap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSpinner } from "@/components/ui";
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR } from "@/types/job";
import { formatPrice } from "@/lib/utils/pricing";
import type { JobDetails } from "@/types/job";
import type { LatLng } from "@/types/job";

export default function TrackJobPage() {
  const { id }    = useParams<{ id: string }>();
  const [job,       setJob]       = useState<JobDetails | null>(null);
  const [worker,    setWorker]    = useState<LatLng | undefined>(undefined);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch job
  const load = useCallback(async () => {
    setLoadError(null);
    const result = await getJobDetails(id);
    if (result.ok) {
      setJob(result.data);
      if (result.data.workerLat != null && result.data.workerLng != null) {
        setWorker({ lat: result.data.workerLat, lng: result.data.workerLng });
      }
    } else {
      setLoadError(result.error ?? "Failed to load job");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Realtime worker location
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`job:${id}`)
      .on("broadcast", { event: "WORKER_LOCATION" }, ({ payload }: { payload: Record<string, unknown> }) => {
        if (payload?.lat != null && payload?.lng != null) {
          setWorker({ lat: payload.lat as number, lng: payload.lng as number });
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <PageSpinner />;

  if (loadError || !job) {
    return (
      <div className="py-20 text-center text-muted">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-medium">Failed to load job</p>
        <p className="text-sm mt-1">{loadError}</p>
      </div>
    );
  }

  const isPending = job.status === "PENDING";
  const isActive  = ["ACCEPTED", "IN_PROGRESS"].includes(job.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Track Job</h1>
        <Badge variant={JOB_STATUS_COLOR[job.status]}>
          {JOB_STATUS_LABEL[job.status]}
        </Badge>
      </div>

      {/* Map */}
      <TrackingMap
        jobLocation={{ lat: job.lat, lng: job.lng }}
        workerLocation={worker}
        height="320px"
      />

      {/* Job info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted">Address:</span> {job.address}</p>
          <p><span className="text-muted">Description:</span> {job.description}</p>
          <p>
            <span className="text-muted">Price:</span>{" "}
            {job.finalPrice ? formatPrice(job.finalPrice) : `~${formatPrice(job.estimatedPrice)}`}
          </p>
        </CardContent>
      </Card>

      {/* Worker info */}
      {job.worker && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Worker</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {job.worker.photoUrl ? (
              <img
                src={job.worker.photoUrl}
                alt={job.worker.name ?? "Worker"}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {(job.worker.name ?? "W").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{job.worker.name ?? "Worker"}</p>
              <p className="text-sm text-muted">⭐ {job.worker.rating.toFixed(1)}</p>
              {isActive && (
                <a href={`tel:${job.worker.phone}`} className="text-sm text-primary underline">
                  {job.worker.phone}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary text-center">
          Looking for a worker near you…
        </p>
      )}
    </div>
  );
}
