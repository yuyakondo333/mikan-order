import Link from "next/link";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get("admin_session")?.value;

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoggedIn && (
        <nav className="border-b bg-white px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-800">管理画面</span>
            <Link
              href="/admin/orders"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              注文管理
            </Link>
            <Link
              href="/admin/products"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              商品管理
            </Link>
          </div>
        </nav>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}
