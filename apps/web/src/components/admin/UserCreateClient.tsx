"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rol = "admin" | "antrenor" | "veli" | "ogrenci";

export function UserCreateClient() {
  const router = useRouter();
  const [adSoyad, setAdSoyad] = useState("");
  const [telefon, setTelefon] = useState("");
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [rol, setRol] = useState<Rol>("antrenor");
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    setBilgi(null);
    setHata(null);
    setYukleniyor(true);
    try {
      const res = await fetch("/api/admin/kullanici-olustur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eposta,
          sifre,
          rol,
          ad_soyad: adSoyad,
          telefon: telefon || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.hata ?? "Hata");
      setBilgi("Kullanıcı oluşturuldu.");
      setAdSoyad("");
      setTelefon("");
      setEposta("");
      setSifre("");
      setRol("antrenor");
      // Server component listesi (users) yenilensin
      router.refresh();
    } catch {
      setHata("Kullanıcı oluşturulamadı.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form className="card card-neon p-6 space-y-4" onSubmit={olustur}>
      <div className="font-semibold">Kullanıcı Oluştur</div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-[color:var(--muted)]">Ad Soyad</label>
          <input className="input mt-1" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Telefon</label>
          <input className="input mt-1" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">E-posta</label>
          <input className="input mt-1" type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Şifre</label>
          <input className="input mt-1" type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-[color:var(--muted)]">Rol</label>
          <select className="input mt-1" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            <option value="admin">Admin</option>
            <option value="antrenor">Antrenör</option>
            <option value="veli">Veli</option>
            <option value="ogrenci">Öğrenci</option>
          </select>
        </div>
      </div>

      {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}

      <button className="btn-primary" type="submit" disabled={yukleniyor}>
        {yukleniyor ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
      </button>
    </form>
  );
}
