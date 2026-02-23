"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/hooks/useAuthStore";
import { PageSpinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/analytics",  label: "Dashboard", icon: "📊" },
  { href: "/users",      label: "Users",     icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pathname  = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.userType !== "ADMIN")) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.userType !== "ADMIN") return <PageSpinner />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-lg font-bold text-primary">Sevam</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <span className="font-bold text-primary">Sevam Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="border-t border-border bg-surface md:hidden">
          <ul className="flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                      active ? "text-primary" : "text-muted"
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
    </div>
  );
}
