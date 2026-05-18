"use client";

import { useMemo, useState } from "react";

export function PaymentSubmitClient({
  studentPaymentId,
  kalan,
  disabled
}: {
  studentPaymentId: string;
  kalan: number;
  disabled?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const [tutar, setTutar] = useState<number>(kalan);
  const [tarih, setTarih] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notu, setNotu] = useState<string>("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (!dosya) return false;
    if (!tutar || tutar <= 0) return false;
    if (tutar > kalan + 0.01) return false;
    return true;
  }, [dosya, tutar, kalan, disabled]);

  async function gonder() {
    setHata(null);
    setBilgi(null);
    if (!dosya) return;
    setLoading(true);
    try {
      // 1) signed upload url al
      const r1 = await fetch("/api/payments/receipt/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentPaymentId,
          mime: dosya.type,
          size: dosya.size
        })
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(j1?.hata ?? "Upload URL alınamadı.");

      // 2) dosyayı direkt storage'a yükle (signedUrl)
      const uploadUrl = j1.uploadUrl as string;
      const r2 = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": dosya.type },
        body: dosya
      });
      if (!r2.ok) throw new Error("Dekont yüklenemedi.");

      // 3) ödeme bildirimi oluştur
      const r3 = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentPaymentId,
          amount: tutar,
          paidAt: tarih,
          receiptPath: j1.path,
          receiptMime: dosya.type,
          receiptSize: dosya.size,
          note: notu || null
        })
      });
      const j3 = await r3.json().catch(() => ({}));
      if (!r3.ok) throw new Error(j3?.hata ?? "Ödeme bildirimi gönderilemedi.");

      setBilgi("Dekont gönderildi. Admin onayı bekleniyor.");
      setDosya(null);
      setNotu("");
      setAcik(false);
    } catch (e: any) {
      setHata(e?.message ?? "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn-primary" type="button" onClick={() => setAcik(true)} disabled={disabled}>
        Dekont Gönder
      </button>

      {bilgi && <div className="text-sm text-[color:var(--success)] mt-2">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)] mt-2">{hata}</div>}

      {acik && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAcik(false)} />
          <div className="relative w-full max-w-lg card card-neon p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Ödeme Bildirimi</div>
                <div className="text-sm text-[color:var(--muted)] mt-1">Kalan: {kalan.toLocaleString("tr-TR")} ₺</div>
              </div>
              <button className="icon-btn" type="button" onClick={() => setAcik(false)} aria-label="Kapat">
                ✕
              </button>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[color:var(--muted)] mb-1">Tutar</div>
                <input className="input" type="number" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs text-[color:var(--muted)] mb-1">Ödeme Tarihi</div>
                <input className="input" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-[color:var(--muted)] mb-1">Dekont (JPG/PNG/PDF)</div>
              <input
                className="input"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mt-3">
              <div className="text-xs text-[color:var(--muted)] mb-1">Not</div>
              <input className="input" value={notu} onChange={(e) => setNotu(e.target.value)} placeholder="İsteğe bağlı" />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => setAcik(false)} disabled={loading}>
                Vazgeç
              </button>
              <button className="btn-primary" type="button" onClick={gonder} disabled={!canSubmit || loading}>
                {loading ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>

            {hata && <div className="text-sm text-[color:var(--danger)] mt-3">{hata}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

