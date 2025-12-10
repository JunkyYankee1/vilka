// app/api/business/menu-items/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// небольшая утилита, чтобы достать id из URL, не завися от params
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

// 🔧 Обновление товара (isActive / isBrandAnonymous)
export async function PATCH(req: NextRequest) {
  try {
    const menuItemId = getIdFromUrl(req.url);
    if (!menuItemId) {
      return NextResponse.json(
        { error: "Некорректный id товара в URL" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId обязателен" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      isActive,
      isBrandAnonymous,
    } = body as {
      isActive?: boolean;
      isBrandAnonymous?: boolean;
    };

    if (
      typeof isActive !== "boolean" &&
      typeof isBrandAnonymous !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Нужно передать хотя бы одно поле: isActive или isBrandAnonymous",
        },
        { status: 400 }
      );
    }

    const setParts: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (typeof isActive === "boolean") {
      setParts.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    if (typeof isBrandAnonymous === "boolean") {
      setParts.push(`is_brand_anonymous = $${idx++}`);
      values.push(isBrandAnonymous);
    }

    values.push(menuItemId);   // $idx
    values.push(restaurantId); // $idx+1

    const setClause = setParts.join(", ");

    await query(
      `
      UPDATE menu_items
      SET ${setClause}
      WHERE id = $${idx}
        AND restaurant_id = $${idx + 1}
      `,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/business/menu-items/[id]]", e);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

// 🗑 Полное удаление товара
export async function DELETE(req: NextRequest) {
  try {
    const menuItemId = getIdFromUrl(req.url);
    if (!menuItemId) {
      return NextResponse.json(
        { error: "Некорректный id товара в URL" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId обязателен" },
        { status: 400 }
      );
    }

    await query(
      `
      DELETE FROM menu_items
      WHERE id = $1
        AND restaurant_id = $2
      `,
      [menuItemId, restaurantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/business/menu-items/[id]]", e);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
