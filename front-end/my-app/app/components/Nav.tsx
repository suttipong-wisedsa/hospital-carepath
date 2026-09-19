"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

interface NavLink {
  href: Route;
  label: string;
  icon: string;
}

/** แถบเมนูด้านบน — ปรากฏทุกหน้า ช่วยให้นำทางง่ายขึ้น
 *  ยกเว้นหน้า /patient-view/* (หน้าสำหรับผู้ป่วยดูเอง) จะไม่แสดง —
 *  เพื่อป้องกันไม่ให้ผู้ป่วยเข้าถึงเมนูที่นำไปยังหน้าแก้ไขข้อมูลได้
 */
export function Nav() {
  const pathname = usePathname();

  // ซ่อน Nav ในหน้า patient-view (ทั้ง entry และ [code])
  if (pathname?.startsWith("/patient-view")) {
    return null;
  }

  const links: NavLink[] = [
    { href: "/", label: "หน้าแรก", icon: "🏠" },
    { href: "/queue", label: "คิว", icon: "📋" },
    { href: "/patient", label: "ผู้ป่วย", icon: "👥" },
    { href: "/patient-view", label: "ผู้ป่วยดูเอง", icon: "🧑‍⚕️" },
    { href: "/patients/new", label: "ลงทะเบียน", icon: "➕" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-zinc-900 transition hover:opacity-80 dark:text-zinc-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 text-lg shadow-md ring-1 ring-teal-700/10">
            🏥
          </span>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hospital{" "}
            <span className="text-teal-700 dark:text-teal-400">Carepath</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav
          aria-label="primary"
          className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-teal-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-teal-400 dark:ring-zinc-700"
                    : "text-zinc-700 hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
