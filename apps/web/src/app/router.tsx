import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import AppShell from "@/components/layout/AppShell";
import RequireAuth from "@/features/auth/RequireAuth";
import LoginPage from "@/features/auth/LoginPage";
import { useSession } from "@/features/auth/use-session";
import DocumentsPage from "@/features/documents/DocumentsPage";
import { ApiError } from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";

function RootRedirect() {
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

  return <Navigate to="/app/documentos" replace />;
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/app/documentos",
            element: <DocumentsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

export const router = createBrowserRouter(appRoutes);
