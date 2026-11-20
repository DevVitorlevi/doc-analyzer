import { Outlet } from "react-router-dom";

import { useLogout } from "@/features/auth/use-logout";
import { useSession } from "@/features/auth/use-session";

import Sidebar from "./Sidebar";

export default function AppShell() {
  const session = useSession();
  const logout = useLogout();

  if (!session.data) {
    return null;
  }

  function handleLogout() {
    if (logout.isPending) {
      return;
    }

    logout.mutate();
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar
        user={session.data}
        onLogout={handleLogout}
        isLoggingOut={logout.isPending}
      />

      <main className="min-w-0 flex-1 bg-surface px-6 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
