import { girisZorunlu } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export default async function BildirimlerPage() {
  const { user } = await girisZorunlu();
  const sb = await supabaseServer();

  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bildirimler</h1>
        <div className="text-sm text-[color:var(--muted)]">
          Antrenman, ödeme, yoklama ve duyurular
        </div>
      </div>

      <NotificationsClient initial={(data ?? []) as any} />
    </div>
  );
}

