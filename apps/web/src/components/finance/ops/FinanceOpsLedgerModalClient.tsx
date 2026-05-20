"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

export function FinanceOpsLedgerModalClient({
  open,
  onClose,
  initialTur
}: {
  open: boolean;
  onClose: () => void;
  initialTur: "gelir" | "gider";
}) {
  const [tur, setTur] = useState<"gelir" | "gider">(initialTur);
  const [kategori, setKategori] = useState("");
  const [tutar, setTutar] = useState<number>(0);
  const [tarih, setTarih] = useState(dayjs().format("YYYY-MM-DD"));
  const [aciklama, setAciklama] = useState("");
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTur(initialTur);
      setHata(null);
      setBilgi(null);
    }
  }, [open, initialTur]);

  const title = useMemo(() => (tur === "gelir" ? "💰 Gelir Ekle" : "💸 Gider Ekle"), [tur]);

  async function kaydet() {
    setHata(null);
    setBilgi(null);
    setLoading(true);
    try {
      const r = await fetch("/api/finance/ledger/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tur,
          kategori: kategori || (tur === "gelir" ? "Diğer Gelir" : "Diğer Gider"),
          tutar: Number(tutar),
          tarih,
          aciklama: aciklama || null
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Kaydedilemedi.");
      setBilgi("Kaydedildi.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      setHata(e?.message ?? "Kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="max-w-xl mx-auto card card-neon p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Finans Operasyon Merkezi</div>
              <div className="text-xl font-semibold mt-1">{title}</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">Formlar küçük, işlem hızlı.</div>
            </div>
            <button className="btn-ghost" onClick={onClose} type="button">
              Kapat
            </button>
          </div>

          {hata && <div className="mt-4 text-sm text-[color:var(--danger)]">{hata}</div>}
          {bilgi && <div className="mt-4 text-sm text-[color:var(--success)]">{bilgi}</div>}

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tür</label>
                <select className="input mt-1" value={tur} onChange={(e) => setTur(e.target.value as any)}>
                  <option value="gelir">Gelir</option>
                  <option value="gider">Gider</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[color:var(--muted)]">Tarih</label>
                <input className="input mt-1" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs text-[color:var(--muted)]">Kategori</label>
              <input className="input mt-1" value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="Örn: Saha Kirası, Aidatlar..." />
            </div>

            <div>
              <label className="text-xs text-[color:var(--muted)]">Tutar</label>
              <input className="input mt-1" type="number" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} />
            </div>

            <div>
              <label className="text-xs text-[color:var(--muted)]">Açıklama (opsiyonel)</label>
              <input className="input mt-1" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Kısa not..." />
            </div>

            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" type="button" onClick={onClose}>
                Vazgeç
              </button>
              <button className="btn-primary" type="button" onClick={kaydet} disabled={loading || !tarih || Number(tutar) <= 0}>
                {loading ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
