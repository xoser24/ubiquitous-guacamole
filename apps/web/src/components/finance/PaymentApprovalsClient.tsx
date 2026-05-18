"use client";

import { useState } from "react";

export function PaymentApprovalsClient({ initial }: { initial: any[] }) {
  const [list, setList] = useState<any[]>(initial ?? []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

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

  async function review(submissionId: string, action: "approve" | "reject") {
    setHata(null);
    setBilgi(null);
    setLoadingId(submissionId);
    try {
      const note = action === "reject" ? prompt("Red nedeni (opsiyonel):") : null;
      const r = await fetch("/api/payments/admin/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId, action, note })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "İşlem başarısız.");

      setList((l) => l.filter((x) => x.id !== submissionId));
      setBilgi(action === "approve" ? "Ödeme onaylandı." : "Ödeme reddedildi.");
    } catch (e: any) {
      setHata(e?.message ?? "İşlem başarısız.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="card card-neon p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-semibold">Bekleyen Dekontlar</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Admin onayı bekleyen ödemeler</div>
        </div>
        <div className="chip">{list.length} adet</div>
      </div>

      {bilgi && <div className="text-sm text-[color:var(--success)] mt-3">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)] mt-3">{hata}</div>}

      {list.length === 0 ? (
        <div className="text-[color:var(--muted)] mt-4">Bekleyen dekont yok.</div>
      ) : (
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-[color:var(--muted)]">
              <tr>
                <th className="text-left py-2">Öğrenci</th>
                <th className="text-left py-2">Dönem</th>
                <th className="text-left py-2">Kategori</th>
                <th className="text-left py-2">Tutar</th>
                <th className="text-left py-2">Tarih</th>
                <th className="text-left py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-white/10">
                  <td className="py-2">{s.student_name ?? "-"}</td>
                  <td className="py-2">{s.donem ?? "-"}</td>
                  <td className="py-2">{s.gelir_kategorisi ?? "-"}</td>
                  <td className="py-2">{Number(s.amount).toLocaleString("tr-TR")} ₺</td>
                  <td className="py-2">{s.paid_at}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-ghost" onClick={() => viewReceipt(s.id)} disabled={loadingId === s.id}>
                        Dekont
                      </button>
                      <button className="btn-primary" onClick={() => review(s.id, "approve")} disabled={loadingId === s.id}>
                        Onayla
                      </button>
                      <button className="btn-ghost" onClick={() => review(s.id, "reject")} disabled={loadingId === s.id}>
                        Reddet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

