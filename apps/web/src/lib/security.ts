import crypto from "node:crypto";

export function getRequestIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export function getUserAgent(req: Request) {
  return req.headers.get("user-agent");
}

export function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// Meta webhook imzası doğrulama: X-Hub-Signature-256: sha256=<hex>
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader) return false;
  const m = signatureHeader.match(/^sha256=(.+)$/);
  if (!m) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqualHex(expected, m[1]);
}

