import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export type DropdownMenuContentProps = ComponentProps<
  typeof DropdownMenuPrimitive.Content
>;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          [
            "z-50 min-w-70 max-w-[calc(100vw-2rem)]",
            "rounded-(--radius-dropdown)",
            "bg-surface-white",
            "p-1",
            "text-text-primary",
            "shadow-(--shadow-overlay-panel)",
            "outline-none",
            "origin-(--radix-dropdown-menu-content-transform-origin)",
            "motion-safe:data-[state=open]:animate-menu-in",
            "motion-safe:data-[state=closed]:animate-menu-out",
          ],
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export type DropdownMenuItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  variant?: "default" | "destructive";
};

export function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        [
          "relative flex min-h-10 w-full cursor-default",
          "select-none items-center gap-2",
          "rounded-(--radius-menu-item)",
          "px-3 py-2 text-sm outline-none",
          "transition-colors duration-(--interaction-transition-duration)",
          "focus:bg-control-secondary",
          "data-disabled:pointer-events-none",
          "data-disabled:opacity-(--disabled-opacity)",
          "motion-reduce:transition-none",
        ],
        variant === "destructive"
          ? "text-(--color-danger-action)"
          : "text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

export type DropdownMenuCheckboxItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.CheckboxItem
>;

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        [
          "relative flex min-h-10 cursor-default select-none",
          "items-center gap-2 rounded-(--radius-menu-item)",
          "py-2 pl-8 pr-3 text-sm outline-none",
          "transition-colors duration-(--interaction-transition-duration)",
          "focus:bg-control-secondary",
          "data-disabled:pointer-events-none",
          "data-disabled:opacity-(--disabled-opacity)",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check size={16} strokeWidth={2} aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export type DropdownMenuRadioItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
>;

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        [
          "relative flex min-h-10 cursor-default select-none",
          "items-center gap-2 rounded-(--radius-menu-item)",
          "py-2 pl-8 pr-3 text-sm outline-none",
          "transition-colors duration-(--interaction-transition-duration)",
          "focus:bg-control-secondary",
          "data-disabled:pointer-events-none",
          "data-disabled:opacity-(--disabled-opacity)",
          "motion-reduce:transition-none",
        ],
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle size={8} fill="currentColor" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export type DropdownMenuLabelProps = ComponentProps<
  typeof DropdownMenuPrimitive.Label
>;

export function DropdownMenuLabel({
  className,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-3 py-2 text-xs font-medium text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

export type DropdownMenuSeparatorProps = ComponentProps<
  typeof DropdownMenuPrimitive.Separator
>;

export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export type DropdownMenuSubTriggerProps = ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
>;

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        [
          "flex min-h-10 cursor-default select-none",
          "items-center gap-2 rounded-(--radius-menu-item)",
          "px-3 py-2 text-sm outline-none",
          "focus:bg-control-secondary",
          "data-[state=open]:bg-control-secondary",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight
        className="ml-auto"
        size={16}
        strokeWidth={2}
        aria-hidden="true"
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export type DropdownMenuSubContentProps = ComponentProps<
  typeof DropdownMenuPrimitive.SubContent
>;

export function DropdownMenuSubContent({
  className,
  ...props
}: DropdownMenuSubContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          [
            "z-50 min-w-45",
            "rounded-(--radius-dropdown)",
            "bg-surface-white p-1",
            "text-text-primary",
            "shadow-(--shadow-overlay-panel)",
            "outline-none",
          ],
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export type DropdownMenuShortcutProps = ComponentProps<"span">;

export function DropdownMenuShortcut({
  className,
  ...props
}: DropdownMenuShortcutProps) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
