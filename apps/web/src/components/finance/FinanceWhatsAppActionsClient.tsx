"use client";

import { useState } from "react";

export function FinanceWhatsAppActionsClient({
  studentId,
  defaultText,
  dedupeKey,
  related
}: {
  studentId: string;
  defaultText: string;
  dedupeKey: string;
  related?: Record<string, any>;
}) {
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  async function gonder() {
    setHata(null);
    setBilgi(null);
    setLoading(true);
    try {
      const r = await fetch("/api/finance/whatsapp/send-student", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, text: defaultText, dedupeKey, related: related ?? {} })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Gönderilemedi.");
      setBilgi("Kuyruğa eklendi.");
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button className="btn-primary" type="button" onClick={gonder} disabled={loading}>
        WhatsApp Gönder
      </button>
      {bilgi && <span className="text-xs text-[color:var(--success)]">{bilgi}</span>}
      {hata && <span className="text-xs text-[color:var(--danger)]">{hata}</span>}
    </div>
  );
}

