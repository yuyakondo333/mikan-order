import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { accessToken } = await request.json();

  // LINE の verify API でアクセストークンを検証
  const res = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${accessToken}`
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
