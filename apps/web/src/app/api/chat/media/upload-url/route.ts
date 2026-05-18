import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserAny, jsonError, parseJson, rateLimit, assertSameOrigin } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CHAT_MEDIA_BUCKET, validateChatMedia } from "@/lib/chat-media";
import crypto from "node:crypto";

// İstemci bu endpoint'ten signed upload URL alır ve direkt storage'a upload eder.
// Storage bucket/policy kurulumu için dokümana bakın (chat media security).
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { profil } = await requireUserAny(req);
    await rateLimit(req, "chat.media.upload_url", 20, 60);

    const schema = z.object({
      conversationId: z.string().uuid(),
      mime: z.string().min(3),
      size: z.number().int()
    });
    const body = await parseJson(req, schema);

    const v = validateChatMedia(body.mime, body.size);
    if (!v.ok) return NextResponse.json({ hata: v.error }, { status: 400 });

    // Üyelik kontrolü (DB/RLS seviyesinde değil, service role kullandığımız için burada kontrol ediyoruz)
    const admin = supabaseAdmin();
    const { data: member, error: memErr } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", body.conversationId)
      .eq("user_id", profil.id)
      .maybeSingle();
    if (memErr) return NextResponse.json({ hata: "Üyelik kontrolü başarısız" }, { status: 400 });
    if (!member) return NextResponse.json({ hata: "Yetkisiz" }, { status: 403 });

    const ext =
      body.mime === "image/jpeg" ? "jpg" : body.mime === "image/png" ? "png" : "webp";
    const objectPath = `conversations/${body.conversationId}/${profil.id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await admin.storage
      .from(CHAT_MEDIA_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      return NextResponse.json({ hata: "Upload URL oluşturulamadı" }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        bucket: CHAT_MEDIA_BUCKET,
        path: objectPath,
        uploadUrl: data.signedUrl,
        token: (data as any).token ?? null
      },
      { status: 200 }
    );
  } catch (e) {
    return jsonError(e);
  }
}
