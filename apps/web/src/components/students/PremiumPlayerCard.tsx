"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type Perf = { hiz?: number | null; sut?: number | null; pas?: number | null; dayaniklilik?: number | null };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pct(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Math.max(0, Math.min(100, isFinite(n) ? n : 0));
}

function MetricBar({ label, value }: { label: string; value?: number | null }) {
  const p = pct(value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[color:var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums">{value == null ? "-" : p}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-black/35 border border-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background:
              "linear-gradient(90deg, rgba(212,175,55,.15) 0%, rgba(212,175,55,.8) 55%, rgba(255,255,255,.15) 100%)"
          }}
        />
      </div>
    </div>
  );
}

export function PremiumPlayerCard({
  id,
  ad_soyad,
  yas_grubu,
  mevki,
  ayak,
  boy_cm,
  kilo_kg,
  aktifSakatlik,
  perf
}: {
  id: string;
  ad_soyad: string;
  yas_grubu?: string | null;
  mevki?: string | null;
  ayak?: string | null;
  boy_cm?: number | null;
  kilo_kg?: number | null;
  aktifSakatlik?: string | null;
  perf?: Perf | null;
}) {
  const reduce = useReducedMotion();
  const p = perf ?? {};
  const avg = Math.round((pct(p.hiz) + pct(p.sut) + pct(p.pas) + pct(p.dayaniklilik)) / 4);
  const ring = clamp01(avg / 100);

  return (
    <Link href={`/ogrenciler/${id}`} className="block">
      <motion.div
        className="card card-neon card-neon-hover p-4 md:p-5 overflow-hidden relative"
        initial={reduce ? undefined : { opacity: 0, y: 10 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileHover={reduce ? undefined : { scale: 1.01 }}
      >
        {/* premium glow line */}
        <motion.div
          aria-hidden
          className="absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-40 blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(212,175,55,.35), rgba(212,175,55,0) 60%)"
          }}
          animate={reduce ? undefined : { x: [0, -8, 0], y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="flex items-start gap-3">
          <div className="size-11 rounded-2xl border border-white/10 flex items-center justify-center text-lg neon-icon">
            ⚽
          </div>

          <div className="min-w-0">
            <div className="font-semibold text-base md:text-lg truncate">{ad_soyad}</div>
            <div className="text-sm text-[color:var(--muted)] mt-0.5">
              {yas_grubu ?? "-"} • {mevki ?? "-"} • {ayak ?? "-"} ayak
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col items-end gap-2">
            {/* overall ring */}
            <div
              className="size-10 md:size-11 rounded-2xl border border-white/10 bg-white/5 grid place-items-center"
              style={{
                backgroundImage: `conic-gradient(rgba(212,175,55,.95) ${Math.round(ring * 360)}deg, rgba(255,255,255,.08) 0deg)`
              }}
            >
              <div className="size-8 md:size-9 rounded-xl bg-[color:var(--bg)]/90 border border-white/10 grid place-items-center">
                <div className="text-xs font-semibold tabular-nums">{avg}</div>
              </div>
            </div>

            {aktifSakatlik ? (
              <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                Sakatlık
              </span>
            ) : (
              <motion.span
                className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                animate={reduce ? undefined : { opacity: [1, 0.75, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                Aktif
              </motion.span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Boy: {boy_cm ?? "-"} cm
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Kilo: {kilo_kg ?? "-"} kg
          </span>
          {aktifSakatlik ? (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Not: {aktifSakatlik}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Sağlık: OK
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricBar label="Hız" value={p.hiz} />
          <MetricBar label="Şut" value={p.sut} />
          <MetricBar label="Pas" value={p.pas} />
          <MetricBar label="Dayanıklılık" value={p.dayaniklilik} />
        </div>
      </motion.div>
    </Link>
  );
}
