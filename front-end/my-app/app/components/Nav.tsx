"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

interface NavLink {
  href: Route;
  label: string;
  icon: string;
}

export function Nav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/patient-view")) {
    return null;
  }

  const links: NavLink[] = [
    { href: "/queue", label: "Queue", icon: "📋" },
    { href: "/patient", label: "Patients", icon: "👥" },
    { href: "/patient-view", label: "Care Pathway", icon: "🧑‍⚕️" },
    { href: "/patients/new", label: "Register Patient", icon: "➕" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-zinc-900 transition hover:opacity-80"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 text-lg shadow-md ring-1 ring-teal-700/10">
            🏥
          </span>
          <span className="text-2xl font-bold tracking-tight text-zinc-900">
            Hospital <span className="text-teal-700">Carepath</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav
          aria-label="primary"
          className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const openInNewTab = link.href === "/patient-view";

            return (
              <Link
                key={link.href}
                href={link.href}
                target={openInNewTab ? "_blank" : undefined}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-teal-700 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-700 hover:bg-white hover:text-zinc-900 hover:shadow-sm"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
