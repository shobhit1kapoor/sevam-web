"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getWorkerJobs } from "@/server/actions/workers/worker-dashboard";
import { startJob, completeJob } from "@/server/actions/jobs/job-status";
import { updateWorkerLocation } from "@/server/actions/workers/update-location";
import { Card, CardContent, CardHeader, CardTitle, Button, PageSpinner } from "@/components/ui";
import { JOB_TYPE_META, JOB_STATUS_LABEL } from "@/types/job";
import { formatPrice } from "@/lib/utils/pricing";
import type { JobSummary } from "@/types/job";

export default function ActiveJobPage() {
  const [job,      setJob]      = useState<JobSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const result = await getWorkerJobs();
    if (result.ok) {
      setJob(result.data.active[0] ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // GPS tracking — only while job is IN_PROGRESS
  useEffect(() => {
    if (!job || job.status !== "IN_PROGRESS") return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        updateWorkerLocation(pos.coords.latitude, pos.coords.longitude).catch(
          (e) => console.warn("[GPS]", e)
        );
      },
      (err) => console.warn("[GPS error]", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [job?.id, job?.status]);

  async function handleStart() {
    if (!job) return;
    setActing(true);
    setError(null);
    const result = await startJob(job.id);
    if (result.ok) await load();
    else setError(result.error);
    setActing(false);
  }

  async function handleComplete() {
    if (!job) return;
    setActing(true);
    setError(null);
    const result = await completeJob(job.id);
    if (result.ok) {
      setJob(null);
    } else {
      setError(result.error);
    }
    setActing(false);
  }

  if (loading) return <PageSpinner />;

  if (!job) {
    return (
      <div className="py-20 text-center text-muted">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-medium">No active job</p>
        <p className="text-sm mt-1">Accept a job from the Jobs tab</p>
      </div>
    );
  }

  const meta      = JOB_TYPE_META[job.type];
  const isAccepted = job.status === "ACCEPTED";
  const isInProgress = job.status === "IN_PROGRESS";

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-foreground">Active Job</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Status"  value={JOB_STATUS_LABEL[job.status]} />
          <Row label="Address" value={job.address} />
          <Row label="Price"   value={`~${formatPrice(job.estimatedPrice)}`} />
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div className="space-y-3">
        {isAccepted && (
          <Button className="w-full" size="lg" onClick={handleStart} isLoading={acting}>
            ▶ Start Job
          </Button>
        )}
        {isInProgress && (
          <Button className="w-full" size="lg" onClick={handleComplete} isLoading={acting}>
            ✅ Mark as Complete
          </Button>
        )}
      </div>

      {isInProgress && (
        <p className="text-xs text-center text-muted">
          Your location is being shared with the customer
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
