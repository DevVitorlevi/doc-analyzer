import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteDocument,
  getDocument,
  listDocuments,
  retryDocument,
  uploadDocument,
} from "./api";

export const DOCUMENTS_QUERY_KEY = ["documents"] as const;

export function documentQueryKey(id: string) {
  return ["documents", id] as const;
}

export function useDocuments() {
  return useQuery({
    queryKey: DOCUMENTS_QUERY_KEY,
    queryFn: listDocuments,
  });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: documentQueryKey(id ?? ""),
    queryFn: () => {
      if (id === null) {
        return Promise.reject(new Error("Documento não informado."));
      }

      return getDocument(id);
    },
    enabled: id !== null,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    retry: 0,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  });
}

export function useRetryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryDocument,
    retry: 0,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    retry: 0,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: documentQueryKey(id),
        exact: true,
      });
    },
  });
}
