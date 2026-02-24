"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWorkerEarnings } from "@/server/actions/workers/worker-dashboard";
import { setWorkerOnlineStatus } from "@/server/actions/workers/update-location";
import { useAuthStore } from "@/lib/hooks/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, PageSpinner } from "@/components/ui";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils/pricing";
import type { WorkerEarnings } from "@/types/worker";

export default function WorkerDashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const [data,   setData]   = useState<WorkerEarnings | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getWorkerEarnings();
        if (result.ok) {
          setData(result.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleToggleOnline() {
    setToggling(true);
    const next = !online;
    try {
      const result = await setWorkerOnlineStatus(next);
      if (result.ok) setOnline(next);
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <PageSpinner />;

  const stats = data?.stats;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hi, {user?.phone ?? "there"}
          </h1>
          <p className="text-sm text-muted">Ready to work?</p>
        </div>

        {/* Online toggle */}
        <Button
          variant={online ? "default" : "outline"}
          size="sm"
          onClick={handleToggleOnline}
          isLoading={toggling}
        >
          {online ? "🟢 Online" : "⚫ Offline"}
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today"       value={formatPrice(stats?.todayEarnings ?? 0)} />
        <StatCard label="This Week"   value={formatPrice(stats?.weeklyEarnings ?? 0)} />
        <StatCard label="Total Jobs"  value={String(stats?.totalJobs ?? 0)} />
        <StatCard label="Rating"      value={stats ? `⭐ ${stats.rating.toFixed(1)}` : "—"} />
      </div>

      {/* Total earnings */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-muted text-sm">Total Earnings</span>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(stats?.totalEarnings ?? 0)}
          </span>
        </CardContent>
      </Card>

      {/* Quick access */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/worker-jobs">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="py-4 text-center">
              <p className="text-2xl">🔧</p>
              <p className="font-medium mt-1">Available Jobs</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/earnings">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="py-4 text-center">
              <p className="text-2xl">💰</p>
              <p className="font-medium mt-1">Earnings</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-3 text-center">
        <p className="text-xs text-muted mb-0.5">{label}</p>
        <p className="font-bold text-lg">{value}</p>
      </CardContent>
    </Card>
  );
}
