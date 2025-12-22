// app/api/debug/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - проверить наличие товаров в БД
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ids = searchParams.get("ids");
    
    if (!ids) {
      return NextResponse.json(
        { error: "Укажите параметр ids (через запятую)" },
        { status: 400 }
      );
    }

    const offerIds = ids.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    
    if (offerIds.length === 0) {
      return NextResponse.json(
        { error: "Нет валидных ID" },
        { status: 400 }
      );
    }

    const { rows } = await query<{
      id: number;
      name: string;
      price: number;
      is_available: boolean;
      is_active: boolean;
      stock_qty: number;
    }>(
      `
      SELECT id, name, price, is_available, is_active, stock_qty
      FROM menu_items
      WHERE id = ANY($1::int[])
      `,
      [offerIds]
    );

    const foundIds = rows.map(r => r.id);
    const notFoundIds = offerIds.filter(id => !foundIds.includes(id));

    return NextResponse.json({
      requestedIds: offerIds,
      found: rows.map(r => ({
        id: r.id,
        name: r.name,
        price: r.price,
        is_available: r.is_available,
        is_active: r.is_active,
        stock_qty: r.stock_qty,
      })),
      notFound: notFoundIds,
      summary: {
        requested: offerIds.length,
        found: rows.length,
        notFound: notFoundIds.length,
      },
    });
  } catch (e: any) {
    console.error("[debug/offers] Error:", e);
    return NextResponse.json(
      {
        error: "Ошибка при проверке товаров",
        details: process.env.NODE_ENV === "development" ? e?.message : undefined,
      },
      { status: 500 }
    );
  }
}
