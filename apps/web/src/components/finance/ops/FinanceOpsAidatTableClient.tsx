"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FinanceWhatsAppActionsClient } from "@/components/finance/FinanceWhatsAppActionsClient";
import { StudentFinanceModalClient } from "@/components/finance/StudentFinanceModalClient";
import { FinanceOpsPaymentEntryModalClient } from "@/components/finance/ops/FinanceOpsPaymentEntryModalClient";
import { FinanceOpsReceiptModalClient } from "@/components/finance/ops/FinanceOpsReceiptModalClient";

type Student = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  veli_telefon?: string | null;
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

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

function statusBadge(s: string) {
  switch (s) {
    case "ödendi":
      return { label: "🟢 Ödendi", cls: "border-emerald-400/25 bg-emerald-400/10" };
    case "kısmi":
      return { label: "🟡 Kısmi", cls: "border-amber-400/25 bg-amber-400/10" };
    case "gecikmiş":
      return { label: "🔴 Gecikmiş", cls: "border-red-500/25 bg-red-500/10" };
    default:
      return { label: "⚪ Bekleniyor", cls: "border-white/10 bg-white/5" };
  }
}

type Row = {
  student: Student;
  payId: string | null;
  toplam: number | null;
  odenen: number;
  kalan: number | null;
  vade: string | null;
  gecikmeGun: number;
  sonOdeme: string | null;
  durum: "ödendi" | "kısmi" | "gecikmiş" | "ödenmedi";
};

export function FinanceOpsAidatTableClient({
  monthKey,
  today,
  students,
  aidatThisMonth,
  pendingSubmissions
}: {
  monthKey: string;
  today: string;
  students: Student[];
  aidatThisMonth: StudentPayment[];
  pendingSubmissions: any[];
}) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"hepsi" | Row["durum"]>("hepsi");
  const [sortKey, setSortKey] = useState<"gecikme" | "kalan" | "isim">("gecikme");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStudent, setDetailStudent] = useState<any | null>(null);
  const [detailPayments, setDetailPayments] = useState<any[]>([]);
  const [detailTx, setDetailTx] = useState<any[]>([]);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payModalStudent, setPayModalStudent] = useState<Student | null>(null);
  const [payModalRow, setPayModalRow] = useState<any | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string | null>(null);

  const byStudent = useMemo(() => {
    const m = new Map<string, StudentPayment>();
    (aidatThisMonth ?? []).forEach((p) => {
      m.set(p.student_id, p);
    });
    return m;
  }, [aidatThisMonth]);

  const pendingByStudent = useMemo(() => {
    const m = new Map<string, number>();
    (pendingSubmissions ?? []).forEach((s: any) => {
      const sid = s?.student_payments?.student_id;
      if (!sid) return;
      m.set(sid, (m.get(sid) ?? 0) + 1);
    });
    return m;
  }, [pendingSubmissions]);

  const rows: Row[] = useMemo(() => {
    return (students ?? []).map((st) => {
      const p = byStudent.get(st.id) ?? null;
      const vade = st.aidat_vade_gunu ? dayjs(`${monthKey}-${String(st.aidat_vade_gunu).padStart(2, "0")}`).format("YYYY-MM-DD") : null;
      const toplam = p?.tutar_toplam ?? (st.aylik_aidat_tutar ?? null);
      const odenen = Number(p?.tutar_odenen ?? 0);
      const kalan = toplam != null ? Math.max(0, Number(toplam) - Number(odenen)) : null;
      const isPaid = toplam != null && odenen >= Number(toplam);
      const due = p?.son_odeme_tarihi ?? vade;
      const gecikmeGun = !isPaid && due && due < today ? dayjs(today).diff(dayjs(due), "day") : 0;
      const durum: Row["durum"] = isPaid ? "ödendi" : odenen > 0 ? "kısmi" : gecikmeGun > 0 ? "gecikmiş" : "ödenmedi";
      const sonOdeme = odenen > 0 ? (p?.updated_at ? String(p.updated_at).slice(0, 10) : null) : null;

      return { student: st, payId: p?.id ?? null, toplam: toplam == null ? null : Number(toplam), odenen, kalan, vade: due ?? null, gecikmeGun, sonOdeme, durum };
    });
  }, [students, byStudent, monthKey, today]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = rows;
    if (qq) list = list.filter((r) => `${r.student.ad_soyad} ${r.student.yas_grubu}`.toLowerCase().includes(qq));
    if (filter !== "hepsi") list = list.filter((r) => r.durum === filter);

    list = [...list];
    list.sort((a, b) => {
      if (sortKey === "isim") return a.student.ad_soyad.localeCompare(b.student.ad_soyad, "tr");
      if (sortKey === "kalan") return (Number(b.kalan ?? 0) - Number(a.kalan ?? 0)) || b.gecikmeGun - a.gecikmeGun;
      return b.gecikmeGun - a.gecikmeGun || Number(b.kalan ?? 0) - Number(a.kalan ?? 0);
    });
    return list;
  }, [rows, q, filter, sortKey]);

  const stats = useMemo(() => {
    const total = filtered.reduce((a, r) => a + Number(r.toplam ?? 0), 0);
    const paid = filtered.reduce((a, r) => a + Number(r.odenen ?? 0), 0);
    const remain = filtered.reduce((a, r) => a + Number(r.kalan ?? 0), 0);
    const overdue = filtered.filter((r) => r.durum === "gecikmiş").length;
    return { total, paid, remain, overdue };
  }, [filtered]);

  async function openDetail(studentId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailStudent(null);
    setDetailPayments([]);
    setDetailTx([]);
    try {
      const r = await fetch("/api/finance/student/detail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Detay alınamadı.");
      setDetailStudent(j.student);
      setDetailPayments(j.payments ?? []);
      setDetailTx(j.transactions ?? []);
    } catch (e: any) {
      alert(e?.message ?? "Detay alınamadı.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      {/* Detay modal (finans dışında hiçbir şey göstermez) */}
      <StudentFinanceModalClient
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        student={detailStudent}
        payments={detailPayments}
        transactions={detailTx}
      />

      <FinanceOpsPaymentEntryModalClient
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        monthKey={monthKey}
        student={payModalStudent}
        row={payModalRow}
      />

      <FinanceOpsReceiptModalClient open={receiptOpen} onClose={() => setReceiptOpen(false)} studentId={receiptStudentId} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold text-lg">Aidat Takibi</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Operasyon odaklı: kim ödedi, kim gecikti, bugün ne tahsil edilmeli?</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">Toplam: {fmtMoney(stats.total)} ₺</span>
          <span className="chip">Ödenen: {fmtMoney(stats.paid)} ₺</span>
          <span className="chip">Kalan: {fmtMoney(stats.remain)} ₺</span>
          <span className="chip">🔴 Gecikmiş: {stats.overdue}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <input className="input md:col-span-2" placeholder="Ara: öğrenci / yaş grubu..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="hepsi">Durum: Hepsi</option>
          <option value="gecikmiş">🔴 Gecikmiş</option>
          <option value="kısmi">🟡 Kısmi</option>
          <option value="ödenmedi">⚪ Bekleniyor</option>
          <option value="ödendi">🟢 Ödendi</option>
        </select>
        <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
          <option value="gecikme">Sırala: Gecikme</option>
          <option value="kalan">Sırala: Kalan</option>
          <option value="isim">Sırala: İsim</option>
        </select>
      </div>

      {/* Desktop: Professional table */}
      <div className="hidden lg:block card card-neon p-0 overflow-hidden">
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[color:var(--panel)]/95 backdrop-blur border-b border-white/10">
              <tr>
                <th className="text-left py-3 px-4">Öğrenci</th>
                <th className="text-left py-3 px-4">Yaş Grubu</th>
                <th className="text-left py-3 px-4">Durum</th>
                <th className="text-right py-3 px-4">Toplam Borç</th>
                <th className="text-right py-3 px-4">Ödenen</th>
                <th className="text-right py-3 px-4">Kalan</th>
                <th className="text-left py-3 px-4">Vade Tarihi</th>
                <th className="text-right py-3 px-4">Gecikme Günü</th>
                <th className="text-left py-3 px-4">Son Ödeme</th>
                <th className="text-left py-3 px-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const badge = statusBadge(r.durum);
                const pending = pendingByStudent.get(r.student.id) ?? 0;
                return (
                  <tr key={r.student.id} className="border-t border-white/10 hover:bg-white/5 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold">{r.student.ad_soyad}</div>
                      <div className="text-xs text-[color:var(--muted)]">{pending > 0 ? `🧾 ${pending} dekont bekliyor` : ""}</div>
                    </td>
                    <td className="py-3 px-4">{r.student.yas_grubu}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{r.toplam == null ? "—" : `${fmtMoney(r.toplam)} ₺`}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{r.toplam == null ? "—" : `${fmtMoney(r.odenen)} ₺`}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}</td>
                    <td className="py-3 px-4">{r.vade ?? "—"}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{r.gecikmeGun > 0 ? r.gecikmeGun : "0"}</td>
                    <td className="py-3 px-4">{r.sonOdeme ?? "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="btn-mini" type="button" onClick={() => openDetail(r.student.id)}>
                          Detay
                        </button>
                        <button
                          className="btn-mini"
                          type="button"
                          onClick={() => {
                            setPayModalStudent(r.student);
                            setPayModalRow({
                              id: r.payId,
                              student_id: r.student.id,
                              tutar_toplam: r.toplam,
                              tutar_odenen: r.odenen,
                              son_odeme_tarihi: r.vade
                            });
                            setPayModalOpen(true);
                          }}
                        >
                          Ödeme Gir
                        </button>
                        <button
                          className="btn-mini"
                          type="button"
                          onClick={() => {
                            setReceiptStudentId(r.student.id);
                            setReceiptOpen(true);
                          }}
                        >
                          Dekont Görüntüle
                        </button>
                        <FinanceWhatsAppActionsClient
                          studentId={r.student.id}
                          dedupeKey={`finance:aidat:${r.student.id}:${monthKey}`}
                          related={{ student_id: r.student.id, tur: "aidat_takip", donem: monthKey }}
                          buttonLabel="WhatsApp"
                          buttonClassName="btn-mini-primary"
                          defaultText={`💳 Aidat Hatırlatma\n\n${r.student.ad_soyad} (${r.student.yas_grubu})\nDönem: ${monthKey}\nDurum: ${badge.label}\nKalan: ${r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}\nVade: ${r.vade ?? "—"}\n\nÖdeme/detay için dönüş yapabilir misiniz?`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[color:var(--muted)]">
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="lg:hidden space-y-3">
        <AnimatePresence>
          {filtered.slice(0, 40).map((r) => {
            const badge = statusBadge(r.durum);
            const pending = pendingByStudent.get(r.student.id) ?? 0;
            return (
              <motion.div
                key={r.student.id}
                className="card card-neon p-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.student.ad_soyad}</div>
                    <div className="text-xs text-[color:var(--muted)] mt-1">{r.student.yas_grubu}</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
                </div>

                {pending > 0 && <div className="text-xs text-[color:var(--muted)] mt-2">🧾 {pending} dekont bekliyor</div>}

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                    <div className="font-semibold tabular-nums">{r.toplam == null ? "—" : `${fmtMoney(r.toplam)} ₺`}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                    <div className="font-semibold tabular-nums">{fmtMoney(r.odenen)} ₺</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                    <div className="font-semibold tabular-nums">{r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[color:var(--muted)]">
                  Vade: {r.vade ?? "—"} • Gecikme: {r.gecikmeGun} gün • Son ödeme: {r.sonOdeme ?? "—"}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn-mini" type="button" onClick={() => openDetail(r.student.id)}>
                    Detay
                  </button>
                  <button
                    className="btn-mini"
                    type="button"
                    onClick={() => {
                      setPayModalStudent(r.student);
                      setPayModalRow({
                        id: r.payId,
                        student_id: r.student.id,
                        tutar_toplam: r.toplam,
                        tutar_odenen: r.odenen,
                        son_odeme_tarihi: r.vade
                      });
                      setPayModalOpen(true);
                    }}
                  >
                    Ödeme Gir
                  </button>
                  <button
                    className="btn-mini"
                    type="button"
                    onClick={() => {
                      setReceiptStudentId(r.student.id);
                      setReceiptOpen(true);
                    }}
                  >
                    Dekont Görüntüle
                  </button>
                  <div className="flex">
                    <FinanceWhatsAppActionsClient
                      studentId={r.student.id}
                      dedupeKey={`finance:aidat:${r.student.id}:${monthKey}`}
                      related={{ student_id: r.student.id, tur: "aidat_takip", donem: monthKey }}
                      buttonLabel="WhatsApp"
                      buttonClassName="btn-mini-primary w-full"
                      defaultText={`💳 Aidat Hatırlatma\n\n${r.student.ad_soyad} (${r.student.yas_grubu})\nDönem: ${monthKey}\nDurum: ${badge.label}\nKalan: ${r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}\nVade: ${r.vade ?? "—"}\n\nÖdeme/detay için dönüş yapabilir misiniz?`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
