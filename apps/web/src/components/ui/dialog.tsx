import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export type DialogOverlayProps = ComponentProps<typeof DialogPrimitive.Overlay>;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-(--z-index-modal-scrim)",
        "bg-(--color-modal-scrim)",
        className,
      )}
      {...props}
    />
  );
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>;

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
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
            "p-4 text-text-primary",
            "shadow-(--shadow-overlay-panel)",
            "outline-none",
          ],
          className,
        )}
        {...props}
      >
        {children}

        <DialogPrimitive.Close
          aria-label="Fechar"
          className={cn([
            "absolute right-2 top-2",
            "inline-flex size-9 items-center justify-center",
            "rounded-md",
            "text-text-secondary",
            "transition-colors duration-(--interaction-transition-duration)",
            "hover:bg-(--color-control-hover)",
            "active:bg-(--color-control-active)",
            "focus-visible:outline-2",
            "focus-visible:outline-offset-2",
            "focus-visible:outline-(--color-primary-action)",
            "motion-reduce:transition-none",
          ])}
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export type DialogHeaderProps = ComponentProps<"div">;

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn("flex min-h-13 items-center gap-4 pb-4 pr-10", className)}
      {...props}
    />
  );
}

export type DialogFooterProps = ComponentProps<"div">;

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
