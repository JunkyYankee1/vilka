// app/api/business/categories/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await query<{
      id: number;
      name: string;
      code: string;
      parent_id: number | null;
      level: number;
    }>(
      `
      SELECT id, name, code, parent_id, level
      FROM ref_dish_categories
      WHERE level = 3
        AND is_active = TRUE
      ORDER BY name
      `
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка загрузки категорий" }, { status: 500 });
  }
}
