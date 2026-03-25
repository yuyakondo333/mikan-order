import Link from "next/link";

export default function AdminForbidden() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-lg font-semibold text-red-600">
          アクセス権限がありません
        </p>
        <p className="mt-2 text-sm text-gray-600">
          管理者アカウントでログインしてください。
        </p>
        <Link
          href="/admin/login"
          className="mt-4 inline-block rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900"
        >
          ログインページへ
        </Link>
      </div>
    </div>
  );
}
