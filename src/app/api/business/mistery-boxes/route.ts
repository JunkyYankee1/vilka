import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function getMisteryCategoryId(rows: Array<{ id: number | string }>): number | null {
  const raw = rows[0]?.id;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId обязателен" }, { status: 400 });
  }

  const { rows } = await query(
    `
    SELECT
      id,
      name,
      composition,
      price,
      image_url,
      is_active,
      stock_qty
    FROM menu_items
    WHERE restaurant_id = $1
      AND ref_category_id IN (SELECT id FROM ref_dish_categories WHERE code = 'mistery-box')
    ORDER BY created_at DESC
    `,
    [restaurantId]
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<{
      restaurantId: number;
      name: string;
      composition: string | null;
      price: number;
      stockQty: number | null;
    }>;

    const restaurantId = Number(body.restaurantId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const composition = typeof body.composition === "string" ? body.composition.trim() : "";
    const price = Number(body.price);
    const stockQty = body.stockQty == null ? null : Number(body.stockQty);

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return NextResponse.json({ error: "restaurantId обязателен" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Цена должна быть > 0" }, { status: 400 });
    }
    if (stockQty != null && (!Number.isFinite(stockQty) || stockQty < 0)) {
      return NextResponse.json({ error: "Остаток должен быть числом >= 0" }, { status: 400 });
    }

    // Find ref_category_id for Mistery box (created by migration).
    const { rows: catRows } = await query<{ id: number | string }>(
      `SELECT id FROM ref_dish_categories WHERE code = 'mistery-box' LIMIT 1`
    );
    const misteryCategoryId = getMisteryCategoryId(catRows);
    if (!misteryCategoryId) {
      return NextResponse.json(
        { error: "Категория 'Mistery box' не найдена в базе. Примените миграции." },
        { status: 500 }
      );
    }

    const { rows } = await query<{ id: number }>(
      `
      INSERT INTO menu_items
        (restaurant_id, name, composition, price, ref_category_id, is_active, created_at, stock_qty)
      VALUES
        ($1, $2, $3, $4, $5, TRUE, NOW(), COALESCE($6::int, 100))
      RETURNING id
      `,
      [restaurantId, name, composition || null, price, misteryCategoryId, stockQty]
    );

    return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/business/mistery-boxes] error", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

