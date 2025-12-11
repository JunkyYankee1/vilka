import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";

type SavedRow = {
  payload: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { savedCartId } = body as { savedCartId?: number };
    const identity = await resolveCartIdentity();

    if (!savedCartId) {
      return NextResponse.json(
        { error: "savedCartId обязателен" },
        { status: 400 }
      );
    }

    if (!identity.userId) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const { rows } = await query<SavedRow>(
      `SELECT payload FROM saved_carts WHERE id = $1 AND user_id = $2`,
      [savedCartId, identity.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // На клиенте payload можно применить к текущей корзине, перепривязав актуальные цены через /cart/validate
    return NextResponse.json({ payload: rows[0].payload });
  } catch (err) {
    console.error("[POST /api/cart/apply-saved]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

