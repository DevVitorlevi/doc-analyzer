import { Navigate } from "react-router-dom";

import { useSession } from "./use-session";
import { API_BASE_URL } from "@/lib/http";

export default function LoginPage() {
  const session = useSession();

  if (session.isPending) {
    return <p role="status">Carregando sessão...</p>;
  }

  if (session.isSuccess) {
    return <Navigate to="/app/documentos" replace />;
  }

  return (
    <main>
      <h1>Entrar</h1>

      <button
        type="button"
        onClick={() => window.location.assign(`${API_BASE_URL}/auth/google`)}
        className="bg-primary text-surface hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Entrar com Google
      </button>
    </main>
  );
}
