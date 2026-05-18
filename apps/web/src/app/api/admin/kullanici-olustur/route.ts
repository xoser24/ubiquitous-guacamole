import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import { assertSameOrigin, audit, jsonError, parseJson, rateLimit, requireRole, requireUser } from "@/lib/api-guard";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUser(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "admin.create_user", 20, 60);

    const schema = z.object({
      eposta: z.string().email().transform((s) => s.trim().toLowerCase()),
      sifre: z.string().min(8).max(72),
      rol: z.enum(["admin", "antrenor", "veli", "ogrenci"]),
      ad_soyad: z.string().min(2).max(80).transform((s) => s.trim()),
      telefon: z.string().optional()
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: body.eposta,
      password: body.sifre,
      email_confirm: true
    });
    if (error || !data.user) {
      await audit(req, "admin.create_user.failed", { email: body.eposta });
      return NextResponse.json({ hata: "Kullanıcı oluşturulamadı" }, { status: 400 });
    }

    const uid = data.user.id;
    const { error: err2 } = await admin.from("profiles").insert({
      id: uid,
      rol: body.rol,
      ad_soyad: body.ad_soyad,
      telefon: body.telefon?.trim() || null
    });
    if (err2) {
      await audit(req, "admin.create_user.profile_failed", { id: uid, email: body.eposta });
      return NextResponse.json({ hata: "Profil oluşturulamadı" }, { status: 400 });
    }

    // FK bağımlılıkları (training_sessions / attendance) için rol tablolarını garantiye al
    if (body.rol === "antrenor") {
      await admin.from("coaches").insert({ id: uid }).throwOnError();
    }
    if (body.rol === "veli") {
      await admin.from("parents").insert({ id: uid }).throwOnError();
    }

    await audit(req, "admin.create_user", { id: uid, email: body.eposta, rol: body.rol }, "warning");
    return NextResponse.json({ ok: true, id: uid });
  } catch (e) {
    return jsonError(e);
  }
}
