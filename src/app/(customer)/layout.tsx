import { CustomerProviders } from "@/components/customer-providers";
import { CustomerHeader } from "@/components/customer-header";
import { CustomerFooter } from "@/components/customer-footer";
import { getCartItemCount } from "@/db/queries/cart";
import { getAuthenticatedUser } from "@/lib/dal";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  const cartItemCount = user ? await getCartItemCount(user.id) : 0;

  return (
    <CustomerProviders cartItemCount={cartItemCount}>
      <CustomerHeader />
      {children}
      <CustomerFooter />
    </CustomerProviders>
  );
}
