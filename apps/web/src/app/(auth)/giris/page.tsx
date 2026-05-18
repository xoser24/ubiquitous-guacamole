"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function GirisPage() {
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const reduce = useReducedMotion();

  async function giris(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    try {
      // ÖNEMLİ: Panel (Server Component) tarafı oturumu cookie üzerinden okur.
      // Bu yüzden giriş işlemini server-side bir route ile yapıp cookie’yi set ediyoruz.
      const res = await fetch("/api/auth/giris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: eposta.trim(),
          password: sifre
        })
      });
      if (!res.ok) throw new Error("login_failed");
      window.location.href = "/";
    } catch {
      setHata("Giriş başarısız. E-posta veya şifre hatalı olabilir.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <motion.div
      className="w-full max-w-md"
      initial={reduce ? undefined : { opacity: 0, y: 14 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/35 backdrop-blur-2xl shadow-[0_26px_80px_rgba(0,0,0,.65)]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,.18),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(34,211,238,.18),transparent_55%)] pointer-events-none"
        />

        <div className="relative p-7 md:p-10 flex flex-col items-center text-center">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8">
            <img
              src="/club-logo.svg"
              alt="Altınordu Spor Kulübü"
              className="h-28 w-28 md:h-44 md:w-44 object-contain"
            />
          </div>
          <div className="mt-5 text-white/80 text-sm">Altınordu Spor Kulübü</div>
          <div className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">Giriş</div>
          <div className="mt-2 text-sm text-white/65">
            Hesaplar kulüp yönetimi tarafından oluşturulur.
          </div>

          <form className="mt-7 space-y-3 w-full text-left" onSubmit={giris}>
            <div>
              <label className="text-sm text-[color:var(--muted)]">E-posta</label>
              <input
                className="input mt-1"
                type="email"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Şifre</label>
              <input
                className="input mt-1"
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}

            <button className="btn-primary w-full" type="submit" disabled={yukleniyor}>
              {yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
