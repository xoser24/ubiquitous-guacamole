import { NextResponse } from "next/server";
import { jsonError, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);

    const sb = await supabaseServer();
    const [{ data: tx }, { data: pending }] = await Promise.all([
      sb
        .from("financial_transactions")
        .select("id, tur, kategori, tutar, tarih, aciklama, student_id, created_at")
        .eq("iptal", false)
        .order("tarih", { ascending: false })
        .limit(30),
      sb.from("payment_submissions").select("id").eq("status", "pending").limit(500)
    ]);

    return NextResponse.json({ transactions: tx ?? [], pendingCount: pending?.length ?? 0 }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

