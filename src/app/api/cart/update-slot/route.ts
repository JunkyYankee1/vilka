import { NextRequest, NextResponse } from "next/server";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";
import {
  getOrCreateCart,
  validateAndPersistCart,
} from "@/modules/cart/cartRepository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deliverySlot } = body as { deliverySlot?: string | null };
    const identity = await resolveCartIdentity();

    if (typeof deliverySlot !== "string" && deliverySlot !== null) {
      return NextResponse.json(
        { error: "deliverySlot обязателен" },
        { status: 400 }
      );
    }

    const current = await getOrCreateCart(identity);
    const { cart } = await validateAndPersistCart(identity, {
      deliverySlot: deliverySlot ?? current.deliverySlot ?? null,
      items: current.items.map((i) => ({
        offerId: i.offerId,
        quantity: i.quantity,
        comment: i.comment ?? undefined,
        allowReplacement: i.allowReplacement,
        isFavorite: i.isFavorite,
      })),
    });

    return NextResponse.json({
      cartId: cart.id,
      cartToken: cart.cartToken,
      deliverySlot: cart.deliverySlot,
      totals: cart.totals,
    });
  } catch (err) {
    console.error("[POST /api/cart/update-slot]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

