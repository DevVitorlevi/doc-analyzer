import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getErrorMessage, type ProcessingErrorCode } from "@/lib/errors";

const RETRY_LABEL = "Tentar novamente";
const RETRYING_LABEL = "Analisando…";

const RETRY_BUTTON_CLASS = [
  "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed",
  "aria-disabled:opacity-(--disabled-opacity) cursor-pointer font-light",
].join(" ");

interface AnalysisFailureBlockProps {
  errorCode: ProcessingErrorCode | null;
  isRetrying: boolean;
  onRetry: () => void;
}

export default function AnalysisFailureBlock({
  errorCode,
  isRetrying,
  onRetry,
}: AnalysisFailureBlockProps) {
  return (
    <div
      role="alert"
      aria-busy={isRetrying}
      className="flex flex-col items-start gap-(--space-12) rounded-(--radius-input) bg-control-secondary px-4 py-3"
    >
      <p className="text-md text-(color:--color-danger-action)">
        {getErrorMessage(errorCode ?? "INTERNAL_ERROR")}
      </p>

      <Button
        type="button"
        aria-disabled={isRetrying}
        className={RETRY_BUTTON_CLASS}
        onClick={() => {
          if (!isRetrying) {
            onRetry();
          }
        }}
      >
        {isRetrying && (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 shrink-0 motion-safe:animate-spin"
            strokeWidth={2}
          />
        )}
        {isRetrying ? RETRYING_LABEL : RETRY_LABEL}
      </Button>
    </div>
  );
}
