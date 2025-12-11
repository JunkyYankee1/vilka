import { NextResponse } from "next/server";
import { getCatalogData } from "@/modules/catalog/getCatalogData";

export async function GET() {
  try {
    const payload = await getCatalogData();
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/catalog/data] error:", err);
    return NextResponse.json(
      { error: "Не удалось загрузить каталог" },
      { status: 500 }
    );
  }
}
