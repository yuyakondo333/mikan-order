import liff from "@line/liff";

const liffId = process.env.NEXT_PUBLIC_LIFF_ID!;

export async function initLiff() {
  await liff.init({ liffId });
  if (!liff.isLoggedIn() && !liff.isInClient()) {
    liff.login({ redirectUri: window.location.href });
  }
  return liff;
}

export function getLiffProfile() {
  return liff.getProfile();
}

export function getLiffAccessToken() {
  return liff.getAccessToken();
}

export { liff };
