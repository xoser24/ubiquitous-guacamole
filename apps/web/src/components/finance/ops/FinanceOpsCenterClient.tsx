"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FinanceOpsKpiCardsClient } from "@/components/finance/ops/FinanceOpsKpiCardsClient";
import { FinanceOpsAidatTableClient } from "@/components/finance/ops/FinanceOpsAidatTableClient";
import { FinanceOpsSummaryClient } from "@/components/finance/ops/FinanceOpsSummaryClient";
import { FinanceOpsTimelineClient } from "@/components/finance/ops/FinanceOpsTimelineClient";
import { FinanceOpsOverduePanelClient } from "@/components/finance/ops/FinanceOpsOverduePanelClient";
import { FinanceOpsAlertsClient } from "@/components/finance/ops/FinanceOpsAlertsClient";
import { FinanceOpsQuickActionsFabClient } from "@/components/finance/ops/FinanceOpsQuickActionsFabClient";

type Student = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  veli_telefon?: string | null;
  parent_id?: string | null;
  aidat_vade_gunu?: number | null;
  aylik_aidat_tutar?: number | null;
};

type StudentPayment = {
  id: string;
  student_id: string;
  donem: string;
  gelir_kategorisi: string;
  tutar_toplam: number;
  tutar_odenen: number;
  son_odeme_tarihi: string;
  durum: string;
  updated_at?: string;
};

type Tx = {
  id: string;
  tur: "gelir" | "gider";
  kategori: string;
  tutar: number;
  tarih: string;
  aciklama?: string | null;
  student_id?: string | null;
  created_at?: string;
};

type PendingSubmission = any;

export function FinanceOpsCenterClient({
  monthKey,
  today,
  students,
  aidatThisMonth,
  overduePayments,
  upcomingPayments,
  pendingSubmissions,
  txThisMonth,
  txRecent,
  kpis
}: {
  monthKey: string;
  today: string;
  students: Student[];
  aidatThisMonth: StudentPayment[];
  overduePayments: StudentPayment[];
  upcomingPayments: StudentPayment[];
  pendingSubmissions: PendingSubmission[];
  txThisMonth: Tx[];
  txRecent: Tx[];
  kpis: {
    gelir: number;
    gider: number;
    net: number;
    gecikmisAlacak: number;
    tahsilatOrani: number;
    riskliVeliler: number;
    prevGelir: number;
    prevGider: number;
    prevNet: number;
  };
}) {
  const studentNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (students ?? []).forEach((s) => m.set(s.id, s.ad_soyad));
    return m;
  }, [students]);

  // Basit “real-time hissi”: timeline verisini periyodik yenile (yalnızca son hareketler)
  const [liveTx, setLiveTx] = useState<Tx[]>(txRecent ?? []);
  const [livePendingCount, setLivePendingCount] = useState<number>(pendingSubmissions?.length ?? 0);
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/finance/ops/recent", { method: "GET" });
        const j = await r.json().catch(() => ({}));
        if (!mounted) return;
        if (r.ok) {
          if (Array.isArray(j.transactions)) setLiveTx(j.transactions);
          if (typeof j.pendingCount === "number") setLivePendingCount(j.pendingCount);
        }
      } catch {
        // sessiz
      }
    };
    const id = window.setInterval(tick, 15000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const alerts = useMemo(() => {
    const list: { title: string; desc: string; tone: "danger" | "warn" | "info" | "ok" }[] = [];

    const overdueCount = overduePayments?.length ?? 0;
    const upcomingCount = upcomingPayments?.length ?? 0;
    if (overdueCount > 0) list.push({ title: `⚠️ ${overdueCount} öğrencinin ödemesi gecikti`, desc: "Gecikmişler panelinden hızlıca hatırlatma gönderebilirsin.", tone: "danger" });
    if (upcomingCount > 0) list.push({ title: `📅 ${upcomingCount} ödeme 7 gün içinde`, desc: "Bugün/hafta tahsil edilecekleri öne al.", tone: "info" });
    if (livePendingCount > 0) list.push({ title: `🧾 ${livePendingCount} dekont onayı bekliyor`, desc: "Bekleyen dekontları onaylayınca gelir otomatik kayda düşer.", tone: "warn" });

    const prev = kpis.prevGider || 0;
    const cur = kpis.gider || 0;
    if (prev > 0) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      if (pct >= 18) list.push({ title: `⚠️ Bu ay giderler %${pct} arttı`, desc: "Gider kalemleri detayından hangi kategorinin arttığını kontrol et.", tone: "warn" });
    }

    if (kpis.tahsilatOrani < 60 && aidatThisMonth.length > 0) list.push({ title: "⚠️ Tahsilat oranı düşük", desc: "Aidat tablosundan gecikmiş/bekleyenleri filtreleyip hızlı aksiyon al.", tone: "warn" });
    if (list.length === 0) list.push({ title: "✅ Operasyon temiz görünüyor", desc: "Gecikme yok veya çok düşük. Harika!", tone: "ok" });
    return list.slice(0, 4);
  }, [overduePayments, upcomingPayments, livePendingCount, kpis, aidatThisMonth.length]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full neon-dot opacity-80" />
        <div aria-hidden className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full neon-dot opacity-60" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-[color:var(--muted)]">⚽ Futbol Akademisi Finans Operasyon Merkezi</div>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Finans Operasyon Merkezi</h1>
            <div className="text-sm text-[color:var(--muted)] mt-2">
              Dönem: <span className="chip">{monthKey}</span> • Son güncelleme: <span className="chip">{dayjs().format("HH:mm")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="chip">🔴 Gecikmiş: {overduePayments?.length ?? 0}</span>
            <span className="chip">📅 7 gün: {upcomingPayments?.length ?? 0}</span>
            <span className="chip">🧾 Bekleyen dekont: {livePendingCount}</span>
          </div>
        </div>
      </div>

      {/* 1) KPI TOP CARDS */}
      <FinanceOpsKpiCardsClient kpis={kpis} />

      {/* 2) AIDAT TAKİBİ */}
      <FinanceOpsAidatTableClient
        monthKey={monthKey}
        today={today}
        students={students}
        aidatThisMonth={aidatThisMonth}
        pendingSubmissions={pendingSubmissions}
      />

      {/* 3) GELİR / GİDER ÖZETİ */}
      <FinanceOpsSummaryClient monthKey={monthKey} txThisMonth={txThisMonth} prevGelir={kpis.prevGelir} prevGider={kpis.prevGider} />

      {/* 4) SON FİNANS HAREKETLERİ */}
      <FinanceOpsTimelineClient transactions={liveTx} studentNameMap={studentNameMap} />

      {/* 5) GECİKMİŞ ÖDEMELER PANELİ */}
      <FinanceOpsOverduePanelClient today={today} students={students} overduePayments={overduePayments} />

      {/* 6) FİNANS UYARILARI */}
      <FinanceOpsAlertsClient alerts={alerts} />

      {/* 7) QUICK ACTIONS */}
      <motion.div
        className="card card-neon p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="font-semibold">Hızlı İşlemler</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Formlar sayfayı boğmasın diye tüm işlemler modal üzerinden açılır.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-ghost" href="/finans/aidat">
            Aidat Takibi (Detay)
          </a>
          <a className="btn-ghost" href="/finans/defter">
            Gelir/Gider (Detay)
          </a>
          <a className="btn-ghost" href="/finans/hatirlatmalar">
            Hatırlatmalar
          </a>
        </div>
      </motion.div>

      <FinanceOpsQuickActionsFabClient monthKey={monthKey} />
    </div>
  );
}
