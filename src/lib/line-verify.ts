type LineVerifyResult = {
  sub: string;
  name: string;
  picture?: string;
};

export async function verifyLineIdToken(
  idToken: string
): Promise<LineVerifyResult | null> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;

  const channelId = liffId.split("-")[0];
  const params = new URLSearchParams();
  params.append("id_token", idToken);
  params.append("client_id", channelId);

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    sub: data.sub,
    name: data.name,
    picture: data.picture,
  };
}
