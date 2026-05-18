import { redirect } from "next/navigation";
import Link from "next/link";
import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import dayjs from "dayjs";
import { FinanceWhatsAppActionsClient } from "@/components/finance/FinanceWhatsAppActionsClient";

export default async function FinansOgrenciDetayPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { profil } = await girisZorunlu();
  if (profil.rol !== "admin") redirect("/yetkisiz");

  const { id } = await params;
  const sb = await supabaseServer();
  const today = dayjs().format("YYYY-MM-DD");

  const [{ data: ogr }, { data: payments }, { data: subs }, { data: events }, { data: wa }] = await Promise.all([
    sb
      .from("students")
      .select("id, ad_soyad, yas_grubu, veli_adi, veli_telefon, coach_id")
      .eq("id", id)
      .maybeSingle(),
    sb
      .from("student_payments")
      .select("id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi, durum, created_at")
      .eq("student_id", id)
      .order("son_odeme_tarihi", { ascending: false })
      .limit(200),
    sb
      .from("payment_submissions")
      .select("id, student_payment_id, amount, paid_at, status, created_at")
      .in(
        "student_payment_id",
        ((await sb
          .from("student_payments")
          .select("id")
          .eq("student_id", id)
          .limit(200)).data ?? []).map((x: any) => x.id)
      )
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("student_payment_events")
      .select("id, student_payment_id, tur, once, sonra, created_at")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("whatsapp_outbox")
      .select("id, tur, to_phone, status, text_body, created_at, error, related")
      .contains("related", { student_id: id })
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  if (!ogr) return <div className="card card-neon p-6">Öğrenci bulunamadı.</div>;

  const summary = (payments ?? []).reduce(
    (acc: any, p: any) => {
      const total = Number(p.tutar_toplam ?? 0);
      const paid = Number(p.tutar_odenen ?? 0);
      const rem = Math.max(0, total - paid);
      acc.total += total;
      acc.paid += paid;
      acc.remaining += rem;
      if (rem > 0 && p.son_odeme_tarihi < today) acc.overdue += 1;
      if (rem > 0) acc.open += 1;
      return acc;
    },
    { total: 0, paid: 0, remaining: 0, overdue: 0, open: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6 overflow-hidden relative">
        <div aria-hidden className="absolute -right-24 -top-24 h-56 w-56 rounded-full neon-dot opacity-70" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-[color:var(--muted)]">Tahsilat Detayı</div>
            <h1 className="text-2xl font-semibold mt-1">{ogr.ad_soyad}</h1>
            <div className="text-sm text-[color:var(--muted)] mt-1">
              {ogr.yas_grubu} • Veli: {ogr.veli_adi} ({ogr.veli_telefon})
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="btn-ghost" href="/finans/aidat">
              ← Aidat Takibi
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Toplam Borç</div>
          <div className="text-3xl font-semibold mt-2">{summary.total.toLocaleString("tr-TR")} ₺</div>
        </div>
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Ödenen</div>
          <div className="text-3xl font-semibold mt-2">{summary.paid.toLocaleString("tr-TR")} ₺</div>
        </div>
        <div className="card card-neon p-6">
          <div className="text-sm text-[color:var(--muted)]">Kalan</div>
          <div className="text-3xl font-semibold mt-2">{summary.remaining.toLocaleString("tr-TR")} ₺</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">
            Açık kalem: {summary.open} • Geciken: {summary.overdue}
          </div>
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-semibold">Hızlı Aksiyon</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">Veliye tahsilat hatırlatması</div>
          </div>
          <FinanceWhatsAppActionsClient
            studentId={ogr.id}
            dedupeKey={`finance:student:${ogr.id}:${dayjs().format("YYYY-MM-DD")}`}
            related={{ student_id: ogr.id, tur: "ogrenci_detay" }}
            defaultText={`💳 Tahsilat Bilgilendirme\n\n${ogr.ad_soyad} için toplam kalan borç: ${summary.remaining.toLocaleString("tr-TR")} ₺.\nGeciken ödeme sayısı: ${summary.overdue}.\n\nÖdeme/detay için dönüş yapabilir misiniz?`}
          />
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Aidat / Ödeme Kalemleri</div>
        <div className="grid md:grid-cols-2 gap-3">
          {(payments ?? []).map((p: any) => {
            const kalan = Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0));
            const late = kalan > 0 ? dayjs(today).diff(dayjs(p.son_odeme_tarihi), "day") : 0;
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {p.gelir_kategorisi} • {p.donem}
                    </div>
                    <div className="text-sm text-[color:var(--muted)] mt-1">
                      Son tarih: {p.son_odeme_tarihi} {late > 0 ? `• ${late} gün gecikme` : ""}
                    </div>
                  </div>
                  <span className="chip">{p.durum}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                    <div className="font-semibold">{Number(p.tutar_toplam).toLocaleString("tr-TR")} ₺</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                    <div className="font-semibold">{Number(p.tutar_odenen).toLocaleString("tr-TR")} ₺</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                    <div className="font-semibold">{Number(kalan).toLocaleString("tr-TR")} ₺</div>
                  </div>
                </div>
              </div>
            );
          })}
          {(payments ?? []).length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Dekont / Ödeme Bildirimleri</div>
          <div className="space-y-2">
            {(subs ?? []).slice(0, 30).map((s: any) => (
              <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    {Number(s.amount).toLocaleString("tr-TR")} ₺ • {s.paid_at}
                  </div>
                  <span className="chip">{s.status}</span>
                </div>
                <div className="text-xs text-[color:var(--muted)] mt-1">
                  {new Date(s.created_at).toLocaleString("tr-TR")}
                </div>
              </div>
            ))}
            {(subs ?? []).length === 0 && <div className="text-[color:var(--muted)]">Bildirim yok.</div>}
          </div>
        </div>

        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">WhatsApp Geçmişi</div>
          <div className="space-y-2">
            {(wa ?? []).slice(0, 30).map((m: any) => (
              <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">{m.tur}</div>
                  <span className="chip">{m.status}</span>
                </div>
                <div className="text-xs text-[color:var(--muted)] mt-1">
                  {m.to_phone} • {new Date(m.created_at).toLocaleString("tr-TR")}
                </div>
                {m.text_body && <div className="text-sm mt-2 whitespace-pre-wrap">{m.text_body}</div>}
                {m.error && <div className="text-xs text-[color:var(--danger)] mt-2">{m.error}</div>}
              </div>
            ))}
            {(wa ?? []).length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
          </div>
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Ödeme Olayları (Immutable Log)</div>
        <div className="space-y-2">
          {(events ?? []).slice(0, 30).map((e: any) => (
            <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">{e.tur}</div>
                <div className="text-xs text-[color:var(--muted)]">{new Date(e.created_at).toLocaleString("tr-TR")}</div>
              </div>
              <div className="text-xs text-[color:var(--muted)] mt-1">payment_id: {e.student_payment_id}</div>
            </div>
          ))}
          {(events ?? []).length === 0 && <div className="text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}

