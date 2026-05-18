export const FINANCE_RECEIPTS_BUCKET = "dekontlar";

export function validateReceipt(mime: string, size: number) {
  const max = 10 * 1024 * 1024; // 10MB
  if (size <= 0 || size > max) return { ok: false as const, error: "Dekont boyutu 10MB altında olmalı." };

  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(mime)) {
    return { ok: false as const, error: "Sadece JPG/PNG/PDF dekont yüklenebilir." };
  }
  return { ok: true as const };
}

export function receiptExt(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "pdf";
}

