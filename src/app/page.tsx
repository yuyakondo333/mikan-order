import { redirect } from "next/navigation";

const ALLOWED_PATHS = [
  "/products",
  "/cart",
  "/orders",
  "/address",
  "/confirm",
  "/complete",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const liffState = params["liff.state"];

  if (typeof liffState === "string" && liffState.startsWith("/")) {
    // decodeURIComponent + URL正規化を一括で行い、
    // URIError時は/productsにフォールバック。
    // pathname抽出によりクエリ/フラグメント/..トラバーサルも除去される。
    let path: string;
    try {
      path = new URL(decodeURIComponent(liffState), "http://localhost").pathname;
    } catch {
      redirect("/products");
    }
    if (
      ALLOWED_PATHS.some(
        (allowed) => path === allowed || path.startsWith(allowed + "/")
      )
    ) {
      redirect(path);
    }
  }

  redirect("/products");
}
