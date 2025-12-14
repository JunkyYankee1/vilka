// app/api/addresses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";

// DELETE - удалить адрес
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // В Next.js 16 params может быть Promise
    const resolvedParams = await Promise.resolve(params);
    const addressIdStr = resolvedParams.id;

    // Получаем userId из cookies
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get("vilka_user_id")?.value;

    console.log("[addresses DELETE] userId from cookie:", userIdStr);
    console.log("[addresses DELETE] addressId from params:", addressIdStr);

    if (!userIdStr) {
      console.log("[addresses DELETE] No userId in cookie, returning 401");
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const userId = parseInt(userIdStr, 10);
    const addressId = parseInt(addressIdStr, 10);

    console.log("[addresses DELETE] Parsed userId:", userId, "addressId:", addressId);

    if (isNaN(userId) || isNaN(addressId)) {
      console.log("[addresses DELETE] Invalid userId or addressId");
      return NextResponse.json(
        { error: "Неверный userId или addressId" },
        { status: 400 }
      );
    }

    // Проверяем, что адрес принадлежит пользователю
    console.log("[addresses DELETE] Checking if address exists for user");
    const { rows: checkRows } = await query<{ id: number }>(
      `SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    console.log("[addresses DELETE] Found addresses:", checkRows.length);

    if (checkRows.length === 0) {
      console.log("[addresses DELETE] Address not found or doesn't belong to user");
      return NextResponse.json(
        { error: "Адрес не найден" },
        { status: 404 }
      );
    }

    // Удаляем адрес
    console.log("[addresses DELETE] Executing DELETE query");
    const deleteResult = await query(
      `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    console.log("[addresses DELETE] Delete result:", deleteResult);

    // Проверяем, что адрес действительно удален
    const { rows: verifyRows } = await query<{ id: number }>(
      `SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    if (verifyRows.length > 0) {
      console.error("[addresses DELETE] Address still exists after deletion!");
      return NextResponse.json(
        { error: "Не удалось удалить адрес" },
        { status: 500 }
      );
    }

    console.log("[addresses DELETE] Address deleted successfully");
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[addresses DELETE] Error:", e);
    console.error("[addresses DELETE] Error details:", {
      message: e?.message,
      code: e?.code,
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
