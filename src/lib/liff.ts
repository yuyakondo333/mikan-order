import liff from "@line/liff";

const liffId = process.env.NEXT_PUBLIC_LIFF_ID!;

export async function initLiff() {
  await liff.init({ liffId });
  return liff;
}

export { liff };
