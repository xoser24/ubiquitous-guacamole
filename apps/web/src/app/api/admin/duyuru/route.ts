import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { assertSameOrigin, audit, jsonError, parseJson, rateLimit, requireRole, requireUser } from "@/lib/api-guard";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUser(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "admin.announcement", 10, 60);

    const schema = z.object({
      baslik: z.string().min(3).max(80).transform((s) => s.trim()),
      icerik: z.string().min(3).max(1000).transform((s) => s.trim())
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data: users, error } = await admin.from("profiles").select("id");
    if (error) return NextResponse.json({ hata: "Kullanıcılar alınamadı" }, { status: 400 });

    const rows = (users ?? []).map((u) => ({
      user_id: u.id,
      baslik: body.baslik,
      icerik: body.icerik,
      veri: { tur: "acil_duyuru" }
    }));

    const { error: err2 } = await admin.from("notifications").insert(rows);
    if (err2) {
      await audit(req, "admin.announcement.failed", { baslik: body.baslik });
      return NextResponse.json({ hata: "Duyuru gönderilemedi" }, { status: 400 });
    }

    await audit(req, "admin.announcement", { baslik: body.baslik, targetCount: rows.length }, "warning");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
