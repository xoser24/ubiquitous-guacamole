"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

export function FinanceStudentPaymentCreateModalClient({
  open,
  onClose,
  students,
  defaultStudentId,
  defaultDonem
}: {
  open: boolean;
  onClose: () => void;
  students: { id: string; ad_soyad: string }[];
  defaultStudentId?: string | null;
  defaultDonem?: string | null;
}) {
  const [studentId, setStudentId] = useState("");
  const [donem, setDonem] = useState(dayjs().format("YYYY-MM"));
  const [kategori, setKategori] = useState("Aylık Aidat");
  const [toplam, setToplam] = useState<number>(0);
  const [odenen, setOdenen] = useState<number>(0);
  const [sonOdeme, setSonOdeme] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHata(null);
    setBilgi(null);
    setStudentId(defaultStudentId ?? students?.[0]?.id ?? "");
    setDonem(defaultDonem ?? dayjs().format("YYYY-MM"));
    setKategori("Aylık Aidat");
    setToplam(0);
    setOdenen(0);
    setSonOdeme(dayjs().format("YYYY-MM-DD"));
  }, [open, students, defaultStudentId, defaultDonem]);

  const selectedName = useMemo(() => {
    const s = students.find((x) => x.id === studentId);
    return s?.ad_soyad ?? "";
  }, [students, studentId]);

  async function kaydet() {
    setHata(null);
    setBilgi(null);
    setLoading(true);
    try {
      if (!studentId) throw new Error("Öğrenci seç.");
      if (!donem) throw new Error("Dönem gir.");
      if (!kategori.trim()) throw new Error("Kategori gir.");
      if (Number(toplam) <= 0) throw new Error("Toplam tutar gir.");
      if (!sonOdeme) throw new Error("Son ödeme tarihi gir.");

      const r = await fetch("/api/finance/student-payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          donem,
          gelir_kategorisi: kategori,
          tutar_toplam: Number(toplam),
          tutar_odenen: Number(odenen),
          son_odeme_tarihi: sonOdeme
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Kaydedilemedi.");

      setBilgi("Kaydedildi.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setHata(e?.message ?? "Kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="max-w-2xl mx-auto card card-neon p-5 md:p-6 bg-[color:var(--panel)]/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Öğrenci Ödeme Kalemi</div>
              <div className="text-xl font-semibold mt-1">+ Yeni Ödeme</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">{selectedName ? `Öğrenci: ${selectedName}` : "Öğrenci seç"}</div>
            </div>
            <button className="btn-ghost" type="button" onClick={onClose}>
              Kapat
            </button>
          </div>

          {hata && <div className="mt-4 text-sm text-[color:var(--danger)]">{hata}</div>}
          {bilgi && <div className="mt-4 text-sm text-[color:var(--success)]">{bilgi}</div>}

          <div className="mt-4 grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[color:var(--muted)]">Öğrenci</label>
                <select className="input mt-1" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ad_soyad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Dönem</label>
                <input className="input mt-1" type="month" value={donem} onChange={(e) => setDonem(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs text-[color:var(--muted)]">Gelir Kategorisi</label>
              <input className="input mt-1" value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="Örn: Aylık Aidat, Kamp, Forma..." />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[color:var(--muted)]">Toplam</label>
                <input className="input mt-1" type="number" value={toplam} onChange={(e) => setToplam(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Ödenen</label>
                <input className="input mt-1" type="number" value={odenen} onChange={(e) => setOdenen(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Son Ödeme</label>
                <input className="input mt-1" type="date" value={sonOdeme} onChange={(e) => setSonOdeme(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" type="button" onClick={onClose}>
                Vazgeç
              </button>
              <button className="btn-primary" type="button" onClick={kaydet} disabled={loading}>
                {loading ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

