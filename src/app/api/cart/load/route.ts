import { NextRequest, NextResponse } from "next/server";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";
import { getOrCreateCart } from "@/modules/cart/cartRepository";

// GET - загрузить корзину из Redis
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveCartIdentity();
    const cart = await getOrCreateCart(identity);

    return NextResponse.json({
      cartToken: cart.cartToken,
      deliverySlot: cart.deliverySlot,
      items: cart.items,
      totals: cart.totals,
    });
  } catch (err) {
    console.error("[GET /api/cart/load] Error:", err);
    return NextResponse.json(
      {
        error: "server_error",
        details: process.env.NODE_ENV === "development" 
          ? (err instanceof Error ? err.message : String(err))
          : undefined,
      },
      { status: 500 }
    );
  }
}
