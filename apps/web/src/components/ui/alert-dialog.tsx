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
        "fixed inset-0 z-(--z-index-modal-scrim)",
        "bg-(--color-modal-scrim)",
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
            "z-(--z-index-modal)",
            "w-[calc(100%-2rem)] max-w-120",
            "max-h-[calc(100dvh-2rem)] overflow-y-auto",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-(--radius-dialog)",
            "border border-border",
            "bg-surface",
            "p-6 text-text-primary",
            "shadow-(--shadow-overlay-panel)",
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
          "inline-flex min-h-(--button-min-height)",
          "items-center justify-center rounded-(--radius-button)",
          "bg-(--color-primary-action)",
          "px-(--button-padding-x)",
          "text-sm font-semibold text-white",
          "transition-colors duration-(--interaction-transition-duration)",
          "hover:bg-(--color-primary-hover)",
          "active:bg-(--color-primary-active)",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-(--color-primary-action)",
          "disabled:pointer-events-none disabled:opacity-(--disabled-opacity)",
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
          "inline-flex min-h-(--button-min-height)",
          "items-center justify-center rounded-(--radius-button)",
          "bg-control-secondary",
          "px-(--button-padding-x)",
          "text-sm font-semibold text-text-primary",
          "transition-colors duration-(--interaction-transition-duration)",
          "hover:bg-(--color-control-hover)",
          "active:bg-(--color-control-active)",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-(--color-primary-action)",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    />
  );
}
