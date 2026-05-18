import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireRole, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, profil } = await requireUserAny(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "finance.ledger.cancel", 60, 60);

    const schema = z.object({
      id: z.string().uuid(),
      neden: z.string().max(300).optional().nullable()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { error } = await admin
      .from("financial_transactions")
      .update({
        iptal: true,
        iptal_nedeni: body.neden ?? null,
        iptal_eden: user.id,
        iptal_tarihi: new Date().toISOString()
      })
      .eq("id", body.id)
      .eq("iptal", false);
    if (error) return NextResponse.json({ hata: error.message ?? "İptal edilemedi." }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

