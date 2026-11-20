import { useEffect, useRef } from "react";

import type {
  DocumentListItem,
  DocumentStatus,
} from "@/features/documents/types";
import { notifyProcessingFinished } from "@/features/documents/upload-feedback";

export function useProcessingNotifications(
  items: readonly DocumentListItem[] | undefined,
): void {
  const previousStatuses = useRef<ReadonlyMap<string, DocumentStatus>>(
    new Map(),
  );

  useEffect(() => {
    if (items === undefined) {
      return;
    }

    for (const item of items) {
      if (
        previousStatuses.current.get(item.id) === "PROCESSING" &&
        item.status !== "PROCESSING"
      ) {
        notifyProcessingFinished(item.status);
      }
    }

    previousStatuses.current = new Map(
      items.map((item) => [item.id, item.status] as const),
    );
  }, [items]);
}
