"use client";

import { useEffect, useState } from "react";
import { getAnalytics, type AnalyticsSummary } from "@/server/actions/admin/get-analytics";
import { getWorkers, type WorkerRow } from "@/server/actions/admin/get-users";
import { listDisputes } from "@/server/actions/disputes/dispute-actions";
import { resolveDispute } from "@/server/actions/disputes/dispute-actions";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, PageSpinner, Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/pricing";

// Combined analytics + live activity panel
export default function AdminAnalyticsPage() {
  const [data,     setData]     = useState<AnalyticsSummary | null>(null);
  const [disputes, setDisputes] = useState<Awaited<ReturnType<typeof fetchDisputes>>>([]);
  const [pending,  setPending]  = useState<WorkerRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    const [aRes, dRes, wRes] = await Promise.all([
      getAnalytics(),
      fetchDisputes(),
      getWorkers("PENDING"),
    ]);
    if (aRes.ok) setData(aRes.data);
    setDisputes(dRes);
    if (wRes.ok) setPending(wRes.data.workers);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(id: string) {
    setResolving(id);
    try {
      const result = await resolveDispute(id, "Resolved by admin after review.");
      if (result.ok) {
        setDisputes((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setResolving(null);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Analytics & Live Activity</h1>

      {/* Quick stats */}
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Revenue"    value={formatPrice(data.totalRevenue)}  />
          <StatCard label="Total Jobs"       value={String(data.totalJobs)}          />
          <StatCard label="Online Workers"   value={String(data.activeWorkers)}      />
          <StatCard label="Open Disputes"    value={String(data.activeDisputes)}     />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Open disputes */}
        <Card>
          <CardHeader><CardTitle>Open Disputes ({disputes.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {disputes.length === 0 ? (
              <p className="text-muted text-sm py-4 text-center">No open disputes 🎉</p>
            ) : (
              disputes.map((d) => (
                <div key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {d.job.type.replace(/_/g, " ")} — {d.job.address.slice(0, 40)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {d.raisedBy.name ?? d.raisedBy.phone}
                      </p>
                    </div>
                    <Badge variant="error">Open</Badge>
                  </div>
                  <p className="text-xs text-foreground bg-surface-2 rounded p-2">{d.reason}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={resolving === d.id}
                    onClick={() => handleResolve(d.id)}
                  >
                    Mark Resolved
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending worker approvals */}
        <Card>
          <CardHeader><CardTitle>Pending Approvals ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-muted text-sm py-4 text-center">All workers approved ✅</p>
            ) : (
              pending.slice(0, 5).map((w) => (
                <div key={w.workerId} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{w.name ?? w.phone}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {s.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link href="/users">
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function fetchDisputes() {
  const result = await listDisputes("OPEN");
  return result.ok ? result.data.disputes : [];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
