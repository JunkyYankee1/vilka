// app/api/addresses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

// GET - получить все адреса пользователя
export async function GET() {
  try {
    // Получаем userId из cookies
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get("vilka_user_id")?.value;

    if (!userIdStr) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Неверный userId" }, { status: 400 });
    }

    const { rows } = await query<{
      id: number;
      label: string | null;
      address_line: string;
      city: string | null;
      latitude: number | null;
      longitude: number | null;
      is_default: boolean;
      comment: string | null;
    }>(
      `SELECT id, label, address_line, city, latitude, longitude, is_default, comment
       FROM user_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return NextResponse.json({ addresses: rows });
  } catch (e: any) {
    console.error("[addresses GET] Error:", e);
    return NextResponse.json(
      { 
        error: "Ошибка сервера",
        details: process.env.NODE_ENV === "development" ? e?.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - создать новый адрес
export async function POST(req: NextRequest) {
  try {
    // Получаем userId из cookies
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get("vilka_user_id")?.value;

    console.log("[addresses POST] userId from cookie:", userIdStr);

    if (!userIdStr) {
      console.log("[addresses POST] No userId in cookie, returning 401");
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      console.log("[addresses POST] Invalid userId:", userIdStr);
      return NextResponse.json({ error: "Неверный userId" }, { status: 400 });
    }

    const body = await req.json();
    console.log("[addresses POST] Request body:", body);
    const { label, address_line, city, latitude, longitude, comment } = body;

    if (!address_line) {
      console.log("[addresses POST] Missing address_line");
      return NextResponse.json(
        { error: "address_line обязателен" },
        { status: 400 }
      );
    }

    // Если это первый адрес пользователя, делаем его адресом по умолчанию
    const { rows: existingAddresses } = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_addresses WHERE user_id = $1`,
      [userId]
    );
    const isDefault = existingAddresses[0]?.count === 0;

    // Если устанавливаем новый адрес как default, снимаем default с остальных
    if (isDefault) {
      await query(
        `UPDATE user_addresses SET is_default = false WHERE user_id = $1`,
        [userId]
      );
    }

    console.log("[addresses POST] Inserting address for userId:", userId);
    const { rows } = await query<{ id: number }>(
      `INSERT INTO user_addresses (user_id, label, address_line, city, latitude, longitude, is_default, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        label || null,
        address_line,
        city || null,
        latitude || null,
        longitude || null,
        isDefault,
        comment || null,
      ]
    );

    console.log("[addresses POST] Address created with id:", rows[0].id);
    return NextResponse.json({ id: rows[0].id });
  } catch (e: any) {
    console.error("[addresses POST] Error:", e);
    console.error("[addresses POST] Error details:", {
      message: e?.message,
      code: e?.code,
      constraint: e?.constraint,
      stack: e?.stack,
    });
    return NextResponse.json(
      { 
        error: "Ошибка сервера",
        details: process.env.NODE_ENV === "development" ? e?.message : undefined
      },
      { status: 500 }
    );
  }
}
