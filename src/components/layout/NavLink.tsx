"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  match = "exact",
}: {
  href: string;
  children: React.ReactNode;
  match?: "exact" | "prefix";
}) {
  const pathname = usePathname();
  const active = match === "exact" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-pill px-3.5 text-[15px] font-semibold transition-colors",
        active ? "bg-brand text-ink" : "text-ink hover:bg-accent-soft",
      )}
    >
      {children}
    </Link>
  );
}
