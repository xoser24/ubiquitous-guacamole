import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr) {
      return NextResponse.json({ user: null, profil: null, authError: authErr.message }, { status: 200 });
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ user: null, profil: null }, { status: 200 });
    }

    const { data: profil, error: profErr } = await supabase
      .from("profiles")
      .select("id, rol, ad_soyad")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        profil: profil ?? null,
        profilError: profErr?.message ?? null
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Beklenmeyen hata" }, { status: 500 });
  }
}

