import { redirect } from "next/navigation";
import { girisZorunlu } from "@/lib/auth";
import { dispatchWhatsAppOutbox } from "@/lib/whatsapp-dispatch";

export default async function AdminWhatsAppPage() {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="text-2xl font-semibold">📲 WhatsApp Entegrasyonu</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Yoklama / antrenman hatırlatma / ödeme gecikmesi için mesaj kuyruğu (outbox) kullanılır.
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="chip">1) DB migration: 0009_whatsapp_integration.sql</div>
          <div className="chip">2) Webhook: /api/whatsapp/webhook</div>
          <div className="chip">3) Dispatcher: /api/whatsapp/dispatch (POST)</div>
        </div>

        <div className="mt-4 text-sm text-[color:var(--muted)]">
          Not: Meta Cloud API'de üretim için şablon (template) gerekebilir. Şu an text gönderimi mevcut.
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="font-semibold">🚀 Test / Çalıştır</div>
        <div className="text-sm text-[color:var(--muted)] mt-1">
          Bu buton pending WhatsApp kuyruğunu gönderir (server-side).
        </div>

        <form
          className="mt-4"
          action={async () => {
            "use server";
            await dispatchWhatsAppOutbox(25);
          }}
        >
          <button className="btn-primary" type="submit">
            ✅ Kuyruğu Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
