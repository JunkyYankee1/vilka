import { NextRequest, NextResponse } from "next/server";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";
import {
  getOrCreateCart,
  validateAndPersistCart,
} from "@/modules/cart/cartRepository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { offerId, comment, allowReplacement, favorite, quantity } = body as {
      offerId?: number;
      quantity?: number;
      comment?: string;
      allowReplacement?: boolean;
      favorite?: boolean;
    };

    if (!offerId) {
      return NextResponse.json(
        { error: "offerId обязателен" },
        { status: 400 }
      );
    }

    const identity = await resolveCartIdentity();
    const cart = await getOrCreateCart(identity);

    const nextItems = cart.items.map((i) =>
      i.offerId === offerId
        ? {
            offerId,
            quantity: quantity ?? i.quantity,
            comment: comment ?? i.comment ?? undefined,
            allowReplacement:
              typeof allowReplacement === "boolean"
                ? allowReplacement
                : i.allowReplacement,
            isFavorite:
              typeof favorite === "boolean" ? favorite : i.isFavorite,
          }
        : {
            offerId: i.offerId,
            quantity: i.quantity,
            comment: i.comment ?? undefined,
            allowReplacement: i.allowReplacement,
            isFavorite: i.isFavorite,
          }
    );

    const result = await validateAndPersistCart(identity, {
      deliverySlot: cart.deliverySlot,
      items: nextItems,
    });

    return NextResponse.json({
      cartId: result.cart.id,
      items: result.cart.items,
      totals: result.cart.totals,
    });
  } catch (err) {
    console.error("[POST /api/cart/update-line]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

