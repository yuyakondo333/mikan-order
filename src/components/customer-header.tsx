import Link from "next/link";

export function CustomerHeader({ itemCount }: { itemCount: number }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-orange-500 px-4 py-3 text-white shadow-md">
      <Link href="/products" className="text-lg font-bold">
        みかん農園
      </Link>
      <Link href="/cart" className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {itemCount}
          </span>
        )}
      </Link>
    </header>
  );
}
