import Link from "next/link";

const links = [
  { href: "/help", label: "ヘルプ" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal", label: "特定商取引法に基づく表記" },
] as const;

export function CustomerFooter() {
  return (
    <footer className="border-t border-orange-200 bg-orange-50 px-4 py-6">
      <nav className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-xs text-gray-500 hover:text-orange-600"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
