import { auth } from "@/auth";
import { LogoutButton } from "@/components/admin/logout-button";
import { AdminNavLink } from "@/components/admin/admin-nav-link";

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
        <nav className="border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 text-xl font-bold text-gray-900">管理画面</span>
            <LogoutButton />
          </div>
          <div className="-mx-1 mt-2 flex gap-1 overflow-x-auto">
            <AdminNavLink href="/admin/orders">注文管理</AdminNavLink>
            <AdminNavLink href="/admin/products">商品管理</AdminNavLink>
            <AdminNavLink href="/admin/legal">特商法表記</AdminNavLink>
            <AdminNavLink href="/admin/payment">お支払い設定</AdminNavLink>
          </div>
        </nav>
      )}
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
