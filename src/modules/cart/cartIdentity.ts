import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export type CartIdentity = {
  cartToken: string;
  userId: number | null;
};

const COOKIE_NAME = "vilka_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function resolveCartIdentity(): Promise<CartIdentity> {
  const store = cookies();
  let cartToken = store.get(COOKIE_NAME)?.value;

  if (!cartToken) {
    cartToken = randomBytes(12).toString("hex");
    store.set(COOKIE_NAME, cartToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  // TODO: replace with real user id from auth session when ready
  const userId: number | null = null;

  return { cartToken, userId };
}

