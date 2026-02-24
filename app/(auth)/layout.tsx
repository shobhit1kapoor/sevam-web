import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sign In",
    template: "%s | Sevam",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-muted] p-4">
      <div className="w-full max-w-sm animate-fade-in">{children}</div>
    </div>
  );
}
