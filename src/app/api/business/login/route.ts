// app/api/business/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Код не указан" }, { status: 400 });
    }

    const { rows } = await query<{
      id: number;
      name: string;
    }>(
      `
      SELECT id, name
      FROM restaurants
      WHERE business_access_code = $1
        AND is_active = TRUE
      `,
      [code.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Неверный код" }, { status: 401 });
    }

    const restaurant = rows[0];

    // Для простоты: возвращаем id, дальше держим его в состоянии на фронте
    return NextResponse.json({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
