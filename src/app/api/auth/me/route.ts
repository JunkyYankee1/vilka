// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

function clearAuthCookie(res: NextResponse) {
  res.cookies.set("vilka_user_id", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get("vilka_user_id")?.value;
    
    console.log("[auth/me] vilka_user_id cookie:", userIdStr || "not found");

    if (!userIdStr) {
      return NextResponse.json({ user: null });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return clearAuthCookie(NextResponse.json({ user: null }));
    }

    // Ensure Telegram identities table exists.
    // Without this, a fresh DB (or DB reset) may not have the table yet, and auth/me would always return null.
    await query(`
      CREATE TABLE IF NOT EXISTS public.telegram_identities (
        telegram_id bigint PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        username text,
        first_name text,
        last_name text,
        photo_url text,
        last_auth_date bigint NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT telegram_identities_user_id_key UNIQUE (user_id)
      );
    `);

    const { rows } = await query<{
      id: number;
      phone: string;
      role: string;
      telegram_username: string | null;
      telegram_first_name: string | null;
      telegram_last_name: string | null;
    }>(
      `SELECT
         u.id,
         u.phone,
         u.role,
         ti.username AS telegram_username,
         ti.first_name AS telegram_first_name,
         ti.last_name AS telegram_last_name
       FROM users u
       LEFT JOIN telegram_identities ti ON ti.user_id = u.id
       WHERE u.id = $1 AND u.is_active = true
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return clearAuthCookie(NextResponse.json({ user: null }));
    }

    const u = rows[0];
    const telegram =
      u.telegram_username || u.telegram_first_name || u.telegram_last_name
        ? {
            username: u.telegram_username,
            firstName: u.telegram_first_name,
            lastName: u.telegram_last_name,
          }
        : null;

    return NextResponse.json({
      user: {
        id: u.id,
        phone: u.phone,
        role: u.role,
        telegram,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ user: null });
  }
}
