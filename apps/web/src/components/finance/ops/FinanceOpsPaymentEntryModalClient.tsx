"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  ad_soyad: string;
  yas_grubu: string;
  aidat_vade_gunu?: number | null;
  aylik_aidat_tutar?: number | null;
};

type AidatRow = {
  id?: string | null; // student_payments id (varsa)
  student_id: string;
  tutar_toplam: number | null;
  tutar_odenen: number;
  son_odeme_tarihi: string | null;
};

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

export function FinanceOpsPaymentEntryModalClient({
  open,
  onClose,
  monthKey,
  student,
  row
}: {
  open: boolean;
  onClose: () => void;
  monthKey: string;
  student: Student | null;
  row: AidatRow | null;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(0);
      setDate(dayjs().format("YYYY-MM-DD"));
      setHata(null);
      setBilgi(null);
    }
  }, [open]);

  const total = useMemo(() => {
    if (row?.tutar_toplam != null) return Number(row.tutar_toplam);
    if (student?.aylik_aidat_tutar != null) return Number(student.aylik_aidat_tutar);
    return 0;
  }, [row, student]);

  const dueDate = useMemo(() => {
    if (row?.son_odeme_tarihi) return row.son_odeme_tarihi;
    const d = student?.aidat_vade_gunu ?? null;
    if (!d) return null;
    return dayjs(`${monthKey}-${String(d).padStart(2, "0")}`).format("YYYY-MM-DD");
  }, [row, student, monthKey]);

  const paid = Number(row?.tutar_odenen ?? 0);
  const remain = Math.max(0, Number(total ?? 0) - paid);

  async function save() {
    if (!student) return;
    setLoading(true);
    setHata(null);
    setBilgi(null);
    try {
      const delta = Number(amount);
      if (!delta || delta <= 0) throw new Error("Tutar gir.");

      // 1) student_payments kaydı oluştur / güncelle
      if (!row?.id) {
        if (!total || total <= 0) throw new Error("Bu öğrenci için aidat tutarı tanımlı değil.");
        if (!dueDate) throw new Error("Vade tarihi tanımlı değil (öğrenci vade günü seçilmeli).");

        const r1 = await fetch("/api/finance/student-payments/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            student_id: student.id,
            donem: monthKey,
            gelir_kategorisi: "Aylık Aidat",
            tutar_toplam: total,
            tutar_odenen: delta,
            son_odeme_tarihi: dueDate
          })
        });
        const j1 = await r1.json().catch(() => ({}));
        if (!r1.ok) throw new Error(j1?.hata ?? "Ödeme kaydı oluşturulamadı.");
      } else {
        const newPaid = paid + delta;
        const r2 = await fetch("/api/finance/student-payments/update-collection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: row.id, tutar_odenen: newPaid })
        });
        const j2 = await r2.json().catch(() => ({}));
        if (!r2.ok) throw new Error(j2?.hata ?? "Ödeme güncellenemedi.");
      }

      // 2) deftere gelir kaydı ekle (operasyon görünürlüğü için)
      const r3 = await fetch("/api/finance/ledger/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tur: "gelir",
          kategori: "Aidatlar",
          tutar: delta,
          tarih: date,
          aciklama: `${student.ad_soyad} aidat tahsilatı (${monthKey})`,
          student_id: student.id
        })
      });
      const j3 = await r3.json().catch(() => ({}));
      if (!r3.ok) throw new Error(j3?.hata ?? "Defter kaydı eklenemedi.");

      setBilgi("Ödeme işlendi.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setHata(e?.message ?? "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="max-w-xl mx-auto card card-neon p-5 md:p-6 bg-[color:var(--panel)]/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Ödeme Gir</div>
              <div className="text-xl font-semibold mt-1">{student.ad_soyad}</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">{student.yas_grubu} • Dönem: {monthKey}</div>
            </div>
            <button className="btn-ghost" type="button" onClick={onClose}>
              Kapat
            </button>
          </div>

          {hata && <div className="mt-4 text-sm text-[color:var(--danger)]">{hata}</div>}
          {bilgi && <div className="mt-4 text-sm text-[color:var(--success)]">{bilgi}</div>}

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                <div className="font-semibold tabular-nums">{total ? `${fmtMoney(total)} ₺` : "—"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                <div className="font-semibold tabular-nums">{fmtMoney(paid)} ₺</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                <div className="font-semibold tabular-nums">{fmtMoney(remain)} ₺</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tahsil Edilen Tutar</label>
                <input className="input mt-1" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tarih</label>
                <input className="input mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="text-xs text-[color:var(--muted)]">
              Vade: {dueDate ?? "—"} • Bu işlem deftere “Aidatlar” geliri olarak da yansır.
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" type="button" onClick={onClose}>
                Vazgeç
              </button>
              <button className="btn-primary" type="button" onClick={save} disabled={loading}>
                {loading ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
