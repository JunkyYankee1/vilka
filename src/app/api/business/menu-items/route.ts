// app/api/business/menu-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
      discount_percent,
      image_url,
      ref_category_id,
      is_active,
      stock_qty
    FROM menu_items
    WHERE restaurant_id = $1
    ORDER BY created_at DESC
    `,
    [restaurantId]
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      restaurantId,
      name,
      composition,
      price,
      discountPercent,
      imageUrl,
      refCategoryId,
      stockQty,
    } = body;

    if (!restaurantId || !name || !price || !refCategoryId) {
      return NextResponse.json(
        { error: "Обязательные поля: restaurantId, name, price, refCategoryId" },
        { status: 400 }
      );
    }

    const { rows } = await query<{ id: number }>(
      `
      INSERT INTO menu_items
        (restaurant_id, name, composition, price,
         discount_percent, image_url, ref_category_id, is_active, created_at, stock_qty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), COALESCE($8::int, 100))
      RETURNING id
      `,
      [
        restaurantId,
        name,
        composition || null,
        price,
        discountPercent ?? null,
        imageUrl || null,
        refCategoryId,
        stockQty ?? null,
      ]
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
