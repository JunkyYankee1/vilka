import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { menuItemId, favorite } = body as {
      menuItemId?: number;
      favorite?: boolean;
    };
    const identity = await resolveCartIdentity();

    if (!identity.userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    if (!menuItemId || typeof favorite !== "boolean") {
      return NextResponse.json(
        { error: "menuItemId и favorite обязательны" },
        { status: 400 }
      );
    }

    if (favorite) {
      await query(
        `
        INSERT INTO favorite_items (user_id, menu_item_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [identity.userId, menuItemId]
      );
    } else {
      await query(
        `
        DELETE FROM favorite_items
        WHERE user_id = $1 AND menu_item_id = $2
        `,
        [identity.userId, menuItemId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/favorites/toggle]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

