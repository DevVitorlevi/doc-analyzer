import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export type AlertDialogOverlayProps = ComponentProps<
  typeof AlertDialogPrimitive.Overlay
>;

export function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-[var(--z-index-modal-scrim)]",
        "bg-[var(--color-modal-scrim)]",
        className,
      )}
      {...props}
    />
  );
}

export type AlertDialogContentProps = ComponentProps<
  typeof AlertDialogPrimitive.Content
>;

export function AlertDialogContent({
  className,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />

      <AlertDialogPrimitive.Content
        className={cn(
          [
            "fixed left-1/2 top-1/2",
            "z-[var(--z-index-modal)]",
            "w-[calc(100%-2rem)] max-w-[480px]",
            "max-h-[calc(100dvh-2rem)] overflow-y-auto",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius-dialog)]",
            "border border-[var(--color-border)]",
            "bg-[var(--color-surface)]",
            "p-6 text-[var(--color-text-primary)]",
            "shadow-[var(--shadow-overlay-panel)]",
            "outline-none",
          ],
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export type AlertDialogHeaderProps = ComponentProps<"div">;

export function AlertDialogHeader({
  className,
  ...props
}: AlertDialogHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

export type AlertDialogFooterProps = ComponentProps<"div">;

export function AlertDialogFooter({
  className,
  ...props
}: AlertDialogFooterProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;

export type AlertDialogActionProps = ComponentProps<
  typeof AlertDialogPrimitive.Action
>;

export function AlertDialogAction({
  className,
  ...props
}: AlertDialogActionProps) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(
        [
          "inline-flex min-h-[var(--button-min-height)]",
          "items-center justify-center rounded-[var(--radius-button)]",
          "bg-[var(--color-primary-action)]",
          "px-[var(--button-padding-x)]",
          "text-sm font-semibold text-white",
          "transition-colors duration-[var(--interaction-transition-duration)]",
          "hover:bg-[var(--color-primary-hover)]",
          "active:bg-[var(--color-primary-active)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[var(--color-primary-action)]",
          "disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
}

export type AlertDialogCancelProps = ComponentProps<
  typeof AlertDialogPrimitive.Cancel
>;

export function AlertDialogCancel({
  className,
  ...props
}: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(
        [
          "inline-flex min-h-[var(--button-min-height)]",
          "items-center justify-center rounded-[var(--radius-button)]",
          "bg-[var(--color-control-secondary)]",
          "px-[var(--button-padding-x)]",
          "text-sm font-semibold text-[var(--color-text-primary)]",
          "transition-colors duration-[var(--interaction-transition-duration)]",
          "hover:bg-[var(--color-control-hover)]",
          "active:bg-[var(--color-control-active)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[var(--color-primary-action)]",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
}
