export type PostalCodeResult = {
  prefecture: string;
  city: string;
};

export async function searchAddressByPostalCode(
  postalCode: string
): Promise<PostalCodeResult | null> {
  const digits = postalCode.replace(/-/g, "");
  if (!/^\d{7}$/.test(digits)) return null;

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`
    );
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const { address1, address2, address3 } = data.results[0];
    return { prefecture: address1, city: address2 + address3 };
  } catch {
    return null;
  }
}
