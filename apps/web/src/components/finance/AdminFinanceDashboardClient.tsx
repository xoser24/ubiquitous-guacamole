"use client";

import { useMemo, useState } from "react";
import { PaymentApprovalsClient } from "@/components/finance/PaymentApprovalsClient";

type Student = { id: string; ad_soyad: string; yas_grubu?: string | null; coach_id?: string | null };
type Coach = { id: string; ad_soyad: string };

type StudentPayment = {
  id: string;
  student_id: string;
  donem: string;
  gelir_kategorisi: string;
  tutar_toplam: number;
  tutar_odenen: number;
  son_odeme_tarihi: string;
  durum: string;
};

type Submission = {
  id: string;
  amount: number;
  paid_at: string;
  status: string;
  student_payment_id: string;
  student_name?: string;
  donem?: string;
  gelir_kategorisi?: string;
};

function daysLate(due: string) {
  const dueD = new Date(due + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now.getTime() - dueD.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function money(n: number) {
  return Number(n ?? 0).toLocaleString("tr-TR");
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "btn-primary" : "btn-ghost"}
      style={{ paddingInline: 14 }}
    >
      {children}
    </button>
  );
}

export function AdminFinanceDashboardClient({
  students,
  coaches,
  studentPayments,
  pendingSubmissions,
  allSubmissions
}: {
  students: Student[];
  coaches: Coach[];
  studentPayments: StudentPayment[];
  pendingSubmissions: Submission[];
  allSubmissions: Submission[];
}) {
  const [tab, setTab] = useState<"ozet" | "borclar" | "dekontlar">("ozet");

  // Filtreler
  const [donem, setDonem] = useState<string>("");
  const [durum, setDurum] = useState<string>("");
  const [yas, setYas] = useState<string>("");
  const [coachId, setCoachId] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const donemler = useMemo(() => {
    const set = new Set<string>();
    studentPayments.forEach((p) => set.add(p.donem));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [studentPayments]);

  const yasGruplari = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.yas_grubu && set.add(s.yas_grubu));
    return Array.from(set).sort((a, b) => (a < b ? -1 : 1));
  }, [students]);

  const filteredPayments = useMemo(() => {
    return studentPayments.filter((p) => {
      const st = studentsById.get(p.student_id);
      if (donem && p.donem !== donem) return false;
      if (durum && p.durum !== durum) return false;
      if (yas && (st?.yas_grubu ?? "") !== yas) return false;
      if (coachId && (st?.coach_id ?? "") !== coachId) return false;
      if (q) {
        const name = (st?.ad_soyad ?? "").toLowerCase();
        if (!name.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [studentPayments, studentsById, donem, durum, yas, coachId, q]);

  // Öğrenci bazlı özet (gecikme gününe göre sıralama)
  const studentSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        student: Student;
        total: number;
        paid: number;
        remaining: number;
        worstLate: number; // max days late
        nearestDue?: string;
        lateCount: number;
      }
    >();

    filteredPayments.forEach((p) => {
      const st = studentsById.get(p.student_id);
      if (!st) return;
      const cur =
        map.get(st.id) ??
        ({
          student: st,
          total: 0,
          paid: 0,
          remaining: 0,
          worstLate: -9999,
          nearestDue: undefined,
          lateCount: 0
        } as any);

      const total = Number(p.tutar_toplam ?? 0);
      const paid = Number(p.tutar_odenen ?? 0);
      const remaining = Math.max(0, total - paid);

      cur.total += total;
      cur.paid += paid;
      cur.remaining += remaining;

      const late = daysLate(p.son_odeme_tarihi);
      if (remaining > 0 && late > 0) {
        cur.worstLate = Math.max(cur.worstLate, late);
        cur.lateCount += 1;
      }

      if (remaining > 0) {
        if (!cur.nearestDue || p.son_odeme_tarihi < cur.nearestDue) cur.nearestDue = p.son_odeme_tarihi;
      }

      map.set(st.id, cur);
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => (b.worstLate ?? 0) - (a.worstLate ?? 0));
    return arr;
  }, [filteredPayments, studentsById]);

  const statusOptions = ["ödenmedi", "kısmi", "gecikmiş", "ödendi"];

  return (
    <div className="space-y-6">
      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-[color:var(--muted)]">Finans</div>
            <div className="text-2xl font-semibold">Kontrol Paneli</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">Öğrenci bazlı özet + borç listesi + dekont onay</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton active={tab === "ozet"} onClick={() => setTab("ozet")}>
              Öğrenci Özeti
            </TabButton>
            <TabButton active={tab === "borclar"} onClick={() => setTab("borclar")}>
              Borç Listesi
            </TabButton>
            <TabButton active={tab === "dekontlar"} onClick={() => setTab("dekontlar")}>
              Dekontlar
            </TabButton>
          </div>
        </div>

        {/* Filtreler */}
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Dönem / Ay</div>
            <select className="input" value={donem} onChange={(e) => setDonem(e.target.value)}>
              <option value="">Hepsi</option>
              {donemler.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Borç durumu</div>
            <select className="input" value={durum} onChange={(e) => setDurum(e.target.value)}>
              <option value="">Hepsi</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Yaş grubu / takım</div>
            <select className="input" value={yas} onChange={(e) => setYas(e.target.value)}>
              <option value="">Hepsi</option>
              {yasGruplari.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Koç</div>
            <select className="input" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              <option value="">Hepsi</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ad_soyad}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)] mb-1">Ara (öğrenci)</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad soyad..." />
          </div>
        </div>
      </div>

      {tab === "dekontlar" && (
        <div className="space-y-4">
          <PaymentApprovalsClient initial={pendingSubmissions} />

          <div className="card card-neon p-6">
            <div className="font-semibold">Son Dekont Hareketleri</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">Onaylanan ve reddedilenler</div>
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {(allSubmissions ?? []).slice(0, 10).map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold">{s.student_name ?? "-"}</div>
                  <div className="text-sm text-[color:var(--muted)] mt-1">
                    {s.donem} • {s.gelir_kategorisi}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">{money(s.amount)} ₺</div>
                    <span className="chip">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "ozet" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {studentSummary.map((s) => (
            <div key={s.student.id} className="card card-neon card-neon-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{s.student.ad_soyad}</div>
                  <div className="text-sm text-[color:var(--muted)] mt-0.5">
                    {s.student.yas_grubu ?? "-"} • Kalan: {money(s.remaining)} ₺
                  </div>
                </div>
                <div className="chip">{s.worstLate > 0 ? `${s.worstLate} gün gecikme` : "Güncel"}</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                  <div className="font-semibold">{money(s.total)} ₺</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                  <div className="font-semibold">{money(s.paid)} ₺</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-[color:var(--muted)]">Geciken</div>
                  <div className="font-semibold">{s.lateCount}</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-[color:var(--muted)]">
                Yakın son tarih: {s.nearestDue ?? "—"}
              </div>
            </div>
          ))}
          {studentSummary.length === 0 && <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      )}

      {tab === "borclar" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPayments
            .slice()
            .sort((a, b) => daysLate(b.son_odeme_tarihi) - daysLate(a.son_odeme_tarihi))
            .map((p) => {
              const st = studentsById.get(p.student_id);
              const kalan = Math.max(0, Number(p.tutar_toplam) - Number(p.tutar_odenen ?? 0));
              const late = kalan > 0 ? daysLate(p.son_odeme_tarihi) : 0;
              return (
                <div key={p.id} className="card card-neon card-neon-hover p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{st?.ad_soyad ?? "-"}</div>
                      <div className="text-sm text-[color:var(--muted)] mt-1">
                        {p.donem} • {p.gelir_kategorisi}
                      </div>
                    </div>
                    <span className="chip">{late > 0 ? `${late} gün gecikme` : p.durum}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[color:var(--muted)]">Toplam</div>
                      <div className="font-semibold">{money(p.tutar_toplam)} ₺</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[color:var(--muted)]">Ödenen</div>
                      <div className="font-semibold">{money(p.tutar_odenen)} ₺</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-[color:var(--muted)]">Kalan</div>
                      <div className="font-semibold">{money(kalan)} ₺</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-[color:var(--muted)]">Son tarih: {p.son_odeme_tarihi}</div>
                </div>
              );
            })}
          {filteredPayments.length === 0 && <div className="card card-neon p-6 text-[color:var(--muted)]">Kayıt yok.</div>}
        </div>
      )}
    </div>
  );
}

