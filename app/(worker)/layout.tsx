"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuthStore";
import { PageSpinner } from "@/components/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "Home",     icon: "🏠" },
  { href: "/worker-jobs", label: "Jobs",   icon: "🔧" },
  { href: "/active",    label: "Active",   icon: "▶️" },
  { href: "/earnings",  label: "Earnings", icon: "💰" },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pathname  = usePathname();

  // Redirect non-workers — run in render path for immediate response
  if (!isLoading && (!user || user.userType !== "WORKER")) {
    router.replace("/login");
    return <PageSpinner />;
  }

  if (isLoading || !user) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4">
        <span className="text-lg font-bold text-primary">Sevam</span>
        <span className="ml-2 text-sm text-muted">Worker</span>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-40 border-t border-border bg-surface">
        <ul className="flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                    active ? "text-primary" : "text-muted hover:text-foreground"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
