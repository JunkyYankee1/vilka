import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";

type CartPayloadRow = {
  cart_id: number;
  payload: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, name } = body as {
      cartId?: number;
      name?: string;
    };
    const identity = await resolveCartIdentity();
    const userId = identity.userId;

    if (!cartId || !userId || !name) {
      return NextResponse.json(
        { error: "cartId, userId, name обязательны" },
        { status: 400 }
      );
    }

    // Соберём состояние корзины в payload
    const { rows } = await query<CartPayloadRow>(
      `
      SELECT $1::int as cart_id,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'cartItemId', ci.id,
              'menuItemId', ci.menu_item_id,
              'quantity', ci.quantity,
              'comment', ci.comment,
              'allowReplacement', ci.allow_replacement
            )
          )
          FROM cart_items ci
          WHERE ci.cart_id = $1
        ) as payload
      `,
      [cartId]
    );

    const payload = rows[0]?.payload ?? [];

    const insert = await query<{ id: number }>(
      `
      INSERT INTO saved_carts (user_id, name, payload)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [userId, name, payload]
    );

    return NextResponse.json({ id: insert.rows[0].id });
  } catch (err) {
    console.error("[POST /api/cart/save]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

