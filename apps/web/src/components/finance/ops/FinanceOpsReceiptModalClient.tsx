"use client";

import { useEffect, useState } from "react";

function fmtMoney(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

export function FinanceOpsReceiptModalClient({
  open,
  onClose,
  studentId
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !studentId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setHata(null);
      try {
        const r = await fetch("/api/finance/receipts/by-student", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ studentId })
        });
        const j = await r.json().catch(() => ({}));
        if (!mounted) return;
        if (!r.ok) throw new Error(j?.hata ?? "Dekontlar alınamadı.");
        setList(j.list ?? []);
      } catch (e: any) {
        setHata(e?.message ?? "Dekontlar alınamadı.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, studentId]);

  async function viewReceipt(submissionId: string) {
    setHata(null);
    const r = await fetch("/api/payments/receipt/view-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionId })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setHata(j?.hata ?? "Dekont açılamadı.");
      return;
    }
    window.open(j.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 overflow-auto">
        <div className="max-w-3xl mx-auto card card-neon p-5 md:p-6 bg-[color:var(--panel)]/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[color:var(--muted)]">Finans Operasyon Merkezi</div>
              <div className="text-xl font-semibold mt-1">🧾 Dekontlar</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">Öğrenciye ait dekont kayıtları.</div>
            </div>
            <button className="btn-ghost" type="button" onClick={onClose}>
              Kapat
            </button>
          </div>

          {hata && <div className="mt-4 text-sm text-[color:var(--danger)]">{hata}</div>}
          {loading ? (
            <div className="mt-6 text-[color:var(--muted)]">Yükleniyor…</div>
          ) : list.length === 0 ? (
            <div className="mt-6 text-[color:var(--muted)]">Dekont yok.</div>
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[color:var(--muted)]">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2">Dönem</th>
                    <th className="text-left py-2">Kategori</th>
                    <th className="text-left py-2">Tutar</th>
                    <th className="text-left py-2">Tarih</th>
                    <th className="text-left py-2">Durum</th>
                    <th className="text-left py-2">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => (
                    <tr key={x.id} className="border-t border-white/10">
                      <td className="py-2">{x.student_payments?.donem ?? "-"}</td>
                      <td className="py-2">{x.student_payments?.gelir_kategorisi ?? "-"}</td>
                      <td className="py-2">{fmtMoney(Number(x.amount))} ₺</td>
                      <td className="py-2">{x.paid_at ?? "-"}</td>
                      <td className="py-2">
                        <span className="chip">{x.status}</span>
                      </td>
                      <td className="py-2">
                        <button className="btn-ghost" type="button" onClick={() => viewReceipt(x.id)}>
                          Görüntüle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
