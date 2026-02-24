import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[--color-primary-100] text-[--color-primary-700]",
        accent:
          "bg-[--color-accent-100] text-[--color-accent-700]",
        success:
          "bg-green-100 text-green-700",
        warning:
          "bg-amber-100 text-amber-700",
        error:
          "bg-red-100 text-red-700",
        outline:
          "border border-[--color-border] text-[--color-foreground]",
        muted:
          "bg-[--color-muted] text-[--color-muted-fg]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
