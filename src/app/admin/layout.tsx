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
        <nav className="border-b bg-white px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-gray-900">管理画面</span>
            <AdminNavLink href="/admin/orders">注文管理</AdminNavLink>
            <AdminNavLink href="/admin/products">商品管理</AdminNavLink>
            <AdminNavLink href="/admin/legal">特商法表記</AdminNavLink>
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
