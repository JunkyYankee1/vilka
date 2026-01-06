import { NextRequest, NextResponse } from "next/server";
import { ollamaChat, type OllamaMessage } from "@/lib/ai/ollama";
import { toolGetMyAddresses, toolGetMyCart, toolGetMyProfile, toolSearchMenuItems, toolGetMenuItemsByPrice } from "@/lib/ai/userTools";
import { resolveCartIdentity } from "@/modules/cart/cartIdentity";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ToolCall =
  | { tool: "my_profile"; args: Record<string, never> }
  | { tool: "my_addresses"; args: Record<string, never> }
  | { tool: "my_cart"; args: Record<string, never> }
  | { tool: "search_menu_items"; args: { queryText: string; limit?: number } }
  | { tool: "get_menu_items_by_price"; args: { sortBy: "cheapest" | "most_expensive" | "biggest_discount" | "smallest_discount"; limit?: number } };

type ModelAction =
  | { type: "final"; answer: string }
  | { type: "tool_calls"; calls: ToolCall[] };

function safeJsonParse(input: string): any | null {
  try {
    // Try direct parse first
    return JSON.parse(input);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = input.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || input.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Ignore
      }
    }
    return null;
  }
}

function getUserIdFromCookie(req: NextRequest): number | null {
  const raw = req.cookies.get("vilka_user_id")?.value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const SYSTEM_PROMPT = `
Ты — чат-бот ассистент для пользователей сервиса доставки еды «Вилка».
Ты умеешь отвечать на вопросы про корзину, адреса доставки и блюда. Для персональных данных ты можешь использовать инструменты (только чтение).

КРИТИЧЕСКИ ВАЖНО:
- НИКОГДА не выдумывай данные! Если не знаешь ответа — используй инструменты.
- НИКОГДА не отвечай на вопросы о ценах/скидках без вызова инструментов.
- ВСЕГДА используй фактические данные из результатов инструментов, не придумывай.

Правила:
- Если пользователь не авторизован, ты НЕ можешь видеть его корзину/адреса — попроси войти.
- Никаких действий, меняющих данные (ни в БД, ни в Redis).
- Если данных не хватает — сначала вызови инструменты, затем ответь на основе РЕАЛЬНЫХ данных.
- ВАЖНО: Возвращай ТОЛЬКО валидный JSON без markdown, без объяснений, без дополнительного текста. Только чистый JSON объект.
- Когда получаешь результаты инструментов, внимательно проверь поле "ok": если ok=true, значит данные получены успешно (даже если массив пустой). Если ok=false, значит произошла ошибка.
- ВСЕГДА используй фактические данные из tool results. Если tool вернул ok=true и data, используй ТОЛЬКО эти данные.

Формат ответа (строго один из):

1) Запрос инструментов:
{"type":"tool_calls","calls":[{"tool":"my_profile","args":{}}]}

2) Финальный ответ пользователю:
{"type":"final","answer":"Твой ответ здесь"}

Инструменты:
- my_profile: профиль пользователя (требует авторизации)
- my_addresses: список адресов пользователя (требует авторизации, возвращает массив addresses)
- my_cart: корзина пользователя (не требует авторизации, работает через cartToken, возвращает объект cart с полями items, totals)
- search_menu_items: поиск блюд по названию (args: {queryText: "название", limit: 10})
- get_menu_items_by_price: получить блюда отсортированные по цене/скидке (args: {sortBy: "cheapest"|"most_expensive"|"biggest_discount"|"smallest_discount", limit: 10})

Примеры использования инструментов:
- "какой товар самый дорогой?" → {"type":"tool_calls","calls":[{"tool":"get_menu_items_by_price","args":{"sortBy":"most_expensive","limit":1}}]}
- "какой товар самый дешёвый?" → {"type":"tool_calls","calls":[{"tool":"get_menu_items_by_price","args":{"sortBy":"cheapest","limit":1}}]}
- "какой товар имеет наибольшую скидку?" → {"type":"tool_calls","calls":[{"tool":"get_menu_items_by_price","args":{"sortBy":"biggest_discount","limit":1}}]}
- "Что в корзине?" → {"type":"tool_calls","calls":[{"tool":"my_cart","args":{}}]}
- "Какой мой адрес?" → {"type":"tool_calls","calls":[{"tool":"my_addresses","args":{}}]}

Примеры обработки результатов инструментов:
- get_menu_items_by_price вернул ok=true, data.items=[{name:"Пицца", price:600, discount_percent:10, final_price:540}] → {"type":"final","answer":"Самое дорогое блюдо: Пицца за 540 рублей (скидка 10%, было 600 рублей)"}
- my_cart вернул ok=true, data.cart.items=[{name:"Вок", quantity:1, price:458}] → {"type":"final","answer":"В вашей корзине 1 блюдо: Вок (458 руб) x 1. Итого: 458 рублей"}
- my_cart вернул ok=true, data.cart.items=[] → {"type":"final","answer":"Ваша корзина пуста"}
- my_addresses вернул ok=true, data.addresses=[{address_line:"ул. Ленина, 1", city:"Москва"}] → {"type":"final","answer":"Ваш адрес: ул. Ленина, 1, Москва"}
- my_addresses вернул ok=true, data.addresses=[] → {"type":"final","answer":"У вас пока нет сохраненных адресов. Добавьте адрес в настройках профиля."}
- my_addresses вернул ok=false, error="auth_required" → {"type":"final","answer":"Для просмотра адресов необходимо войти в аккаунт."}
`.trim();

async function runToolCall(call: ToolCall, ctx: { userId: number | null; cartIdentity: any }) {
  switch (call.tool) {
    case "my_profile":
      return await toolGetMyProfile(ctx.userId);
    case "my_addresses":
      return await toolGetMyAddresses(ctx.userId);
    case "my_cart":
      return await toolGetMyCart(ctx.cartIdentity);
    case "search_menu_items":
      return await toolSearchMenuItems(call.args);
    case "get_menu_items_by_price":
      return await toolGetMenuItemsByPrice(call.args);
    default:
      return { ok: false, error: "Unknown tool" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as null | { messages: ChatMessage[] };
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const userId = getUserIdFromCookie(req);
    const cartIdentity = await resolveCartIdentity();
    
    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[POST /api/ai/chat] userId: ${userId}, cartIdentity:`, cartIdentity);
    }

  const userMessages = body.messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);

  const messages: OllamaMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

    const MAX_TURNS = 5;
    let lastInvalidResponse: string | null = null;
    
    for (let step = 0; step < MAX_TURNS; step++) {
      let content: string;
      try {
        const resp = await ollamaChat(messages);
        content = resp.content.trim();
      } catch (e: any) {
        console.error(`[POST /api/ai/chat] Ollama error at step ${step}:`, e);
        return NextResponse.json(
          {
            error: "llm_unavailable",
            details:
              process.env.NODE_ENV === "development"
                ? String(e?.message ?? e)
                : undefined,
          },
          { status: 503 }
        );
      }

      if (!content) {
        console.warn(`[POST /api/ai/chat] Empty response at step ${step}`);
        if (step === MAX_TURNS - 1) {
          return NextResponse.json(
            { error: "Модель не ответила. Попробуйте переформулировать вопрос." },
            { status: 504 }
          );
        }
        messages.push({
          role: "user",
          content: "Пожалуйста, ответь в формате JSON: {\"type\":\"final\",\"answer\":\"...\"}",
        });
        continue;
      }

      const parsed = safeJsonParse(content) as ModelAction | null;

      if (!parsed || (parsed.type !== "final" && parsed.type !== "tool_calls")) {
        lastInvalidResponse = content.substring(0, 200);
        console.warn(`[POST /api/ai/chat] Invalid JSON at step ${step}:`, content.substring(0, 100));
        
        if (step === MAX_TURNS - 1) {
          // Last attempt failed - return a helpful error
          return NextResponse.json(
            {
              error: "Модель вернула некорректный ответ. Попробуйте переформулировать вопрос.",
              details: process.env.NODE_ENV === "development" ? lastInvalidResponse : undefined,
            },
            { status: 504 }
          );
        }
        
        // Add a stronger hint
        messages.push({
          role: "user",
          content: "Ошибка: ответ должен быть ТОЛЬКО валидным JSON без markdown. Пример: {\"type\":\"final\",\"answer\":\"Привет!\"}",
        });
        continue;
      }

      if (parsed.type === "final") {
        return NextResponse.json({ answer: parsed.answer || "Извините, не могу ответить на этот вопрос." });
      }

      // tools
      const calls = Array.isArray(parsed.calls) ? parsed.calls.slice(0, 4) : [];
      if (calls.length === 0) {
        // Empty tool calls - treat as final answer request
        if (step === MAX_TURNS - 1) {
          return NextResponse.json(
            { error: "Модель не смогла сформировать ответ. Попробуйте переформулировать вопрос." },
            { status: 504 }
          );
        }
        messages.push({
          role: "user",
          content: "Если у тебя есть ответ, верни {\"type\":\"final\",\"answer\":\"...\"}. Если нужны инструменты, укажи их в calls.",
        });
        continue;
      }

      const results = [];
      for (const c of calls) {
        try {
          results.push({ tool: c.tool, result: await runToolCall(c as ToolCall, { userId, cartIdentity }) });
        } catch (toolError: any) {
          console.error(`[POST /api/ai/chat] Tool error for ${c.tool}:`, toolError);
          results.push({ tool: c.tool, result: { ok: false, error: "Tool execution failed" } });
        }
      }

      messages.push({ role: "assistant", content });
      
      // Log tool results in development for debugging
      if (process.env.NODE_ENV === "development") {
        console.log(`[POST /api/ai/chat] Tool results at step ${step}:`, JSON.stringify(results, null, 2));
      }
      
      messages.push({ role: "tool", content: JSON.stringify({ results }) });
    }

    return NextResponse.json(
      { error: "Модель не смогла сформировать ответ за отведенное время. Попробуйте переформулировать вопрос." },
      { status: 504 }
    );
  } catch (e: any) {
    console.error("[POST /api/ai/chat]", e);
    return NextResponse.json(
      {
        error: "server_error",
        details:
          process.env.NODE_ENV === "development" ? String(e?.message ?? e) : undefined,
      },
      { status: 500 }
    );
  }
}


