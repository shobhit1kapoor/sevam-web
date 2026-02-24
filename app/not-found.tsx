import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div>
        <p className="text-7xl font-extrabold text-primary">404</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">Page not found</p>
        <p className="mt-2 text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 bg-[--color-primary-600] text-white hover:bg-[--color-primary-700] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2"
      >
        Go Home
      </Link>
    </main>
  );
}
