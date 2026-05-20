import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.receipts.by_student", 120, 60);

    const schema = z.object({
      studentId: z.string().uuid(),
      limit: z.number().int().min(10).max(200).optional().default(50)
    });
    const body = await parseJson(req, schema);

    const sb = await supabaseServer();
    const { data: sp, error: e1 } = await sb
      .from("student_payments")
      .select("id")
      .eq("student_id", body.studentId)
      .eq("iptal", false)
      .limit(2000);
    if (e1) return NextResponse.json({ hata: e1.message ?? "Ödeme kalemleri okunamadı." }, { status: 400 });

    const ids = (sp ?? []).map((x: any) => x.id).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ list: [] }, { status: 200 });

    const { data, error } = await sb
      .from("payment_submissions")
      .select("id, amount, paid_at, status, student_payment_id, created_at, student_payments(donem, gelir_kategorisi)")
      .in("student_payment_id", ids)
      .order("created_at", { ascending: false })
      .limit(body.limit);

    if (error) return NextResponse.json({ hata: error.message ?? "Dekontlar okunamadı." }, { status: 400 });
    return NextResponse.json({ list: data ?? [] }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
