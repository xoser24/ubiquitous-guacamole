"use client";

import { useMemo, useState } from "react";
import { TrainingCreateForm } from "@/components/trainings/TrainingCreateForm";
import { CalendarView } from "@/components/trainings/CalendarView";
import { WeekPlannerView } from "@/components/trainings/WeekPlannerView";

export function TrainingsPlannerClient({
  rol,
  antrenorler,
  sessions
}: {
  rol: "admin" | "antrenor" | "veli" | "ogrenci";
  antrenorler: { id: string; ad_soyad: string }[];
  sessions: { id: string; baslik: string; tarih: string; saat?: string | null; konum?: string | null }[];
}) {
  const [tab, setTab] = useState<"planlayici" | "takvim">("planlayici");
  const [seciliTarih, setSeciliTarih] = useState<string>("");

  const calendarItems = useMemo(
    () => sessions.map((s) => ({ id: s.id, baslik: s.baslik, tarih: s.tarih })),
    [sessions]
  );

  return (
    <div className="space-y-6">
      {(rol === "admin" || rol === "antrenor") && (
        <TrainingCreateForm rol={rol} antrenorler={antrenorler} initialTarih={seciliTarih} />
      )}

      <div className="flex gap-2">
        <button
          className={tab === "planlayici" ? "btn-primary" : "btn-ghost"}
          type="button"
          onClick={() => setTab("planlayici")}
        >
          🗓️ Planlayıcı
        </button>
        <button
          className={tab === "takvim" ? "btn-primary" : "btn-ghost"}
          type="button"
          onClick={() => setTab("takvim")}
        >
          📅 Takvim
        </button>
      </div>

      {tab === "planlayici" ? (
        <WeekPlannerView
          sessions={sessions}
          onSelectDate={(d) => {
            setSeciliTarih(d);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : (
        <CalendarView sessions={calendarItems} />
      )}
    </div>
  );
}

