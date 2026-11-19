import { Navigate } from "react-router-dom";

import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/http";

import { useSession } from "./use-session";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 17.9l6.8-5.2Z"
      />
      <path
        fill="#EA4335"
        d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const session = useSession();

  if (session.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p role="status" className="text-sm font-medium text-text-secondary">
          Carregando sessão...
        </p>
      </main>
    );
  }

  if (session.isSuccess) {
    return <Navigate to="/app/documentos" replace />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-112 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-40 size-96 rounded-full bg-primary/5 blur-3xl"
      />

      <section className="relative z-10 w-full max-w-105">
        <div className="rounded-(--radius-container) border border-border bg-surface-white px-6 py-9 shadow-container sm:px-10 sm:py-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex size-24 items-center justify-center overflow-hidden rounded-full borde bg-surface-white p-2 shadow-container">
              <img
                src={logo}
                alt="Jus Digital"
                className="size-full rounded-full object-contain"
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              Doc Analyzer
            </h1>

            <p className="mt-2 text-sm text-text-secondary">
              Análise inteligente de documentos
            </p>
          </div>

          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">
              Entrar
            </h2>

            <p className="mt-3 text-sm leading-3 text-text-secondary">
              Acesse sua conta para continuar no Doc Analyzer.
            </p>
          </div>

          <Button
            type="button"
            className="min-h-12 w-full gap-2 rounded-(--radius-input) border border-border bg-surface-white px-4 text-sm font-semibold text-text-primary shadow-sm enabled:hover:bg-preview enabled:active:bg-control-secondary"
            onClick={() =>
              window.location.assign(`${API_BASE_URL}/auth/google`)
            }
          >
            <GoogleIcon />
            <span>Entrar com Google</span>
          </Button>

          <p className="mt-6 text-center text-xs leading-5 text-text-secondary">
            Entre utilizando sua conta Google.
          </p>
        </div>
      </section>
    </main>
  );
}
