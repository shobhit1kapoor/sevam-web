"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerJobs } from "@/server/actions/jobs/customer-jobs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import { PageSpinner } from "@/components/ui";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { JOB_TYPE_META, JOB_STATUS_LABEL, JOB_STATUS_COLOR } from "@/types/job";
import { formatPrice } from "@/lib/utils/pricing";
import type { JobSummary } from "@/types/job";
import type { JobStatus } from "@/lib/generated/prisma/client";

const STATUS_TABS: { label: string; value: JobStatus | "ALL" }[] = [
  { label: "All",        value: "ALL" },
  { label: "Active",     value: "IN_PROGRESS" },
  { label: "Pending",    value: "PENDING" },
  { label: "Completed",  value: "COMPLETED" },
  { label: "Cancelled",  value: "CANCELLED" },
];

export default function CustomerJobsPage() {
  const [jobs,       setJobs]   = useState<JobSummary[]>([]);
  const [loading,    setLoading] = useState(true);
  const [activeTab,  setTab]    = useState<JobStatus | "ALL">("ALL");
  const [error,      setError]  = useState<string | null>(null);

  async function load(status?: JobStatus) {
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomerJobs({ status, limit: 30 });
      if (result.ok) {
        setJobs(result.data.jobs);
      } else {
        setJobs([]);
        setError(result.error);
      }
    } catch (err) {
      setJobs([]);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(activeTab === "ALL" ? undefined : activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Jobs</h1>
        <Button size="sm" asChild>
          <Link href="/">+ New Job</Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div
        role="tablist"
        aria-label="Filter jobs by status"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            aria-controls="job-list"
            onClick={() => setTab(tab.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-primary text-white"
                : "bg-surface-2 text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : error ? (
        <div role="alert" aria-live="assertive" className="py-16 text-center text-muted">
          <p className="text-4xl mb-3" aria-hidden="true">⚠️</p>
          <p className="font-medium">Failed to load jobs</p>
          <p className="text-sm mt-1">{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => load(activeTab === "ALL" ? undefined : activeTab)}
          >
            Try again
          </Button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center text-muted">
          <p className="text-4xl mb-3" aria-hidden="true">🔧</p>
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">Book your first service to get started!</p>
        </div>
      ) : (
        <ul id="job-list" role="tabpanel" aria-live="polite" className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobCard({ job }: { job: JobSummary }) {
  const meta        = JOB_TYPE_META[job.type];
  const statusLabel = JOB_STATUS_LABEL[job.status];
  const statusColor = JOB_STATUS_COLOR[job.status];

  const isActive    = ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(job.status);
  const isCompleted = job.status === "COMPLETED";
  const needsPayment = isCompleted && job.finalPrice == null;

  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className="font-semibold">{meta.label}</p>
              <p className="text-xs text-muted">{job.address}</p>
            </div>
          </div>
          <Badge variant={statusColor}>{statusLabel}</Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {new Date(job.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
          <span className="font-medium">
            {job.finalPrice != null
              ? formatPrice(job.finalPrice)
              : `~${formatPrice(job.estimatedPrice)}`}
          </span>
        </div>

        {(isActive || needsPayment) && (
          <div className="flex gap-2 pt-1">
            {isActive && (
              <Button size="sm" variant="outline" className="w-full flex-1" asChild>
                <Link href={`/track/${job.id}`}>Track</Link>
              </Button>
            )}
            {needsPayment && (
              <Button size="sm" className="w-full flex-1" asChild>
                <Link href={`/payment/${job.id}`}>Pay Now</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
