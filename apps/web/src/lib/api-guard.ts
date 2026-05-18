import { NextResponse } from "next/server";
import { z } from "zod";
import type { Rol } from "@fa/shared";
import { oturumVeProfilGetir } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRequestIp, getUserAgent } from "@/lib/security";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ hata: e.message, kod: e.code }, { status: e.status });
  }
  return NextResponse.json({ hata: "Beklenmeyen hata" }, { status: 500 });
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  // Tarayıcı dışı isteklerde origin gelmeyebilir (örn. server-to-server). Bu durumda engellemiyoruz.
  if (!origin || !host) return;
  try {
    const u = new URL(origin);
    if (u.host !== host) {
      throw new ApiError(403, "csrf", "Geçersiz origin.");
    }
  } catch {
    throw new ApiError(403, "csrf", "Geçersiz origin.");
  }
}

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T) {
  const body = await req.json().catch(() => null);
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new ApiError(400, "validation", "Geçersiz istek.");
  }
  return r.data as z.infer<T>;
}

export async function requireUser(req: Request) {
  const { user, profil } = await oturumVeProfilGetir();
  if (!user || !profil) throw new ApiError(401, "auth", "Oturum gerekli.");
  return { user, profil };
}

// Mobil (Expo) gibi cookie olmayan istemciler için Authorization: Bearer <access_token> desteği.
export async function requireUserAny(req: Request) {
  // 1) Cookie session (web)
  const { user, profil } = await oturumVeProfilGetir();
  if (user && profil) return { user, profil };

  // 2) Bearer token (mobile)
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new ApiError(401, "auth", "Oturum gerekli.");

  const token = m[1];
  const admin = supabaseAdmin();
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u.user) throw new ApiError(401, "auth", "Geçersiz oturum.");

  const { data: p } = await admin
    .from("profiles")
    .select("id, rol, ad_soyad, telefon")
    .eq("id", u.user.id)
    .maybeSingle();
  if (!p) throw new ApiError(401, "auth", "Profil bulunamadı.");

  return { user: u.user, profil: p as any };
}

export function requireRole(profilRol: Rol, allowed: Rol[]) {
  if (!allowed.includes(profilRol)) throw new ApiError(403, "rbac", "Yetkisiz.");
}

export async function rateLimit(req: Request, key: string, limit: number, windowSeconds: number) {
  try {
    const admin = supabaseAdmin();
    const ip = getRequestIp(req) ?? "unknown";
    const ok = await admin.rpc("check_rate_limit", {
      p_key: `${key}:${ip}`,
      p_limit: limit,
      p_window_seconds: windowSeconds
    });
    if (ok.error) return; // rate limit yoksa route çalışsın (migration uygulanmamış olabilir)
    if (ok.data === false) throw new ApiError(429, "rate_limit", "Çok fazla istek. Lütfen biraz bekleyin.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // sessiz geç (prod'da audit ile takip edilir)
  }
}

export async function audit(req: Request, action: string, meta: Record<string, unknown> = {}, severity: "info" | "warning" | "critical" = "info") {
  try {
    const { profil } = await oturumVeProfilGetir();
    const admin = supabaseAdmin();
    await admin.from("audit_logs").insert({
      actor_id: profil?.id ?? null,
      severity,
      action,
      ip: getRequestIp(req),
      user_agent: getUserAgent(req),
      meta
    });
  } catch {
    // audit tablosu yoksa veya migration uygulanmadıysa sessiz geç
  }
}
