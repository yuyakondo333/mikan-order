import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin && (
        <nav className="border-b bg-white px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">管理画面</span>
            <Link
              href="/admin/orders"
              className="text-sm text-gray-900 hover:text-black"
            >
              注文管理
            </Link>
            <Link
              href="/admin/products"
              className="text-sm text-gray-900 hover:text-black"
            >
              商品管理
            </Link>
            <Link
              href="/admin/legal"
              className="text-sm text-gray-900 hover:text-black"
            >
              特商法表記
            </Link>
            <div className="ml-auto">
              <LogoutButton />
            </div>
          </div>
        </nav>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}
