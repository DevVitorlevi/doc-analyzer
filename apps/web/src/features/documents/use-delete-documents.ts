import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { ApiError } from "@/lib/http";

import { DOCUMENTS_QUERY_KEY, useDeleteDocument } from "./queries";

const NOT_FOUND_STATUS = 404;
const UNAUTHORIZED_STATUS = 401;

export interface DeleteReport {
  total: number;
  deletedIds: string[];
  failedIds: string[];
  firstError: unknown;
  sessionExpired: boolean;
}

function hasStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

export function useDeleteDocuments() {
  const queryClient = useQueryClient();
  const { mutateAsync } = useDeleteDocument();
  const runningRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteDocuments(
    ids: readonly string[],
  ): Promise<DeleteReport | null> {
    if (runningRef.current || ids.length === 0) {
      return null;
    }

    runningRef.current = true;
    setIsDeleting(true);

    const deletedIds: string[] = [];
    let firstError: unknown = null;
    let sessionExpired = false;

    try {
      for (const id of ids) {
        try {
          await mutateAsync(id);
          deletedIds.push(id);
        } catch (error) {
          if (hasStatus(error, NOT_FOUND_STATUS)) {
            deletedIds.push(id);
            continue;
          }

          if (firstError === null) {
            firstError = error;
          }

          if (hasStatus(error, UNAUTHORIZED_STATUS)) {
            sessionExpired = true;
            break;
          }
        }
      }
    } finally {
      runningRef.current = false;
      setIsDeleting(false);
    }

    const deletedSet = new Set(deletedIds);

    if (!sessionExpired) {
      void queryClient.invalidateQueries({
        queryKey: DOCUMENTS_QUERY_KEY,
        exact: true,
      });
    }

    return {
      total: ids.length,
      deletedIds,
      failedIds: ids.filter((id) => !deletedSet.has(id)),
      firstError,
      sessionExpired,
    };
  }

  return { deleteDocuments, isDeleting };
}
