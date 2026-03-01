import type { JobType, JobStatus, CancelledBy } from "@/lib/generated/prisma/client";
import type { PriceEstimateV2 } from "@/lib/utils/pricing";

// Re-export for convenience so app code doesn't import prisma directly
export type { JobType, JobStatus, CancelledBy };

// Re-export V2 pricing type (extends PriceEstimate with surge + rating fields)
export type { PriceEstimateV2 };

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

// ─── Review ───────────────────────────────────────────────────────────────────

export interface JobReviewSummary {
  id:           string;
  rating:       number;
  comment:      string | null;
  customerName: string | null;
  createdAt:    Date;
}

/** Star rating display helper — returns an array of "full" | "half" | "empty" */
export function ratingStars(rating: number): Array<"full" | "half" | "empty"> {
  return Array.from({ length: 5 }, (_, i) => {
    if (rating >= i + 1) return "full";
    if (rating >= i + 0.5) return "half";
    return "empty";
  });
}

