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
    const path = decodeURIComponent(liffState);
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
