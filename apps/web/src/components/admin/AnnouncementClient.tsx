"use client";

import { useState } from "react";

export function AnnouncementClient() {
  const [baslik, setBaslik] = useState("Duyuru");
  const [icerik, setIcerik] = useState("");
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setBilgi(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/duyuru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik, icerik })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.hata ?? "Hata");
      setBilgi("Duyuru gönderildi.");
      setIcerik("");
    } catch {
      setHata("Duyuru gönderilemedi.");
    }
  }

  return (
    <form className="card card-neon p-6 space-y-3" onSubmit={gonder}>
      <div className="font-semibold">Toplu Duyuru</div>
      <div>
        <label className="text-sm text-[color:var(--muted)]">Başlık</label>
        <input className="input mt-1" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
      </div>
      <div>
        <label className="text-sm text-[color:var(--muted)]">İçerik</label>
        <textarea className="input min-h-24 mt-1" value={icerik} onChange={(e) => setIcerik(e.target.value)} />
      </div>
      {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
      <button className="btn-primary" type="submit">
        Gönder
      </button>
    </form>
  );
}
