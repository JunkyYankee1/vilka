import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function getIdFromUrl(urlStr: string): number | null {
  try {
    const url = new URL(urlStr);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    const n = Number(last);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = getIdFromUrl(req.url);
    if (!id) {
      return NextResponse.json({ error: "Некорректный id в URL" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId обязателен" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<{
      isActive: boolean;
      stockQty: number;
      price: number;
      name: string;
      composition: string | null;
    }>;

    const setParts: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (typeof body.isActive === "boolean") {
      setParts.push(`is_active = $${idx++}`);
      values.push(body.isActive);
    }

    if (typeof body.stockQty === "number") {
      if (!Number.isFinite(body.stockQty) || body.stockQty < 0) {
        return NextResponse.json({ error: "stockQty должен быть числом >= 0" }, { status: 400 });
      }
      setParts.push(`stock_qty = $${idx++}`);
      values.push(Math.floor(body.stockQty));
    }

    if (typeof body.price === "number") {
      if (!Number.isFinite(body.price) || body.price <= 0) {
        return NextResponse.json({ error: "Цена должна быть > 0" }, { status: 400 });
      }
      setParts.push(`price = $${idx++}`);
      values.push(body.price);
    }

    if (typeof body.name === "string") {
      const v = body.name.trim();
      if (!v) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
      setParts.push(`name = $${idx++}`);
      values.push(v);
    }

    if (body.composition === null || typeof body.composition === "string") {
      const v = typeof body.composition === "string" ? body.composition.trim() : null;
      setParts.push(`composition = $${idx++}`);
      values.push(v && v.length > 0 ? v : null);
    }

    if (setParts.length === 0) {
      return NextResponse.json(
        { error: "Нужно передать хотя бы одно поле: isActive, stockQty, price, name, composition" },
        { status: 400 }
      );
    }

    values.push(id);
    values.push(restaurantId);

    await query(
      `
      UPDATE menu_items
      SET ${setParts.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
        AND restaurant_id = $${idx + 1}
        AND ref_category_id IN (SELECT id FROM ref_dish_categories WHERE code = 'mistery-box')
      `,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/business/mistery-boxes/[id]] error", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = getIdFromUrl(req.url);
    if (!id) {
      return NextResponse.json({ error: "Некорректный id в URL" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId обязателен" }, { status: 400 });
    }

    await query(
      `
      DELETE FROM menu_items
      WHERE id = $1
        AND restaurant_id = $2
        AND ref_category_id IN (SELECT id FROM ref_dish_categories WHERE code = 'mistery-box')
      `,
      [id, restaurantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/business/mistery-boxes/[id]] error", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

