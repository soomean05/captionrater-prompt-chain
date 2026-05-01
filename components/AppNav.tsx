"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

function matchesNav(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/flavors") return pathname === "/flavors" || pathname.startsWith("/flavors/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/flavors", label: "Flavors" },
    { href: "/test", label: "Test" },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
      {links.map(({ href, label }) => {
        const active = matchesNav(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-pill whitespace-nowrap ${active ? "nav-pill-active" : ""}`}
          >
            {label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
      </div>
    </nav>
  );
}
