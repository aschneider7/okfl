import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "okfl_commissioner";

function password() {
  return process.env.COMMISSIONER_PASSWORD ?? "";
}

function expectedToken() {
  const secret = password();
  if (!secret) return "";
  return createHmac("sha256", secret).update("okfl-commissioner-session-v1").digest("hex");
}

export function verifyPassword(candidate: string) {
  const expected = password();
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isCommissioner() {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const expected = expectedToken();
  if (!token || !expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function setCommissionerCookie() {
  const token = expectedToken();
  if (!token) throw new Error("COMMISSIONER_PASSWORD is not configured.");
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearCommissionerCookie() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
