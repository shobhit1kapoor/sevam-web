import type { JobType, JobStatus } from "@/lib/generated/prisma/client";

// Re-export for convenience so app code doesn't import prisma directly
export type { JobType, JobStatus };

export interface LatLng {
  lat: number;
  lng: number;
}

export interface JobLocation extends LatLng {
  address: string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceEstimate {
  base: number;
  distanceSurcharge: number;
  total: number;
  currency: "INR";
}

export interface JobSummary {
  id: string;
  type: JobType;
  status: JobStatus;
  address: string;
  estimatedPrice: number;
  finalPrice: number | null;
  createdAt: Date;
  worker?: {
    name: string | null;
    phone: string;
    rating: number;
    photoUrl: string | null;
  } | null;
}

export interface JobDetails extends JobSummary {
  description: string;
  lat: number;
  lng: number;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  workerLat?: number | null;
  workerLng?: number | null;
  payment?: {
    id: string;
    status: string;
    amount: number;
    razorpayOrderId: string | null;
  } | null;
}

// ─── Job type meta ────────────────────────────────────────────────────────────

export interface JobTypeMeta {
  value: JobType;
  label: string;
  icon: string;
  basePrice: number;
}

export const JOB_TYPE_META: Record<JobType, JobTypeMeta> = {
  PLUMBING:         { value: "PLUMBING",         label: "Plumbing",          icon: "🔧", basePrice: 400 },
  ELECTRICAL:       { value: "ELECTRICAL",       label: "Electrical",        icon: "⚡", basePrice: 450 },
  PAINTING:         { value: "PAINTING",         label: "Painting",          icon: "🖌️", basePrice: 800 },
  CARPENTRY:        { value: "CARPENTRY",        label: "Carpentry",         icon: "🪚", basePrice: 600 },
  CLEANING:         { value: "CLEANING",         label: "Cleaning",          icon: "🧹", basePrice: 350 },
  AC_REPAIR:        { value: "AC_REPAIR",        label: "AC Repair",         icon: "❄️", basePrice: 700 },
  APPLIANCE_REPAIR: { value: "APPLIANCE_REPAIR", label: "Appliance Repair",  icon: "📺", basePrice: 500 },
  OTHER:            { value: "OTHER",            label: "Other",             icon: "🔩", basePrice: 300 },
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  PENDING:     "Looking for worker",
  ACCEPTED:    "Worker assigned",
  IN_PROGRESS: "Work in progress",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
  DISPUTED:    "Under dispute",
};

export const JOB_STATUS_COLOR: Record<JobStatus, "default" | "accent" | "success" | "warning" | "error" | "muted"> = {
  PENDING:     "warning",
  ACCEPTED:    "default",
  IN_PROGRESS: "accent",
  COMPLETED:   "success",
  CANCELLED:   "muted",
  DISPUTED:    "error",
};
