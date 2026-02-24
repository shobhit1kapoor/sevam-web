"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuthStore";
import { PageSpinner } from "@/components/ui";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const user     = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    } else if (!isLoading && user?.userType === "WORKER") {
      router.replace("/dashboard");
    } else if (!isLoading && user?.userType === "ADMIN") {
      router.replace("/analytics");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top nav */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4">
        <span className="text-lg font-bold text-primary">Sevam</span>
        <span className="ml-2 text-sm text-muted">Customer</span>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
