"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";

type Student = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  aidat_vade_gunu?: number | null;
  aylik_aidat_tutar?: number | null;
};

type Payment = {
  id: string;
  donem: string;
  gelir_kategorisi: string;
  tutar_toplam: number;
  tutar_odenen: number;
  son_odeme_tarihi: string;
  durum: string;
};

type Tx = {
  id: string;
  tur: "gelir" | "gider";
  kategori: string;
  tutar: number;
  tarih: string;
  aciklama?: string | null;
};

function fmtMoney(v: number) {
  return Number(v ?? 0).toLocaleString("tr-TR");
}

export function StudentFinanceModalClient({
  open,
  onClose,
  loading,
  student,
  payments,
  transactions
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  student: Student | null;
  payments: Payment[];
  transactions: Tx[];
}) {
  const [txMonth, setTxMonth] = useState(dayjs().format("YYYY-MM"));
  const today = dayjs().format("YYYY-MM-DD");

  const summary = useMemo(() => {
    const s = (payments ?? []).reduce(
      (acc: any, p: any) => {
        const total = Number(p.tutar_toplam ?? 0);
        const paid = Number(p.tutar_odenen ?? 0);
        const rem = Math.max(0, total - paid);
        acc.total += total;
        acc.paid += paid;
        acc.remaining += rem;
        if (rem > 0 && p.son_odeme_tarihi < today) acc.overdue += 1;
        if (rem > 0) acc.open += 1;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0, overdue: 0, open: 0 }
    );
    return s;
  }, [payments, today]);

  const txInMonth = useMemo(() => {
    return (transactions ?? []).filter((t) => dayjs(t.tarih).format("YYYY-MM") === txMonth);
  }, [transactions, txMonth]);

  const txAgg = useMemo(() => {
    const m = new Map<string, { gelir: number; gider: number }>();
    txInMonth.forEach((t) => {
      const cur = m.get(t.kategori) ?? { gelir: 0, gider: 0 };
      if (t.tur === "gelir") cur.gelir += Number(t.tutar);
      else cur.gider += Number(t.tutar);
      m.set(t.kategori, cur);
    });
    const rows = Array.from(m.entries())
      .map(([kategori, v]) => ({ kategori, ...v, net: v.gelir - v.gider }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    const giderCount = txInMonth.filter((t) => t.tur === "gider").length;
    return { rows, giderCount };
  }, [txInMonth]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto card card-neon p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Öğrenci Finans Detayı</div>
              <div className="text-xl md:text-2xl font-semibold mt-1">
                {loading ? "Yükleniyor…" : student?.ad_soyad ?? "—"}
              </div>
              <div className="text-sm text-[color:var(--muted)] mt-1">{student?.yas_grubu ?? ""}</div>
            </div>
            <button className="btn-ghost" type="button" onClick={onClose}>
              Kapat
            </button>
          </div>

          {loading ? (
            <div className="text-[color:var(--muted)] mt-6">Veriler yükleniyor…</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Toplam Borç</div>
                  <div className="text-2xl font-semibold mt-2 tabular-nums">{fmtMoney(summary.total)} ₺</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                  <div className="text-2xl font-semibold mt-2 tabular-nums">{fmtMoney(summary.paid)} ₺</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                  <div className="text-2xl font-semibold mt-2 tabular-nums">{fmtMoney(summary.remaining)} ₺</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-[color:var(--muted)]">Açık / Geciken</div>
                  <div className="text-2xl font-semibold mt-2 tabular-nums">
                    {summary.open} / {summary.overdue}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="font-semibold">Gelir / Gider Kalemleri</div>
                    <div className="text-xs text-[color:var(--muted)] mt-1">Sadece öğrenciye bağlı defter kayıtları</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[color:var(--muted)]">Ay</span>
                    <input className="input h-9 py-1" value={txMonth} onChange={(e) => setTxMonth(e.target.value)} />
                  </div>
                </div>

                {txAgg.giderCount === 0 && (
                  <div className="mt-3 text-sm rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                    Bu ay için <b>gider</b> kaydı yok. Eksikse gider kaydı ekleyebilirsin.
                  </div>
                )}

                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[color:var(--muted)]">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 pr-3">Kategori</th>
                        <th className="text-right py-2 pr-3">Gelir</th>
                        <th className="text-right py-2 pr-3">Gider</th>
                        <th className="text-right py-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txAgg.rows.map((r) => (
                        <tr key={r.kategori} className="border-t border-white/10">
                          <td className="py-2 pr-3">{r.kategori}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.gelir)} ₺</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.gider)} ₺</td>
                          <td className="py-2 text-right tabular-nums">{fmtMoney(r.net)} ₺</td>
                        </tr>
                      ))}
                      {txAgg.rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-[color:var(--muted)]">
                            Bu ay için kayıt yok.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <div className="font-semibold mb-2">Son Hareketler</div>
                  <div className="space-y-2">
                    {(txInMonth ?? []).slice(0, 25).map((t) => (
                      <div key={t.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">
                            {t.tur} • {t.kategori}
                          </div>
                          <div className="text-sm tabular-nums">{fmtMoney(Number(t.tutar))} ₺</div>
                        </div>
                        <div className="text-xs text-[color:var(--muted)] mt-1">
                          {t.tarih} {t.aciklama ? `• ${t.aciklama}` : ""}
                        </div>
                      </div>
                    ))}
                    {txInMonth.length === 0 && <div className="text-[color:var(--muted)]">Hareket yok.</div>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold mb-2">Aidat / Ödeme Kalemleri</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {(payments ?? []).slice(0, 24).map((p: any) => {
                    const kalan = Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0));
                    const late = kalan > 0 ? dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day") : 0;
                    return (
                      <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">
                              {p.gelir_kategorisi} • {p.donem}
                            </div>
                            <div className="text-xs text-[color:var(--muted)] mt-1">
                              Son tarih: {p.son_odeme_tarihi} {late > 0 ? `• ${late} gün gecikme` : ""}
                            </div>
                          </div>
                          <span className="chip">{p.durum}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                            <div className="font-semibold tabular-nums">{fmtMoney(Number(p.tutar_toplam))} ₺</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                            <div className="font-semibold tabular-nums">{fmtMoney(Number(p.tutar_odenen))} ₺</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                            <div className="font-semibold tabular-nums">{fmtMoney(Number(kalan))} ₺</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(payments ?? []).length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

