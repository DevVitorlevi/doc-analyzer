import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { ApiError } from "@/lib/http";

import { logout } from "./api";

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error instanceof ApiError ? error.code : "INTERNAL_ERROR",
        ),
      );
    },
  });
}
