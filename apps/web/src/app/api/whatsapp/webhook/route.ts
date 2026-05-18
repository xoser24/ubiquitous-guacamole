import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestIp, getUserAgent, verifyMetaSignature } from "@/lib/security";

// Meta webhook doğrulama (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      return NextResponse.json({ error: "WHATSAPP_VERIFY_TOKEN eksik." }, { status: 500 });
    }
    if (token !== verifyToken) {
      return NextResponse.json({ error: "verify_token uyuşmuyor." }, { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Gelen mesaj/event (POST)
export async function POST(req: Request) {
  // Raw body ile imza doğrulama (opsiyonel ama prod için önerilir)
  const rawBody = await req.text();
  const payload = (rawBody ? (JSON.parse(rawBody) as any) : null) as any;
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = verifyMetaSignature(rawBody, sig, appSecret);
    if (!ok) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  // Basit inbox log (ileride sohbet modülüne bağlanacak)
  try {
    const sb = supabaseAdmin();

    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];

    const waMessageId = msg?.id ?? null;
    const fromPhone = msg?.from ? `+${String(msg.from).replace(/[^0-9]/g, "")}` : null;
    const type = msg?.type ?? null;
    const textBody = msg?.text?.body ?? null;

    await sb.from("whatsapp_inbox").insert({
      wa_message_id: waMessageId,
      from_phone: fromPhone,
      message_type: type,
      text_body: textBody,
      payload
    });
  } catch {
    // webhook'u asla fail etmeyelim
  }

  // Aktivite log (auth yok, sadece IP/UA)
  try {
    const sb = supabaseAdmin();
    await sb.from("audit_logs").insert({
      actor_id: null,
      severity: "info",
      action: "whatsapp.webhook",
      entity: "whatsapp",
      ip: getRequestIp(req),
      user_agent: getUserAgent(req),
      meta: { hasSignature: !!req.headers.get("x-hub-signature-256") }
    });
  } catch {}

  return NextResponse.json({ ok: true }, { status: 200 });
}
