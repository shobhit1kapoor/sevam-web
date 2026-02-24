"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getWorkerJobs } from "@/server/actions/workers/worker-dashboard";
import { acceptJob } from "@/server/actions/jobs/job-status";
import { createClient } from "@/lib/db/supabase";
import { Card, CardContent, PageSpinner, Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { JOB_TYPE_META, JOB_STATUS_LABEL, JOB_STATUS_COLOR } from "@/types/job";
import { formatPrice } from "@/lib/utils/pricing";
import type { JobSummary } from "@/types/job";

export default function WorkerJobsPage() {
  const [available, setAvailable] = useState<JobSummary[]>([]);
  const [active,    setActive]    = useState<JobSummary[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWorkerJobs();
      if (result.ok) {
        setAvailable(result.data.available);
        setActive(result.data.active);
      }
    } catch {
      // keep current state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: listen for new PENDING jobs broadcast by workers channel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("worker:newjob")
      .on("broadcast", { event: "NEW_JOB" }, () => { load(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  async function handleAccept(jobId: string) {
    setAccepting(jobId);
    setAcceptError(null);
    const result = await acceptJob(jobId);
    if (result.ok) {
      await load();
    } else {
      setAcceptError(result.error);
    }
    setAccepting(null);
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {acceptError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {acceptError}
        </p>
      )}
      {/* Active jobs */}
      {active.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">My Active Jobs</h2>
          <ul className="space-y-3">
            {active.map((job) => (
              <JobCard key={job.id} job={job} showLink />
            ))}
          </ul>
        </section>
      )}

      {/* Available jobs */}
      <section>
        <h2 className="text-base font-semibold mb-3">
          Available Near You{" "}
          <span className="text-muted font-normal text-sm">
            ({available.length})
          </span>
        </h2>

        {available.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <p className="text-3xl mb-2">🕐</p>
            <p>No new jobs right now. Stay online!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {available.map((job) => (
              <Card key={job.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{JOB_TYPE_META[job.type].icon}</span>
                      <div>
                        <p className="font-semibold">{JOB_TYPE_META[job.type].label}</p>
                        <p className="text-xs text-muted">{job.address}</p>
                      </div>
                    </div>
                    <p className="font-bold text-primary">
                      ~{formatPrice(job.estimatedPrice)}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    isLoading={accepting === job.id}
                    onClick={() => handleAccept(job.id)}
                  >
                    Accept Job
                  </Button>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function JobCard({ job, showLink }: { job: JobSummary; showLink?: boolean }) {
  const meta        = JOB_TYPE_META[job.type];
  const statusColor = JOB_STATUS_COLOR[job.status];

  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <p className="font-semibold text-sm">{meta.label}</p>
              <p className="text-xs text-muted">{job.address}</p>
            </div>
          </div>
          <Badge variant={statusColor}>{JOB_STATUS_LABEL[job.status]}</Badge>
        </div>
        {showLink && (
          <Link href="/active">
            <Button size="sm" variant="outline" className="w-full">View Active Job</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
