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
      className={`text-base font-medium ${
        isActive
          ? "text-orange-600 underline underline-offset-4"
          : "text-gray-700 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}
