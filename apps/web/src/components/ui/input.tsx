import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        [
          "flex min-h-14.5 w-full",
          "rounded-(--radius-input)",
          "border border-border",
          "bg-control-secondary",
          "px-4 py-3",
          "text-sm text-text-primary",
          "placeholder:text-text-secondary",
          "transition-colors duration-(--interaction-transition-duration)",
          "focus-visible:outline-2",
          "focus-visible:outline-offset-2",
          "focus-visible:outline-(--color-primary-action)",
          "disabled:cursor-not-allowed",
          "disabled:opacity-(--disabled-opacity)",
          "aria-invalid:border-(--color-danger-action)",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
}
