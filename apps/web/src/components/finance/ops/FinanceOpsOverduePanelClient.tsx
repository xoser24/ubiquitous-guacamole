"use client";

import dayjs from "dayjs";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { FinanceWhatsAppActionsClient } from "@/components/finance/FinanceWhatsAppActionsClient";

type Student = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  veli_telefon?: string | null;
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
};

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

export function FinanceOpsOverduePanelClient({
  today,
  students,
  overduePayments
}: {
  today: string;
  students: Student[];
  overduePayments: StudentPayment[];
}) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    (students ?? []).forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const stats = useMemo(() => {
    const list = overduePayments ?? [];
    const amounts = list.map((p) => Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0)));
    const total = amounts.reduce((a, b) => a + b, 0);
    const oldest = list.length ? list.reduce((a, b) => (a.son_odeme_tarihi < b.son_odeme_tarihi ? a : b)).son_odeme_tarihi : null;
    const avgDelay =
      list.length > 0
        ? Math.round(list.reduce((a, p) => a + dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day"), 0) / list.length)
        : 0;
    return { count: list.length, total, oldest, avgDelay };
  }, [overduePayments, today]);

  const list = useMemo(() => {
    const base = (overduePayments ?? []).map((p) => {
      const s = studentMap.get(p.student_id);
      const kalan = Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0));
      const gecikme = dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day");
      return { ...p, student: s, kalan, gecikme };
    });
    base.sort((a, b) => b.gecikme - a.gecikme);
    if (!q.trim()) return base.slice(0, 40);
    const qq = q.toLowerCase();
    return base.filter((x) => (x.student?.ad_soyad ?? "").toLowerCase().includes(qq)).slice(0, 40);
  }, [overduePayments, studentMap, q, today]);

  async function topluWhatsApp(n = 10) {
    setBulkInfo(null);
    setBulkError(null);
    if (bulkLoading) return;

    const targets = list.slice(0, n);
    if (targets.length === 0) return;

    const ok = window.confirm(`İlk ${targets.length} gecikmiş kayda WhatsApp hatırlatma kuyruğa eklensin mi?`);
    if (!ok) return;

    setBulkLoading(true);
    try {
      let success = 0;
      let fail = 0;

      for (const x of targets) {
        const text = `🔴 Gecikmiş Ödeme Hatırlatma\n\n${x.student?.ad_soyad ?? "Öğrenci"} için ${x.donem} dönemi (${x.gelir_kategorisi}) ödemesi gecikmiştir.\nKalan: ${fmtMoney(x.kalan)} ₺\nVade: ${x.son_odeme_tarihi} (${x.gecikme} gün gecikme)\n\nÖdeme/detay için dönüş yapabilir misiniz?`;
        const r = await fetch("/api/finance/whatsapp/send-student", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            studentId: x.student_id,
            text,
            dedupeKey: `finance:bulk-overdue:${x.id}:${today}`,
            related: { student_payment_id: x.id, tur: "gecikmis_toplu" }
          })
        });
        if (r.ok) success++;
        else fail++;
      }

      setBulkInfo(`${success} kayıt kuyruğa eklendi${fail ? `, ${fail} hata` : ""}.`);
    } catch (e: any) {
      setBulkError(e?.message ?? "Toplu gönderim başarısız.");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold">🔴 Gecikmiş Ödemeler</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Önceliklendirilmiş tahsilat listesi.</div>
        </div>
        <input className="input max-w-sm" placeholder="Gecikmişlerde ara..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <motion.div
        className="card card-neon p-6 border border-red-500/25 bg-red-500/5"
        initial={reduce ? undefined : { opacity: 0, y: 10 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-[color:var(--muted)]">🔴 Gecikmiş Tahsilatlar</div>
            <div className="text-2xl md:text-3xl font-semibold mt-2 tabular-nums text-[color:var(--gold)]">{fmtMoney(stats.total)} ₺</div>
            <div className="text-sm text-[color:var(--muted)] mt-2">
              {stats.count} kayıt • En eski borç: {stats.oldest ?? "—"} • Ortalama gecikme: {stats.avgDelay} gün
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost" href="/finans/gecikmis">
              Detay ekranı
            </a>
            <button className="btn-primary" type="button" onClick={() => topluWhatsApp(10)} disabled={bulkLoading}>
              {bulkLoading ? "Toplu WhatsApp…" : "Toplu WhatsApp (İlk 10)"}
            </button>
            <a className="btn-primary" href="/finans/hatirlatmalar">
              Toplu Hatırlatma
            </a>
          </div>
        </div>
        {(bulkInfo || bulkError) && (
          <div className="mt-3 text-sm">
            {bulkInfo && <div className="text-[color:var(--success)]">{bulkInfo}</div>}
            {bulkError && <div className="text-[color:var(--danger)]">{bulkError}</div>}
          </div>
        )}
      </motion.div>

      <div className="card card-neon p-6">
        {list.length === 0 ? (
          <div className="text-[color:var(--muted)]">Gecikmiş kayıt yok.</div>
        ) : (
          <div className="space-y-3">
            {list.map((x) => (
              <div key={x.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {x.student?.ad_soyad ?? x.student_id} <span className="text-xs text-[color:var(--muted)]">• {x.student?.yas_grubu ?? ""}</span>
                    </div>
                    <div className="text-sm text-[color:var(--muted)] mt-1">
                      {x.gelir_kategorisi} • {x.donem} • Vade: {x.son_odeme_tarihi} • <span className="text-[color:var(--danger)]">{x.gecikme} gün gecikme</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                    <div className="text-lg font-semibold tabular-nums">{fmtMoney(x.kalan)} ₺</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a className="btn-ghost" href={`/finans/ogrenci/${x.student_id}`}>
                    Detay
                  </a>
                  <FinanceWhatsAppActionsClient
                    studentId={x.student_id}
                    dedupeKey={`finance:overdue:${x.student_id}:${today}`}
                    related={{ student_id: x.student_id, tur: "gecikmis", payment_id: x.id }}
                    buttonLabel="WhatsApp Hatırlatma"
                    buttonClassName="btn-mini-primary"
                    defaultText={`🔴 Gecikmiş Ödeme Hatırlatma\n\n${x.student?.ad_soyad ?? "Öğrenci"} için ${x.donem} dönemi (${x.gelir_kategorisi}) ödemesi gecikmiştir.\nKalan: ${fmtMoney(x.kalan)} ₺\nVade: ${x.son_odeme_tarihi} (${x.gecikme} gün gecikme)\n\nÖdeme/detay için dönüş yapabilir misiniz?`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
