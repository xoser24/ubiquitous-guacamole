"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function StudentCreateForm({
  antrenorler,
  veliler,
  ogrenciHesaplari
}: {
  antrenorler: { id: string; ad_soyad: string }[];
  veliler: { id: string; ad_soyad: string }[];
  ogrenciHesaplari: { id: string; ad_soyad: string }[];
}) {
  const [form, setForm] = useState<any>({
    ad_soyad: "",
    dogum_tarihi: "",
    yas_grubu: "U12",
    mevki: "Orta Saha",
    boy_cm: "",
    kilo_kg: "",
    ayak: "Sağ",
    coach_id: antrenorler[0]?.id ?? "",
    parent_id: veliler[0]?.id ?? "",
    student_user_id: "",
    veli_adi: "",
    veli_telefon: "",
    acil_durum_numarasi: ""
  });

  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBilgi(null);
    setYukleniyor(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.from("students").insert({
        ad_soyad: form.ad_soyad.trim(),
        dogum_tarihi: form.dogum_tarihi,
        yas_grubu: form.yas_grubu,
        mevki: form.mevki,
        boy_cm: form.boy_cm ? Number(form.boy_cm) : null,
        kilo_kg: form.kilo_kg ? Number(form.kilo_kg) : null,
        ayak: form.ayak,
        coach_id: form.coach_id,
        parent_id: form.parent_id,
        student_user_id: form.student_user_id || null,
        veli_adi: form.veli_adi.trim(),
        veli_telefon: form.veli_telefon.trim(),
        acil_durum_numarasi: form.acil_durum_numarasi.trim()
      });
      if (error) throw error;
      setBilgi("Öğrenci oluşturuldu.");
      setForm((f: any) => ({ ...f, ad_soyad: "", dogum_tarihi: "" }));
    } catch (err: any) {
      setHata("Öğrenci oluşturulamadı. Alanları kontrol edin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form className="card card-neon p-6 space-y-4" onSubmit={kaydet}>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-[color:var(--muted)]">Ad Soyad</label>
          <input className="input mt-1" value={form.ad_soyad} onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Doğum Tarihi</label>
          <input className="input mt-1" type="date" value={form.dogum_tarihi} onChange={(e) => setForm({ ...form, dogum_tarihi: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Yaş Grubu</label>
          <input className="input mt-1" value={form.yas_grubu} onChange={(e) => setForm({ ...form, yas_grubu: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Mevki</label>
          <select className="input mt-1" value={form.mevki} onChange={(e) => setForm({ ...form, mevki: e.target.value })}>
            <option>Kaleci</option>
            <option>Defans</option>
            <option>Orta Saha</option>
            <option>Forvet</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Boy (cm)</label>
          <input className="input mt-1" value={form.boy_cm} onChange={(e) => setForm({ ...form, boy_cm: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Kilo (kg)</label>
          <input className="input mt-1" value={form.kilo_kg} onChange={(e) => setForm({ ...form, kilo_kg: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Ayak</label>
          <select className="input mt-1" value={form.ayak} onChange={(e) => setForm({ ...form, ayak: e.target.value })}>
            <option>Sağ</option>
            <option>Sol</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Antrenör</label>
          <select className="input mt-1" value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })}>
            {antrenorler.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad_soyad}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Veli hesabı</label>
          <select className="input mt-1" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
            {veliler.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ad_soyad}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="text-sm text-[color:var(--muted)]">Öğrenci kullanıcı hesabı (opsiyonel)</label>
          <select className="input mt-1" value={form.student_user_id} onChange={(e) => setForm({ ...form, student_user_id: e.target.value })}>
            <option value="">Bağlama</option>
            {ogrenciHesaplari.map((o) => (
              <option key={o.id} value={o.id}>
                {o.ad_soyad}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-[color:var(--muted)]">Veli adı</label>
          <input className="input mt-1" value={form.veli_adi} onChange={(e) => setForm({ ...form, veli_adi: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Telefon</label>
          <input className="input mt-1" value={form.veli_telefon} onChange={(e) => setForm({ ...form, veli_telefon: e.target.value })} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Acil durum numarası</label>
          <input className="input mt-1" value={form.acil_durum_numarasi} onChange={(e) => setForm({ ...form, acil_durum_numarasi: e.target.value })} />
        </div>
      </div>

      {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
      {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}

      <button className="btn-primary" type="submit" disabled={yukleniyor}>
        {yukleniyor ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
