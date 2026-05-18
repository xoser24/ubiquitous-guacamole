export const CHAT_MEDIA_BUCKET = "chat-media";

export const ALLOWED_CHAT_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateChatMedia(mime: string, size: number) {
  if (!ALLOWED_CHAT_MIME.has(mime)) {
    return { ok: false as const, error: "Sadece JPEG/PNG/WEBP desteklenir." };
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_CHAT_IMAGE_BYTES) {
    return { ok: false as const, error: "Dosya boyutu çok büyük. (Max 5 MB)" };
  }
  return { ok: true as const };
}

