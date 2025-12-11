import { NextRequest, NextResponse } from "next/server";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";
import {
  validateAndPersistCart,
  type CartLineInput,
} from "@/modules/cart/cartRepository";

type ValidateCartRequest = {
  deliverySlot?: string | null;
  items: CartLineInput[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidateCartRequest;
    const identity = await resolveCartIdentity();

    const { cart, changes, minOrderSum, isMinOrderReached } =
      await validateAndPersistCart(identity, {
        deliverySlot: body.deliverySlot ?? null,
        items: body.items ?? [],
      });

    return NextResponse.json({
      cartId: cart.id,
      cartToken: cart.cartToken,
      deliverySlot: cart.deliverySlot,
      items: cart.items,
      totals: cart.totals,
      changes,
      minOrderSum,
      isMinOrderReached,
    });
  } catch (err) {
    console.error("[POST /api/cart/validate]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

