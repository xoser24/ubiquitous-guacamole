"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { FinanceWhatsAppActionsClient } from "@/components/finance/FinanceWhatsAppActionsClient";

type StudentRow = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  veli_telefon?: string | null;
  aidat_vade_gunu?: number | null;
  aylik_aidat_tutar?: number | null;
};

type PaymentRow = {
  id: string;
  student_id: string;
  donem: string;
  gelir_kategorisi: string;
  tutar_toplam: number;
  tutar_odenen: number;
  son_odeme_tarihi: string;
  durum: string;
  iptal?: boolean | null;
};

function fmtMoney(v: number) {
  return Number(v ?? 0).toLocaleString("tr-TR");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AidatStudentsTableClient({
  students,
  payments
}: {
  students: StudentRow[];
  payments: PaymentRow[];
}) {
  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = dayjs().format("YYYY-MM");
  const AIDAT_KATEGORI = "Aylık Aidat";

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "hepsi" | "ödendi" | "ödenmedi" | "gecikmiş" | "kısmi" | "tanımsız"
  >("hepsi");

  const payByStudent = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    (payments ?? []).forEach((p) => {
      if (p.iptal) return;
      const arr = map.get(p.student_id) ?? [];
      arr.push(p);
      map.set(p.student_id, arr);
    });
    return map;
  }, [payments]);

  const computed = useMemo(() => {
    const rows = (students ?? []).map((s) => {
      const list = payByStudent.get(s.id) ?? [];
      const curPay = list.find((p) => p.donem === monthKey && p.gelir_kategorisi === AIDAT_KATEGORI);

      const dueDay = s.aidat_vade_gunu ?? null;
      const dueDate = dueDay ? dayjs(`${monthKey}-${String(dueDay).padStart(2, "0")}`).format("YYYY-MM-DD") : null;

      const toplam = curPay?.tutar_toplam ?? (s.aylik_aidat_tutar ?? null);
      const odenen = curPay?.tutar_odenen ?? 0;
      const kalan = toplam != null ? Math.max(0, Number(toplam) - Number(odenen)) : null;

      const openItems = list.filter((p) => {
        const rem = Math.max(0, Number(p.tutar_toplam ?? 0) - Number(p.tutar_odenen ?? 0));
        return rem > 0;
      });
      const openTotal = openItems.reduce((acc, p) => acc + Math.max(0, Number(p.tutar_toplam ?? 0) - Number(p.tutar_odenen ?? 0)), 0);

      let durum: "ödendi" | "ödenmedi" | "gecikmiş" | "kısmi" | "tanımsız" = "tanımsız";
      if (toplam == null) durum = "tanımsız";
      else if (Number(odenen) >= Number(toplam)) durum = "ödendi";
      else if (Number(odenen) > 0) durum = "kısmi";
      else if (dueDate && dueDate < today) durum = "gecikmiş";
      else durum = "ödenmedi";

      const gecenGun = dueDate && dueDate < today ? dayjs(today).diff(dayjs(dueDate), "day") : 0;
      const kalanGun = dueDate && dueDate >= today ? dayjs(dueDate).diff(dayjs(today), "day") : 0;

      return {
        ...s,
        curPayId: curPay?.id ?? null,
        dueDate,
        toplam,
        odenen,
        kalan,
        durum,
        gecenGun,
        kalanGun,
        openCount: openItems.length,
        openTotal
      };
    });

    rows.sort((a, b) => (b.gecenGun ?? 0) - (a.gecenGun ?? 0));
    return rows;
  }, [students, payByStudent, monthKey, today]);

  const filtered = useMemo(() => {
    return computed.filter((r) => {
      if (q.trim()) {
        const hay = `${r.ad_soyad} ${r.yas_grubu}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (statusFilter !== "hepsi" && r.durum !== statusFilter) return false;
      return true;
    });
  }, [computed, q, statusFilter]);

  async function saveSettings(studentId: string, patch: { aidat_vade_gunu?: number | null; aylik_aidat_tutar?: number | null }) {
    const r = await fetch("/api/finance/students/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, ...patch })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.hata ?? "Güncellenemedi.");
  }

  return (
    <div className="card card-neon p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold">Öğrenci Bazlı Aidat Listesi</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">
            Bu ay ({monthKey}) • Vade günü öğrenciye göre (1-28) • Detay için satırdan öğrenciye gir
          </div>
        </div>
        <div className="chip">{filtered.length} öğrenci</div>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <input className="input" placeholder="Ara: isim / yaş grubu..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="hepsi">Durum: Hepsi</option>
          <option value="gecikmiş">Gecikmiş</option>
          <option value="ödenmedi">Ödenmedi</option>
          <option value="kısmi">Kısmi</option>
          <option value="ödendi">Ödendi</option>
          <option value="tanımsız">Tanımsız</option>
        </select>
        <div className="text-sm text-[color:var(--muted)] flex items-center justify-end">
          İpucu: Vade günü boşsa “Tanımsız” görünür.
        </div>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[color:var(--muted)]">
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-3">Öğrenci</th>
              <th className="text-left py-2 pr-3">Durum</th>
              <th className="text-right py-2 pr-3">Toplam</th>
              <th className="text-right py-2 pr-3">Ödenen</th>
              <th className="text-right py-2 pr-3">Kalan</th>
              <th className="text-left py-2 pr-3">Vade</th>
              <th className="text-right py-2 pr-3">Geçen</th>
              <th className="text-right py-2 pr-3">Kalan gün</th>
              <th className="text-right py-2 pr-3">Açık kalem</th>
              <th className="text-left py-2 pr-3">Ayar</th>
              <th className="text-left py-2">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const renk =
                r.durum === "gecikmiş"
                  ? "border-red-500/30 bg-red-500/10"
                  : r.durum === "kısmi"
                    ? "border-amber-400/30 bg-amber-400/10"
                    : r.durum === "ödenmedi"
                      ? "border-white/10 bg-white/5"
                      : r.durum === "ödendi"
                        ? "border-emerald-400/25 bg-emerald-400/10"
                        : "border-purple-400/25 bg-purple-400/10";

              return (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-3 pr-3">
                    <div className="font-semibold">{r.ad_soyad}</div>
                    <div className="text-xs text-[color:var(--muted)]">{r.yas_grubu}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${renk}`}>{r.durum}</span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.toplam == null ? "—" : `${fmtMoney(r.toplam)} ₺`}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.toplam == null ? "—" : `${fmtMoney(r.odenen)} ₺`}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}</td>
                  <td className="py-3 pr-3">{r.dueDate ?? "—"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.gecenGun > 0 ? r.gecenGun : "0"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{r.kalanGun > 0 ? r.kalanGun : "0"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {r.openCount} • {fmtMoney(r.openTotal)} ₺
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[color:var(--muted)] w-16">Vade</label>
                        <select
                          className="input h-9 py-1"
                          value={r.aidat_vade_gunu ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value ? clamp(Number(e.target.value), 1, 28) : null;
                            try {
                              await saveSettings(r.id, { aidat_vade_gunu: v });
                              // Basit refresh: listeden çıkmadan güncellenmişi görmek için
                              window.location.reload();
                            } catch (err: any) {
                              alert(err?.message ?? "Güncellenemedi.");
                            }
                          }}
                        >
                          <option value="">Seç…</option>
                          {Array.from({ length: 28 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[color:var(--muted)] w-16">Tutar</label>
                        <input
                          className="input h-9 py-1"
                          type="number"
                          defaultValue={r.aylik_aidat_tutar ?? ""}
                          placeholder="₺"
                          onBlur={async (e) => {
                            const raw = e.target.value?.trim();
                            const v = raw ? Number(raw) : null;
                            try {
                              await saveSettings(r.id, { aylik_aidat_tutar: v });
                            } catch (err: any) {
                              alert(err?.message ?? "Güncellenemedi.");
                            }
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <a className="btn-ghost" href={`/finans/ogrenci/${r.id}`}>
                        Detay
                      </a>
                      <FinanceWhatsAppActionsClient
                        studentId={r.id}
                        dedupeKey={`finance:aidat:${r.id}:${today}`}
                        related={{ student_id: r.id, tur: "aidat_liste", donem: monthKey }}
                        defaultText={`💳 Aidat Hatırlatma\n\n${r.ad_soyad} için bu ay (${monthKey}) aidat durumu: ${r.durum}.\nKalan: ${r.kalan == null ? "—" : `${fmtMoney(r.kalan)} ₺`}.\nVade: ${r.dueDate ?? "—"}.\n\nÖdeme/detay için dönüş yapabilir misiniz?`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-[color:var(--muted)]">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

