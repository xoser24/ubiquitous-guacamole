"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function TrainingCreateForm({
  rol,
  antrenorler,
  initialTarih
}: {
  rol: "admin" | "antrenor" | "veli" | "ogrenci";
  antrenorler: { id: string; ad_soyad: string }[];
  initialTarih?: string;
}) {
  const [baslik, setBaslik] = useState("Antrenman");
  const [tarih, setTarih] = useState(initialTarih ?? "");
  const [saat, setSaat] = useState("18:00");
  const [konum, setKonum] = useState("");
  const [coachId, setCoachId] = useState(antrenorler[0]?.id ?? "");
  const [ogrenciler, setOgrenciler] = useState<{ id: string; ad_soyad: string; yas_grubu: string }[]>([]);
  const [secili, setSecili] = useState<Record<string, boolean>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const gorunur = useMemo(() => rol === "admin" || rol === "antrenor", [rol]);

  useEffect(() => {
    if (!gorunur) return;
    if (rol === "admin" && antrenorler.length === 0) {
      setHata("Sistemde antrenör yok. Önce antrenör oluşturun.");
      return;
    }
    (async () => {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      const uid = me.user?.id;
      const hedefCoachId = rol === "antrenor" ? uid : coachId;
      if (!hedefCoachId) return;

      const { data } = await sb
        .from("students")
        .select("id, ad_soyad, yas_grubu")
        .eq("coach_id", hedefCoachId)
        .order("ad_soyad", { ascending: true });

      const list = (data ?? []) as any[];
      setOgrenciler(list);
      const init: any = {};
      list.forEach((s) => (init[s.id] = false));
      setSecili(init);
    })();
  }, [gorunur, rol, coachId]);

  useEffect(() => {
    if (initialTarih && !tarih) setTarih(initialTarih);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTarih]);

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBilgi(null);
    if (!tarih || !saat || !konum) {
      setHata("Tarih, saat ve konum zorunludur.");
      return;
    }
    const seciliIds = Object.keys(secili).filter((k) => secili[k]);
    if (seciliIds.length === 0) {
      setHata("En az 1 oyuncu seçmelisiniz.");
      return;
    }

    const r = await fetch("/api/trainings/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        baslik,
        tarih,
        saat,
        konum,
        studentIds: seciliIds,
        coachId: rol === "admin" ? coachId : undefined
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setHata(j?.hata ?? "Antrenman oluşturulamadı.");
      return;
    }

    setBilgi("Antrenman oluşturuldu.");
    setBaslik("Antrenman");
    setTarih("");
    setSaat("18:00");
    setKonum("");
    setSecili((m) => {
      const n: any = {};
      Object.keys(m).forEach((k) => (n[k] = false));
      return n;
    });
  }

  if (!gorunur) return null;

  return (
    <form className="card card-neon p-6 space-y-4" onSubmit={olustur}>
      <div className="font-semibold">Yeni Antrenman Oturumu</div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-[color:var(--muted)]">Başlık</label>
          <input className="input mt-1" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Tarih</label>
          <input className="input mt-1" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Saat</label>
          <input className="input mt-1" type="time" value={saat} onChange={(e) => setSaat(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Konum</label>
          <input className="input mt-1" value={konum} onChange={(e) => setKonum(e.target.value)} />
        </div>
      </div>

      {rol === "admin" && (
        <div>
          <label className="text-sm text-[color:var(--muted)]">Antrenör</label>
          <select className="input mt-1" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            {antrenorler.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad_soyad}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <div className="text-sm text-[color:var(--muted)] mb-2">Oyuncular</div>
        <div className="grid md:grid-cols-2 gap-2">
          {ogrenciler.length === 0 && (
            <div className="text-sm text-[color:var(--muted)]">
              Bu antrenöre bağlı oyuncu bulunamadı. (Önce öğrenci ekleyin veya antrenör seçimini kontrol edin.)
            </div>
          )}
          {ogrenciler.map((o) => (
            <label key={o.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
              <input type="checkbox" checked={!!secili[o.id]} onChange={(e) => setSecili({ ...secili, [o.id]: e.target.checked })} />
              <span>{o.ad_soyad}</span>
              <span className="text-xs text-[color:var(--muted)]">({o.yas_grubu})</span>
            </label>
          ))}
        </div>
      </div>

      {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
      {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}

      <button className="btn-primary" type="submit">
        Oturum Oluştur
      </button>
    </form>
  );
}
