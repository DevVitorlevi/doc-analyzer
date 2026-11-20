import { useState } from "react";
import { FileText, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import type { User } from "@/features/auth/use-session";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: User;
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

export default function Sidebar({ user }: SidebarProps) {
  return (
    <aside
      aria-label="Barra lateral"
      className="flex w-full shrink-0 flex-col bg-primary text-sidebar-text md:min-h-screen md:w-[var(--sidebar-width)]"
    >
      <div className="px-6 pb-8 pt-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold leading-5">Escritório</span>

          <span className="text-sm leading-5 text-sidebar-text-secondary">
            Advogados associados
          </span>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="px-3">
        <NavLink
          to="/app/documentos"
          end
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2",
              "text-sm font-medium transition-colors",
              "duration-[var(--interaction-transition-duration)]",
              "motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-white",
              isActive
                ? "bg-white/15 text-white"
                : "text-sidebar-text-secondary hover:bg-white/10 hover:text-white",
            )
          }
        >
          <FileText aria-hidden="true" className="size-5 shrink-0" />
          <span>Documentos</span>
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-white/20 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            key={user.picture ?? "no-picture"}
            name={user.name}
            picture={user.picture}
          />

          <div className="min-w-0 flex-1">
            <p
              title={user.name}
              className="truncate text-[length:var(--font-size-user-name)] font-semibold leading-5 text-sidebar-text"
            >
              {user.name}
            </p>

            <p
              title={user.email}
              className="truncate text-[length:var(--font-size-user-email)] leading-4 text-sidebar-text-secondary"
            >
              {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled
          className={cn(
            "mt-4 flex min-h-10 w-full items-center gap-3 rounded-md px-3",
            "text-sm font-medium text-sidebar-text-secondary",
            "cursor-not-allowed opacity-[var(--disabled-opacity)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-white",
          )}
        >
          <LogOut aria-hidden="true" className="size-5 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
