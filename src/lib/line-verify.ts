type LineVerifyResult = {
  sub: string;
  name: string;
  picture?: string;
};

export async function verifyLineIdToken(
  idToken: string
): Promise<LineVerifyResult | null> {
  const channelId = process.env.LIFF_CHANNEL_ID;
  if (!channelId) {
    throw new Error(
      "LIFF_CHANNEL_ID environment variable is required"
    );
  }

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

  // LINE APIレスポンスの必須フィールドを検証
  if (typeof data.sub !== "string" || typeof data.name !== "string") {
    return null;
  }

  return {
    sub: data.sub,
    name: data.name,
    picture: typeof data.picture === "string" ? data.picture : undefined,
  };
}
