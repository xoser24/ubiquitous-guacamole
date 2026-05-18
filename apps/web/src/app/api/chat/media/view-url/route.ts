import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, jsonError, parseJson, rateLimit, requireUserAny } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CHAT_MEDIA_BUCKET } from "@/lib/chat-media";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    await rateLimit(req, "chat.media.view_url", 60, 60);

    const schema = z.object({
      conversationId: z.string().uuid(),
      path: z.string().min(3)
    });
    const body = await parseJson(req, schema);

    const admin = supabaseAdmin();
    const { data: member, error: memErr } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", body.conversationId)
      .eq("user_id", profil.id)
      .maybeSingle();
    if (memErr) return NextResponse.json({ hata: "Üyelik kontrolü başarısız" }, { status: 400 });
    if (!member) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });

    const { data, error } = await admin.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(body.path, 60 * 30); // 30 dk
    if (error || !data) return NextResponse.json({ hata: "Signed URL oluşturulamadı" }, { status: 400 });

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl }, { status: 200 });
  } catch (e) {
    return jsonError(e);
  }
}

