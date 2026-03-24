type LineVerifyResult = {
  sub: string;
  name: string;
  picture?: string;
};

export async function verifyLineIdToken(
  idToken: string
): Promise<LineVerifyResult | null> {
  // 入力バリデーション: 長さ制限（正規JWTは数KB以下、DoS防止）
  if (idToken.length > 10_000) return null;

  // 入力バリデーション: JWT形式チェック（header.payload.signature の3パート）
  if (idToken.split(".").length !== 3) return null;

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

  // レスポンス検証: aud（チャネルID）がLIFF_CHANNEL_IDと一致すること
  if (data.aud !== channelId) return null;

  // レスポンス検証: iss（発行元）がLINEであること
  if (data.iss !== "https://access.line.me") return null;

  // LINE APIレスポンスの必須フィールドを検証
  if (typeof data.sub !== "string" || typeof data.name !== "string") {
    return null;
  }

  return {
    sub: data.sub,
    name: data.name,
    picture:
      typeof data.picture === "string" && data.picture.startsWith("https://")
        ? data.picture
        : undefined,
  };
}
