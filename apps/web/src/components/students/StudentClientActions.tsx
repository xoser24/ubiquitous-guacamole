"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export function HealthEditor({
  studentId,
  canEdit,
  initial
}: {
  studentId: string;
  canEdit: boolean;
  initial: any;
}) {
  const [form, setForm] = useState<any>(initial ?? {});
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => setForm(initial ?? {}), [initial]);

  async function kaydet() {
    setBilgi(null);
    setHata(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb
        .from("student_health")
        .upsert({ student_id: studentId, ...form }, { onConflict: "student_id" });
      if (error) throw error;
      setBilgi("Sağlık bilgileri kaydedildi.");
    } catch {
      setHata("Sağlık bilgileri kaydedilemedi.");
    }
  }

  return (
    <div className="card card-neon p-6 space-y-3">
      <div className="font-semibold">Sağlık</div>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <div className="text-[color:var(--muted)]">Aktif sakatlık</div>
          <input
            className="input"
            disabled={!canEdit}
            value={form.aktif_sakatlik ?? ""}
            onChange={(e) => setForm({ ...form, aktif_sakatlik: e.target.value })}
          />
        </label>
        <label className="space-y-1">
          <div className="text-[color:var(--muted)]">Sakatlık geçmişi</div>
          <input
            className="input"
            disabled={!canEdit}
            value={form.sakatlik_gecmisi ?? ""}
            onChange={(e) => setForm({ ...form, sakatlik_gecmisi: e.target.value })}
          />
        </label>
        <label className="space-y-1">
          <div className="text-[color:var(--muted)]">Alerjiler</div>
          <input
            className="input"
            disabled={!canEdit}
            value={form.alerjiler ?? ""}
            onChange={(e) => setForm({ ...form, alerjiler: e.target.value })}
          />
        </label>
        <label className="space-y-1">
          <div className="text-[color:var(--muted)]">Antrenman kısıtlamaları</div>
          <input
            className="input"
            disabled={!canEdit}
            value={form.antrenman_kisitlamalari ?? ""}
            onChange={(e) =>
              setForm({ ...form, antrenman_kisitlamalari: e.target.value })
            }
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-[color:var(--muted)]">Sağlık notları</div>
          <textarea
            className="input min-h-24"
            disabled={!canEdit}
            value={form.saglik_notlari ?? ""}
            onChange={(e) => setForm({ ...form, saglik_notlari: e.target.value })}
          />
        </label>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={kaydet}>
            Kaydet
          </button>
          {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
          {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
        </div>
      )}
    </div>
  );
}

export function CurrentPerformanceEditor({
  studentId,
  canEdit,
  initial
}: {
  studentId: string;
  canEdit: boolean;
  initial: any;
}) {
  const [form, setForm] = useState<any>(initial ?? {});
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => setForm(initial ?? {}), [initial]);

  async function kaydet() {
    setBilgi(null);
    setHata(null);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb
        .from("student_performance_current")
        .upsert({ student_id: studentId, ...form }, { onConflict: "student_id" });
      if (error) throw error;
      setBilgi("Performans kaydedildi.");
    } catch {
      setHata("Performans kaydedilemedi.");
    }
  }

  const barData = useMemo(() => {
    const p = form ?? {};
    return {
      labels: ["Hız", "Şut", "Pas", "Dripling", "Dayanıklılık", "Oyun Zekası", "Disiplin"],
      datasets: [
        {
          label: "Güncel",
          data: [
            p.hiz ?? 0,
            p.sut ?? 0,
            p.pas ?? 0,
            p.dripling ?? 0,
            p.dayaniklilik ?? 0,
            p.oyun_zekasi ?? 0,
            p.disiplin ?? 0
          ],
          backgroundColor: "rgba(212,175,55,.25)",
          borderColor: "rgba(212,175,55,1)",
          borderWidth: 1
        }
      ]
    };
  }, [form]);

  return (
    <div className="card card-neon p-6 space-y-3">
      <div className="font-semibold">Performans (0-100)</div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["hiz", "Hız"],
            ["sut", "Şut"],
            ["pas", "Pas"],
            ["dripling", "Dripling"],
            ["dayaniklilik", "Dayanıklılık"],
            ["oyun_zekasi", "Oyun Zekası"],
            ["disiplin", "Disiplin"]
          ].map(([k, label]) => (
            <label key={k} className="space-y-1">
              <div className="text-[color:var(--muted)]">{label}</div>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                disabled={!canEdit}
                value={form?.[k] ?? 0}
                onChange={(e) =>
                  setForm({ ...form, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Bar data={barData} />
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={kaydet}>
            Kaydet
          </button>
          {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
          {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
        </div>
      )}
    </div>
  );
}

export function WeeklyPerformanceAdder({
  studentId,
  canEdit
}: {
  studentId: string;
  canEdit: boolean;
}) {
  const [hafta, setHafta] = useState("");
  const [notu, setNotu] = useState("");
  const [form, setForm] = useState<any>({
    hiz: 50,
    sut: 50,
    pas: 50,
    dripling: 50,
    dayaniklilik: 50,
    oyun_zekasi: 50,
    disiplin: 50
  });
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    setBilgi(null);
    setHata(null);
    if (!hafta) {
      setHata("Hafta başlangıç tarihi zorunludur.");
      return;
    }
    try {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      const uid = me.user?.id;
      if (!uid) throw new Error("no user");

      const { error } = await sb.from("performance_logs").insert({
        student_id: studentId,
        hafta_baslangic: hafta,
        ...form,
        notu,
        created_by: uid
      });
      if (error) throw error;
      setBilgi("Haftalık kayıt eklendi.");
      setHafta("");
      setNotu("");
    } catch (e: any) {
      setHata("Haftalık kayıt eklenemedi. Aynı hafta için kayıt zaten olabilir.");
    }
  }

  if (!canEdit) return null;

  return (
    <div className="card card-neon p-6 space-y-3">
      <div className="font-semibold">Haftalık İlerleme Ekle</div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="space-y-1">
          <div className="text-[color:var(--muted)]">Hafta başlangıç</div>
          <input className="input" type="date" value={hafta} onChange={(e) => setHafta(e.target.value)} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-[color:var(--muted)]">Not</div>
          <input className="input" value={notu} onChange={(e) => setNotu(e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {[
          ["hiz", "Hız"],
          ["sut", "Şut"],
          ["pas", "Pas"],
          ["dripling", "Dripling"],
          ["dayaniklilik", "Dayanıklılık"],
          ["oyun_zekasi", "Oyun Zekası"],
          ["disiplin", "Disiplin"]
        ].map(([k, label]) => (
          <label key={k} className="space-y-1">
            <div className="text-[color:var(--muted)]">{label}</div>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={form[k] ?? 0}
              onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={ekle}>
          Ekle
        </button>
        {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
        {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
      </div>
    </div>
  );
}

export function CoachNoteAdder({
  studentId,
  canEdit
}: {
  studentId: string;
  canEdit: boolean;
}) {
  const [note, setNote] = useState("");
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    setBilgi(null);
    setHata(null);
    if (!note.trim()) return;
    try {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      const uid = me.user?.id;
      if (!uid) throw new Error("no user");

      const { error } = await sb.from("coach_notes").insert({
        student_id: studentId,
        coach_id: uid,
        note: note.trim()
      });
      if (error) throw error;
      setBilgi("Not eklendi.");
      setNote("");
    } catch {
      setHata("Not eklenemedi.");
    }
  }

  if (!canEdit) return null;

  return (
    <div className="card card-neon p-6 space-y-3">
      <div className="font-semibold">Antrenör Notu</div>
      <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={ekle}>
          Not Ekle
        </button>
        {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
        {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}
      </div>
    </div>
  );
}

export function WeeklyTrendChart({ logs }: { logs: any[] }) {
  const data = useMemo(() => {
    const labels = logs.map((l) => String(l.hafta_baslangic));
    return {
      labels,
      datasets: [
        {
          label: "Hız",
          data: logs.map((l) => l.hiz),
          borderColor: "#D4AF37",
          backgroundColor: "rgba(212,175,55,.15)"
        },
        {
          label: "Dayanıklılık",
          data: logs.map((l) => l.dayaniklilik),
          borderColor: "#60A5FA",
          backgroundColor: "rgba(96,165,250,.12)"
        }
      ]
    };
  }, [logs]);

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[color:var(--muted)]">
        Henüz haftalık kayıt yok.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <Line data={data} />
    </div>
  );
}
