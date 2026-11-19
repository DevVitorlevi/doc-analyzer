import { Navigate } from "react-router-dom";
import { useSession } from "./use-session";

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
    </main>
  );
}
