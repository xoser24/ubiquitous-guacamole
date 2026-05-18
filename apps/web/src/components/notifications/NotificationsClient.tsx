"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function NotificationsClient({ initial }: { initial: any[] }) {
  const [list, setList] = useState<any[]>(initial ?? []);
  const [hata, setHata] = useState<string | null>(null);

  async function okunduYap(id: string) {
    setHata(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.from("notifications").update({ okundu: true }).eq("id", id);
      if (error) throw error;
      setList((l) => l.map((n) => (n.id === id ? { ...n, okundu: true } : n)));
    } catch {
      setHata("Bildirim güncellenemedi.");
    }
  }

  return (
    <div className="card card-neon p-6">
      <div className="font-semibold mb-3">Bildirimler</div>
      {hata && <div className="text-sm text-[color:var(--danger)] mb-2">{hata}</div>}
      {list.length === 0 ? (
        <div className="text-[color:var(--muted)]">Bildirim yok.</div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-start justify-between gap-3 hover:border-[color:var(--accent-a)]/25 transition"
            >
              <div>
                <div className="font-semibold">{n.baslik}</div>
                <div className="text-sm text-[color:var(--muted)] mt-1">{n.icerik}</div>
                <div className="text-xs text-[color:var(--muted)] mt-1">{new Date(n.created_at).toLocaleString("tr-TR")}</div>
              </div>
              {!n.okundu && (
                <button className="btn-primary" onClick={() => okunduYap(n.id)}>
                  Okundu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
