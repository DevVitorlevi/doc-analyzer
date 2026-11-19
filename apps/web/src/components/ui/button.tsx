import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-[var(--radius-button)]",
    "text-sm font-semibold leading-5",
    "transition-colors duration-[var(--interaction-transition-duration)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-[var(--color-primary-action)]",
    "disabled:pointer-events-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-[var(--disabled-opacity)]",
    "motion-reduce:transition-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--color-primary-action)] text-white",
          "enabled:hover:bg-[var(--color-primary-hover)]",
          "enabled:active:bg-[var(--color-primary-active)]",
        ],
        secondary: [
          "bg-[var(--color-control-secondary)]",
          "text-[var(--color-text-primary)]",
          "enabled:hover:bg-[var(--color-control-hover)]",
          "enabled:active:bg-[var(--color-control-active)]",
        ],
      },
      size: {
        default:
          "min-h-[var(--button-min-height)] px-[var(--button-padding-x)]",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
