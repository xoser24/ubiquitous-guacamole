"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { FinanceOpsLedgerModalClient } from "@/components/finance/ops/FinanceOpsLedgerModalClient";

type Tx = {
  tur: "gelir" | "gider";
  kategori: string;
  tutar: number;
  tarih: string;
};

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

const GELIR_KATEGORILER = ["Aidatlar", "Kamp Gelirleri", "Forma Satışları", "Özel Dersler", "Sponsorluklar"];
const GIDER_KATEGORILER = ["Saha Kirası", "Maaşlar", "Ekipman", "Ulaşım", "Organizasyonlar"];

function normalizeKategori(k: string, tur: "gelir" | "gider") {
  const s = (k ?? "").trim();
  if (!s) return "Diğer";
  // Mevcut verilerde “Aylık Aidat” varsa “Aidatlar” altında topla
  if (/aidat/i.test(s) && tur === "gelir") return "Aidatlar";
  return s;
}

export function FinanceOpsSummaryClient({
  monthKey,
  txThisMonth,
  prevGelir,
  prevGider
}: {
  monthKey: string;
  txThisMonth: Tx[];
  prevGelir?: number;
  prevGider?: number;
}) {
  const reduce = useReducedMotion();
  const [ledgerOpen, setLedgerOpen] = useState<null | "gelir" | "gider">(null);

  const agg = useMemo(() => {
    const m = new Map<string, number>();
    (txThisMonth ?? []).forEach((t) => {
      const key = normalizeKategori(t.kategori, t.tur);
      m.set(`${t.tur}|${key}`, (m.get(`${t.tur}|${key}`) ?? 0) + Number(t.tutar ?? 0));
    });
    return m;
  }, [txThisMonth]);

  const totalGelir = useMemo(() => {
    let s = 0;
    (txThisMonth ?? []).forEach((t) => (t.tur === "gelir" ? (s += Number(t.tutar ?? 0)) : null));
    return s;
  }, [txThisMonth]);
  const totalGider = useMemo(() => {
    let s = 0;
    (txThisMonth ?? []).forEach((t) => (t.tur === "gider" ? (s += Number(t.tutar ?? 0)) : null));
    return s;
  }, [txThisMonth]);

  const trend = (cur: number, prevValue: number | null | undefined, goodWhenUp: boolean) => {
    if (!prevValue || prevValue <= 0) return null;
    const pct = Math.round(((cur - prevValue) / prevValue) * 100);
    const up = pct >= 0;
    const good = goodWhenUp ? up : !up;
    return {
      label: `${up ? "▲" : "▼"} %${Math.abs(pct)}`,
      cls: good ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"
    };
  };

  const gelirTrend = useMemo(() => trend(totalGelir, prevGelir, true), [totalGelir, prevGelir]);
  const giderTrend = useMemo(() => trend(totalGider, prevGider, false), [totalGider, prevGider]);

  const card = (tur: "gelir" | "gider") => {
    const cats = tur === "gelir" ? GELIR_KATEGORILER : GIDER_KATEGORILER;
    const rows = cats.map((c) => ({ kategori: c, tutar: agg.get(`${tur}|${c}`) ?? 0 }));
    const other = Array.from(agg.entries())
      .filter(([k]) => k.startsWith(`${tur}|`) && !cats.includes(k.split("|")[1] ?? ""))
      .reduce((a, [, v]) => a + v, 0);
    if (other > 0) rows.push({ kategori: "Diğer", tutar: other });
    const sum = rows.reduce((a, r) => a + r.tutar, 0);
    return { rows, sum };
  };

  const gelirCard = useMemo(() => card("gelir"), [agg]);
  const giderCard = useMemo(() => card("gider"), [agg]);

  return (
    <section className="space-y-3">
      <FinanceOpsLedgerModalClient open={ledgerOpen === "gelir"} onClose={() => setLedgerOpen(null)} initialTur="gelir" />
      <FinanceOpsLedgerModalClient open={ledgerOpen === "gider"} onClose={() => setLedgerOpen(null)} initialTur="gider" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold">Gelir / Gider Özeti</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Form yok, sadece operasyon görünümü. Ekleme işlemleri “Hızlı” menüsünden de yapılır.</div>
        </div>
        <div className="chip">Kategori toplamları • Bu ay</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          className="card card-neon p-6 relative overflow-hidden"
          initial={reduce ? undefined : { opacity: 0, y: 10 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full neon-dot opacity-60" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">💰 GELİRLER</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--gold)]">{fmtMoney(totalGelir)} ₺</div>
                {gelirTrend && <span className={`text-xs rounded-full border px-2 py-1 ${gelirTrend.cls}`}>{gelirTrend.label}</span>}
              </div>
              <div className="text-xs text-[color:var(--muted)] mt-1">Dönem: {monthKey}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button className="btn-primary" type="button" onClick={() => setLedgerOpen("gelir")}>
                + Gelir Ekle
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {gelirCard.rows.map((r) => (
              <div key={r.kategori} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-sm">{r.kategori}</div>
                <div className="text-sm font-semibold tabular-nums">{fmtMoney(r.tutar)} ₺</div>
              </div>
            ))}
            {gelirCard.rows.length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
          </div>
        </motion.div>

        <motion.div
          className="card card-neon p-6 relative overflow-hidden"
          initial={reduce ? undefined : { opacity: 0, y: 10 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.03, ease: "easeOut" }}
        >
          <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full neon-dot opacity-55" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">💸 GİDERLER</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--gold)]">{fmtMoney(totalGider)} ₺</div>
                {giderTrend && <span className={`text-xs rounded-full border px-2 py-1 ${giderTrend.cls}`}>{giderTrend.label}</span>}
              </div>
              <div className="text-xs text-[color:var(--muted)] mt-1">Dönem: {monthKey}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button className="btn-primary" type="button" onClick={() => setLedgerOpen("gider")}>
                + Gider Ekle
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {giderCard.rows.map((r) => (
              <div key={r.kategori} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-sm">{r.kategori}</div>
                <div className="text-sm font-semibold tabular-nums">{fmtMoney(r.tutar)} ₺</div>
              </div>
            ))}
            {giderCard.rows.length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
