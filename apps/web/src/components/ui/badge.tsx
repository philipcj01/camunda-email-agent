import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const variants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-foreground)] text-[var(--color-background)] border-transparent",
        secondary:
          "bg-[var(--color-muted)] text-[var(--color-foreground)] border-[var(--color-border)]",
        outline:
          "bg-transparent text-[var(--color-muted-foreground)] border-[var(--color-border-strong)]",
        success:
          "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        warning:
          "bg-amber-500/10 text-amber-500 border-amber-500/30",
        destructive:
          "bg-rose-500/10 text-rose-500 border-rose-500/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof variants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(variants({ variant }), className)} {...props} />
);
