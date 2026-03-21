"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`shrink-0 rounded-md px-2 py-2 text-lg font-medium ${
        isActive
          ? "bg-orange-50 text-orange-600"
          : "text-gray-900 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}
