// app/api/debug/redis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

// GET - просмотр всех ключей и данных в Redis
export async function GET(req: NextRequest) {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis не подключен (REDIS_URL не установлен)" },
        { status: 503 }
      );
    }

    // Проверяем, подключен ли клиент
    if (!redis.isOpen) {
      await redis.connect();
    }

    const searchParams = req.nextUrl.searchParams;
    const pattern = searchParams.get("pattern") || "cart:*";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Получаем все ключи по паттерну
    const keys: string[] = [];
    for await (const key of redis.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(key);
      if (keys.length >= limit) break;
    }

    // Получаем значения для всех ключей
    const data: Record<string, any> = {};
    for (const key of keys) {
      try {
        const value = await redis.get(key);
        if (value) {
          try {
            // Пытаемся распарсить как JSON
            data[key] = JSON.parse(value);
          } catch {
            // Если не JSON, возвращаем как строку
            data[key] = value;
          }
        } else {
          data[key] = null;
        }

        // Также получаем TTL
        const ttl = await redis.ttl(key);
        if (ttl > 0) {
          data[`${key}:ttl`] = `${ttl} секунд (${Math.round(ttl / 60)} минут)`;
        }
      } catch (err: any) {
        data[key] = `Ошибка чтения: ${err?.message}`;
      }
    }

    return NextResponse.json({
      pattern,
      totalKeys: keys.length,
      keys,
      data,
    });
  } catch (e: any) {
    console.error("[debug/redis] Error:", e);
    return NextResponse.json(
      {
        error: "Ошибка при чтении Redis",
        details: process.env.NODE_ENV === "development" ? e?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - удалить ключ из Redis
export async function DELETE(req: NextRequest) {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis не подключен" },
        { status: 503 }
      );
    }

    if (!redis.isOpen) {
      await redis.connect();
    }

    const searchParams = req.nextUrl.searchParams;
    const key = searchParams.get("key");
    const pattern = searchParams.get("pattern");

    if (key) {
      // Удаляем конкретный ключ
      const deleted = await redis.del(key);
      return NextResponse.json({
        success: true,
        message: `Ключ ${key} ${deleted > 0 ? "удален" : "не найден"}`,
        deleted,
      });
    } else if (pattern) {
      // Удаляем все ключи по паттерну
      const keys: string[] = [];
      for await (const k of redis.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(k);
      }

      if (keys.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Ключи не найдены",
          deleted: 0,
        });
      }

      const deleted = await redis.del(keys);
      return NextResponse.json({
        success: true,
        message: `Удалено ${deleted} ключей по паттерну ${pattern}`,
        deleted,
        keys,
      });
    } else {
      return NextResponse.json(
        { error: "Укажите параметр 'key' или 'pattern'" },
        { status: 400 }
      );
    }
  } catch (e: any) {
    console.error("[debug/redis] DELETE Error:", e);
    return NextResponse.json(
      {
        error: "Ошибка при удалении из Redis",
        details: process.env.NODE_ENV === "development" ? e?.message : undefined,
      },
      { status: 500 }
    );
  }
}
