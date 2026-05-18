import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRequestIp, getUserAgent } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach((c) => cookieStore.set(c.name, c.value, c.options));
          }
        }
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      // başarısız giriş log (service role ile)
      try {
        const admin = supabaseAdmin();
        await admin.from("auth_login_attempts").insert({
          email: email.trim().toLowerCase(),
          ip: getRequestIp(req),
          user_agent: getUserAgent(req),
          success: false,
          reason: error.message
        });
      } catch {}
      return NextResponse.json(
        { error: "Giriş başarısız. E-posta veya şifre hatalı olabilir." },
        { status: 401 }
      );
    }

    // başarılı giriş log
    try {
      const admin = supabaseAdmin();
      await admin.from("auth_login_attempts").insert({
        email: email.trim().toLowerCase(),
        ip: getRequestIp(req),
        user_agent: getUserAgent(req),
        success: true,
        reason: null
      });
    } catch {}

    return NextResponse.json({ userId: data.user?.id ?? null }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Beklenmeyen hata." }, { status: 500 });
  }
}
