"use client";

import { useEffect, useState, useCallback } from "react";
import { getWorkers, getCustomers, type WorkerRow, type CustomerRow } from "@/server/actions/admin/get-users";
import { setWorkerApproval } from "@/server/actions/admin/get-analytics";
import { Card, CardContent, Button, PageSpinner } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type Tab = "WORKERS_PENDING" | "WORKERS_ALL" | "CUSTOMERS";

export default function AdminUsersPage() {
  const [tab,       setTab]       = useState<Tab>("WORKERS_PENDING");
  const [workers,   setWorkers]   = useState<WorkerRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [actingId,  setActingId]  = useState<string | null>(null);
  const [actingAction, setActingAction] = useState<"approve" | "reject" | null>(null);

  const loadWorkers = useCallback(async (filter: "ALL" | "PENDING") => {
    setLoading(true);
    const result = await getWorkers(filter);
    if (result.ok) setWorkers(result.data.workers);
    setLoading(false);
  }, []);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const result = await getCustomers();
    if (result.ok) setCustomers(result.data.customers);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "WORKERS_PENDING") loadWorkers("PENDING");
    else if (tab === "WORKERS_ALL") loadWorkers("ALL");
    else loadCustomers();
  }, [tab, loadWorkers, loadCustomers]);

  async function handleApproval(workerId: string, approve: boolean) {
    setActingId(workerId);
    setActingAction(approve ? "approve" : "reject");
    try {
      const result = await setWorkerApproval(workerId, approve);
      if (result.ok) {
        if (tab === "WORKERS_PENDING") await loadWorkers("PENDING");
        else await loadWorkers("ALL");
      }
    } finally {
      setActingId(null);
      setActingAction(null);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "WORKERS_PENDING", label: "Pending Workers" },
    { key: "WORKERS_ALL",     label: "All Workers" },
    { key: "CUSTOMERS",       label: "Customers" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">User Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-4 pb-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : tab === "CUSTOMERS" ? (
        <CustomersTable customers={customers} />
      ) : (
        <WorkersTable
          workers={workers}
          showApproval={tab === "WORKERS_PENDING"}
          actingId={actingId}
          actingAction={actingAction}
          onApprove={(id)  => handleApproval(id, true)}
          onReject={(id)   => handleApproval(id, false)}
        />
      )}
    </div>
  );
}

// ─── Workers table ────────────────────────────────────────────────────────────

function WorkersTable({
  workers, showApproval, actingId, actingAction, onApprove, onReject,
}: {
  workers: WorkerRow[];
  showApproval: boolean;
  actingId: string | null;
  actingAction: "approve" | "reject" | null;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  if (workers.length === 0) {
    return <EmptyState message="No workers found." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            <th className="px-4 py-3 font-medium text-muted">Worker</th>
            <th className="px-4 py-3 font-medium text-muted hidden md:table-cell">Skills</th>
            <th className="px-4 py-3 font-medium text-muted text-center">Rating</th>
            <th className="px-4 py-3 font-medium text-muted text-center">Jobs</th>
            <th className="px-4 py-3 font-medium text-muted text-center">Status</th>
            {showApproval && <th className="px-4 py-3 font-medium text-muted text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.workerId} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3">
                <p className="font-medium">{w.name ?? "—"}</p>
                <p className="text-xs text-muted">{w.phone}</p>
                <p className="text-xs text-muted hidden md:block">
                  Joined {new Date(w.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {w.skills.map((s) => (
                    <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-center">⭐ {w.rating.toFixed(1)}</td>
              <td className="px-4 py-3 text-center">{w.totalJobs}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Badge variant={w.isApproved ? "success" : "warning"}>
                    {w.isApproved ? "Approved" : "Pending"}
                  </Badge>
                  {w.isOnline && <Badge variant="accent">Online</Badge>}
                </div>
              </td>
              {showApproval && (
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      isLoading={actingId === w.workerId}
                      onClick={() => onApprove(w.workerId)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      isLoading={actingId === w.workerId}
                      onClick={() => onReject(w.workerId)}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Customers table ──────────────────────────────────────────────────────────

function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  if (customers.length === 0) return <EmptyState message="No customers yet." />;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            <th className="px-4 py-3 font-medium text-muted">Customer</th>
            <th className="px-4 py-3 font-medium text-muted text-center">Jobs</th>
            <th className="px-4 py-3 font-medium text-muted hidden md:table-cell">Joined</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3">
                <p className="font-medium">{c.name ?? "—"}</p>
                <p className="text-xs text-muted">{c.phone}</p>
              </td>
              <td className="px-4 py-3 text-center">{c.totalJobs}</td>
              <td className="px-4 py-3 hidden md:table-cell text-muted">
                {new Date(c.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-muted">
      <p className="text-4xl mb-3">📭</p>
      <p>{message}</p>
    </div>
  );
}
