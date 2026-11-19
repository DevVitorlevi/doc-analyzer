import { Navigate, Outlet } from "react-router-dom";
import { ApiError } from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "./use-session";

export default function RequireAuth() {
  const session = useSession();

  if (session.isPending) {
    return <p role="status">Carregando sessão...</p>;
  }

  if (session.isError) {
    if (session.error instanceof ApiError && session.error.status === 401) {
      return <Navigate to="/login" replace />;
    }

    return (
      <p role="alert">
        {getErrorMessage(
          session.error instanceof ApiError
            ? session.error.code
            : "INTERNAL_ERROR",
        )}
      </p>
    );
  }

  return <Outlet />;
}
