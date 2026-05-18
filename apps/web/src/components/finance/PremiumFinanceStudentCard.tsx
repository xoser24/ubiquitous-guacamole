"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

function severity(daysLate: number) {
  if (daysLate >= 30) return "kritik";
  if (daysLate >= 7) return "orta";
  if (daysLate >= 1) return "dusuk";
  return "0";
}

export function PremiumFinanceStudentCard({
  id,
  ad_soyad,
  yas_grubu,
  veli_telefon,
  kalan,
  son,
  durum,
  gecikme,
  borc_sayisi,
  trend
}: {
  id: string;
  ad_soyad: string;
  yas_grubu?: string | null;
  veli_telefon?: string | null;
  kalan: number;
  son?: string | null;
  durum: "ödendi" | "kısmi" | "gecikmiş" | "bekliyor";
  gecikme: number;
  borc_sayisi: number;
  trend: number[]; // 0-100, son 6 ay (tahsilat yüzdesi)
}) {
  const reduce = useReducedMotion();
  const sev = severity(gecikme);
  const statusChip =
    durum === "ödendi"
      ? "🟢 ödendi"
      : durum === "kısmi"
        ? "🟡 kısmi ödendi"
        : durum === "gecikmiş"
          ? "🔴 gecikmiş"
          : "⚪ bekliyor";

  const glow =
    sev === "kritik"
      ? "radial-gradient(circle at 25% 20%, rgba(239,68,68,.25), rgba(239,68,68,0) 55%)"
      : sev === "orta"
        ? "radial-gradient(circle at 25% 20%, rgba(245,158,11,.22), rgba(245,158,11,0) 55%)"
        : "radial-gradient(circle at 25% 20%, rgba(212,175,55,.18), rgba(212,175,55,0) 55%)";

  return (
    <motion.div
      className="card card-neon card-neon-hover p-4 md:p-5 overflow-hidden relative"
      initial={reduce ? undefined : { opacity: 0, y: 10 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={reduce ? undefined : { scale: 1.01 }}
    >
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-60 blur-2xl"
        style={{ background: glow }}
        animate={reduce ? undefined : { x: [0, -8, 0], y: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base md:text-lg font-semibold truncate">{ad_soyad}</div>
          <div className="text-sm text-[color:var(--muted)] mt-0.5">
            {yas_grubu ?? "-"} • Kalan: {fmtMoney(kalan)} ₺
          </div>
        </div>

        <motion.span
          className="chip"
          animate={reduce || durum !== "gecikmiş" ? undefined : { opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {statusChip}
        </motion.span>
      </div>

      {/* mini trend (son 6 ay tahsilat yüzdesi) */}
      <div className="mt-3">
        <div className="text-xs text-[color:var(--muted)] mb-2">Tahsilat treni (son 6 ay)</div>
        <div className="flex items-end gap-1 h-10">
          {trend.map((v, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-md border border-white/10"
              style={{
                transformOrigin: "bottom",
                background:
                  "linear-gradient(180deg, rgba(212,175,55,.85) 0%, rgba(212,175,55,.15) 90%)"
              }}
              initial={reduce ? undefined : { scaleY: 0 }}
              animate={reduce ? undefined : { scaleY: Math.max(0.12, Math.min(1, v / 100)) }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
              title={`${v}%`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-[color:var(--muted)]">Son tarih</div>
          <div className="font-semibold">{son ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-[color:var(--muted)]">Gecikme</div>
          <div className="font-semibold">{kalan > 0 && gecikme > 0 ? `${gecikme} gün` : "—"}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-[color:var(--muted)]">Borç adedi</div>
          <div className="font-semibold">{borc_sayisi}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-[color:var(--muted)]">Veli: {veli_telefon ?? "-"}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn-ghost" href={`/ogrenciler/${id}`}>
          Oyuncu
        </Link>
        <Link className="btn-primary" href={`/finans/ogrenci/${id}`}>
          Tahsilat
        </Link>
      </div>
    </motion.div>
  );
}
