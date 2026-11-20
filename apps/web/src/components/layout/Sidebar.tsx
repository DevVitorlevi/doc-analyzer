import { useState } from "react";
import { FileText, Loader2, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import type { User } from "@/features/auth/use-session";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

function getInitials(name: string) {
  const particles = new Set(["de", "da", "do", "das", "dos"]);

  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && !particles.has(part.toLowerCase()));

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function ProfileAvatar({ name, picture }: Pick<User, "name" | "picture">) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!picture || imageFailed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-sidebar-text"
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={picture}
      alt={name}
      onError={() => setImageFailed(true)}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
}

export default function Sidebar({
  user,
  onLogout,
  isLoggingOut = false,
}: SidebarProps) {
  const LogoutIcon = isLoggingOut ? Loader2 : LogOut;

  return (
    <aside
      aria-label="Barra lateral"
      className={cn(
        "grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center",
        "gap-x-3 bg-primary px-4 py-3 text-sidebar-text",
        "md:flex md:min-h-screen md:w-(--sidebar-width) md:flex-col",
        "md:items-stretch md:gap-x-0 md:p-0",
      )}
    >
      <div className="col-start-1 row-start-1 min-w-0 md:px-3 md:pb-8 md:pt-8">
        <div className="flex flex-col gap-1 max-md:gap-0">
          <span className="truncate text-sm font-semibold leading-5">
            Escritório
          </span>

          <span className="truncate text-sm leading-5 text-sidebar-text-secondary">
            Advogados associados
          </span>
        </div>
      </div>

      <nav
        aria-label="Navegação principal"
        className="col-span-2 row-start-3 max-md:mt-3 md:px-3"
      >
        <NavLink
          to="/app/documentos"
          end
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2",
              "text-sm font-normal transition-colors",
              "duration-(--interaction-transition-duration)",
              "motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-white",
              isActive
                ? "bg-white/15 text-white hover:bg-white/25"
                : "text-sidebar-text-secondary hover:bg-white/10 hover:text-white",
            )
          }
        >
          <FileText aria-hidden="true" className="size-5 shrink-0" />
          <span>Documentos</span>
        </NavLink>
      </nav>

      <div className="contents md:mt-auto md:block md:border-t md:border-white/20 md:p-4">
        <div
          className={cn(
            "col-span-2 row-start-2 flex min-w-0 items-center gap-3",
            "max-md:mt-3 max-md:border-t max-md:border-white/20 max-md:pt-3",
          )}
        >
          <ProfileAvatar
            key={user.picture ?? "no-picture"}
            name={user.name}
            picture={user.picture}
          />

          <div className="min-w-0 flex-1">
            <p
              title={user.name}
              className="truncate text-(length:--font-size-user-name) font-semibold leading-5 text-sidebar-text"
            >
              {user.name}
            </p>

            <p
              title={user.email}
              className="truncate text-(length:--font-size-user-email) leading-4 text-sidebar-text-secondary"
            >
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
          className={cn(
            "col-start-2 row-start-1 flex min-h-10 items-center gap-2 rounded-md px-3",
            "md:mt-4 md:w-full md:gap-3 md:px-2",
            "text-sm font-medium text-sidebar-text-secondary",
            "transition-colors duration-(--interaction-transition-duration)",
            "motion-reduce:transition-none",
            "hover:bg-white/10 hover:text-white active:bg-white/20",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-white",
            "disabled:cursor-not-allowed disabled:opacity-(--disabled-opacity)",
            "disabled:hover:bg-transparent disabled:hover:text-sidebar-text-secondary cursor-pointer",
          )}
        >
          <LogoutIcon
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0",
              isLoggingOut && "animate-spin motion-reduce:animate-none",
            )}
          />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
