import { PageSpinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PageSpinner />
    </div>
  );
}
