"use client";

import { useMemo, useState } from "react";

export function FinanceRemindersClient({ initialOutbox }: { initialOutbox: any[] }) {
  const [tab, setTab] = useState<"pending" | "sent" | "failed">("pending");
  const [list, setList] = useState<any[]>(initialOutbox ?? []);
  const [loading, setLoading] = useState(false);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const filtered = useMemo(() => list.filter((x) => x.status === tab), [list, tab]);

  async function generate() {
    setBilgi(null);
    setHata(null);
    setLoading(true);
    try {
      const r = await fetch("/api/finance/whatsapp/generate", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Üretilemedi.");
      setBilgi("Hatırlatmalar kuyruğa eklendi.");
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function dispatch() {
    setBilgi(null);
    setHata(null);
    setLoading(true);
    try {
      const r = await fetch("/api/whatsapp/dispatch", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Gönderim başarısız.");
      setBilgi(`Gönderim tamamlandı. Sent: ${j.sent ?? "?"} / Failed: ${j.failed ?? "?"}`);
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/finance/whatsapp/outbox", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Yenilenemedi.");
      setList(j.rows ?? []);
    } catch (e: any) {
      setHata(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">📲 Tahsilat Hatırlatmaları</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">WhatsApp kuyruk yönetimi (outbox)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" type="button" onClick={generate} disabled={loading}>
              Hatırlatma Üret
            </button>
            <button className="btn-primary" type="button" onClick={dispatch} disabled={loading}>
              Kuyruğu Gönder
            </button>
            <button className="btn-ghost" type="button" onClick={refresh} disabled={loading}>
              Yenile
            </button>
          </div>
        </div>
        {bilgi && <div className="text-sm text-[color:var(--success)] mt-3">{bilgi}</div>}
        {hata && <div className="text-sm text-[color:var(--danger)] mt-3">{hata}</div>}
      </div>

      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="font-semibold">Gönderim Listesi</div>
          <div className="flex flex-wrap gap-2">
            <button className={tab === "pending" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("pending")}>
              Pending
            </button>
            <button className={tab === "sent" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("sent")}>
              Sent
            </button>
            <button className={tab === "failed" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("failed")}>
              Failed
            </button>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {filtered.slice(0, 50).map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-[color:var(--muted)]">{r.tur}</div>
              <div className="text-sm mt-1 break-words">{r.text_body ?? "-"}</div>
              <div className="text-xs text-[color:var(--muted)] mt-2">
                {r.to_phone} • {new Date(r.created_at).toLocaleString("tr-TR")}
              </div>
              {r.error && <div className="text-xs text-[color:var(--danger)] mt-2">{r.error}</div>}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}

