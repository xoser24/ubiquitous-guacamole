import { NextResponse } from "next/server";
import { dispatchWhatsAppOutbox } from "@/lib/whatsapp-dispatch";
import { assertSameOrigin, audit, jsonError, rateLimit, requireRole, requireUser } from "@/lib/api-guard";

// Basit dispatcher: pending mesajları gönderir.
// Not: Production'da bunu bir cron (Supabase Scheduled Trigger / external cron) ile çağırın.
export async function POST(req: Request) {
  try {
    // 1) Cron/server-to-server çağrısı için secret (önerilen)
    // 2) Panelden manuel tetik için admin session
    const secret = req.headers.get("x-dispatch-secret");
    const expected = process.env.WHATSAPP_DISPATCH_SECRET;
    if (expected && secret === expected) {
      await rateLimit(req, "whatsapp.dispatch.secret", 30, 60);
      const result = await dispatchWhatsAppOutbox(25);
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    }

    // admin panel tetik
    assertSameOrigin(req);
    const { profil } = await requireUser(req);
    requireRole(profil.rol, ["admin"]);
    await rateLimit(req, "whatsapp.dispatch.admin", 10, 60);
    const result = await dispatchWhatsAppOutbox(25);
    await audit(req, "whatsapp.dispatch", result, "info");
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}
