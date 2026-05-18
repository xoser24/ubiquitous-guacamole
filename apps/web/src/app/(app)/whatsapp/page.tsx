import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";

function normalizePhone(raw: string) {
  // Sadece rakam kalsın: +90 5xx -> 905xx
  return raw.replace(/[^\d]/g, "");
}

export default async function WhatsAppVeliPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "veli") redirect("/yetkisiz");

  const rawPhone = process.env.NEXT_PUBLIC_SCHOOL_WHATSAPP_PHONE ?? "";
  const phone = normalizePhone(rawPhone);
  const defaultText =
    process.env.NEXT_PUBLIC_SCHOOL_WHATSAPP_TEXT ??
    "Merhaba, Altınordu Spor Kulübü hakkında bilgi almak istiyorum.";

  const waLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(defaultText)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full neon-dot opacity-70 pointer-events-none" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <img src="/club-logo.svg" alt="Altınordu Spor Kulübü" className="h-10 w-10 object-contain" />
            </span>
            <div>
              <div className="text-xs text-[color:var(--muted)]">Veli İletişim Merkezi</div>
              <h1 className="text-2xl md:text-3xl font-semibold mt-1">📲 WhatsApp</h1>
              <div className="text-sm text-[color:var(--muted)] mt-2">
                Okul yönetimi ile hızlı, doğrudan ve kayıtlı iletişim.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="chip">⏱️ Hızlı dönüş</span>
            <span className="chip">📌 Tek tuş</span>
            <span className="chip">🔒 Güvenli</span>
          </div>
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-1">
            <div className="text-sm text-[color:var(--muted)]">Okul WhatsApp</div>
            <div className="text-xl font-semibold mt-1">{rawPhone ? rawPhone : "Tanımlı değil"}</div>
            <div className="text-sm text-[color:var(--muted)] mt-2">
              Mesaj, WhatsApp uygulamasında yeni sohbet olarak açılır.
            </div>
            <div className="mt-4">
              {waLink ? (
                <a className="btn-primary w-full" href={waLink} target="_blank" rel="noreferrer">
                  WhatsApp’ta Aç
                </a>
              ) : (
                <div className="text-sm text-[color:var(--danger)]">
                  WhatsApp numarası tanımlı değil. Admin numarayı sisteme eklemeli.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-[color:var(--muted)]">Hazır mesaj</div>
                <div className="text-xs text-[color:var(--muted)] mt-1">İstersen yönetim bu metni özelleştirebilir.</div>
              </div>
              <span className="chip">✅ Tek tık</span>
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 whitespace-pre-wrap text-sm">
              {defaultText}
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-[color:var(--muted)]">Konu örnekleri</div>
                <div className="mt-2 text-sm">Aidat • Antrenman • Kayıt</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-[color:var(--muted)]">Yanıt</div>
                <div className="mt-2 text-sm">WhatsApp üzerinden</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-[color:var(--muted)]">Not</div>
                <div className="mt-2 text-sm">Mesajı göndermeden önce düzenleyebilirsin.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
