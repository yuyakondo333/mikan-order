import { auth } from "@/auth";
import { CustomerProviders } from "@/components/customer-providers";
import { CustomerHeader } from "@/components/customer-header";
import { getCartItemCount } from "@/db/queries/cart";
import { upsertUser } from "@/db/queries/users";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let cartItemCount = 0;
  if (session?.user?.lineUserId) {
    const user = await upsertUser({
      lineUserId: session.user.lineUserId,
      displayName: session.user.displayName ?? "",
      pictureUrl: session.user.pictureUrl,
    });
    cartItemCount = await getCartItemCount(user.id);
  }

  return (
    <CustomerProviders>
      <CustomerHeader itemCount={cartItemCount} />
      {children}
    </CustomerProviders>
  );
}
