import { LoaderCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SINGLE_COUNT = 1;
const DESCRIPTION =
  "Esta ação remove o arquivo e a análise e não pode ser desfeita.";
const CANCEL_LABEL = "Cancelar";
const CONFIRM_LABEL = "Excluir";
const DELETING_LABEL = "Excluindo…";

const DISABLED_CLASS = [
  "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed",
  "aria-disabled:opacity-(--disabled-opacity)",
].join(" ");

const DANGER_ACTION_CLASS = [
  "cursor-pointer gap-2",
  "bg-(--color-danger-action) hover:bg-(--color-danger-action)",
  "active:bg-(--color-danger-action) hover:brightness-90 active:brightness-75",
  "focus-visible:outline-(--color-danger-action)",
].join(" ");

function formatTitle(count: number): string {
  return count === SINGLE_COUNT
    ? "Excluir documento?"
    : `Excluir ${count} documentos?`;
}

interface ConfirmDeleteDialogProps {
  open: boolean;
  count: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export default function ConfirmDeleteDialog({
  open,
  count,
  isDeleting,
  onConfirm,
  onOpenChange,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (isDeleting) {
            event.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[length:var(--font-size-dialog-title)] font-medium leading-[var(--line-height-dialog-title)] text-text-primary">
            {formatTitle(count)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-md text-text-secondary">
            {DESCRIPTION}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            aria-disabled={isDeleting}
            className={`cursor-pointer ${DISABLED_CLASS}`}
            onClick={(event) => {
              if (isDeleting) {
                event.preventDefault();
              }
            }}
          >
            {CANCEL_LABEL}
          </AlertDialogCancel>

          <AlertDialogAction
            aria-disabled={isDeleting}
            className={`${DANGER_ACTION_CLASS} ${DISABLED_CLASS}`}
            onClick={(event) => {
              event.preventDefault();

              if (!isDeleting) {
                onConfirm();
              }
            }}
          >
            {isDeleting && (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 shrink-0 motion-safe:animate-spin"
                strokeWidth={2}
              />
            )}
            {isDeleting ? DELETING_LABEL : CONFIRM_LABEL}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
