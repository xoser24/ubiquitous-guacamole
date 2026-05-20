"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Bar, Line } from "react-chartjs-2";
import { motion, useReducedMotion } from "framer-motion";
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
import { duzenleBorcKaydi, duzenleDefterKaydi, iptalBorcKaydi, iptalDefterKaydi } from "@/components/finance/FinanceEditActions";
import { StudentFinanceModalClient } from "@/components/finance/StudentFinanceModalClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export function FinanceClient({
  students,
  initialTransactions,
  initialStudentPayments
}: {
  students: { id: string; ad_soyad: string }[];
  initialTransactions: any[];
  initialStudentPayments: any[];
}) {
  const reduceMotion = useReducedMotion();
  const [donem, setDonem] = useState(dayjs().format("YYYY-MM"));

  // Karma model:
  // - Üstte öğrenci filtresi (seçiliyse listeler/özetler o öğrenciye göre)
  // - Yeni işlem eklerken ayrıca öğrenci seçimi (opsiyonel: genel işlem için boş bırakılabilir)
  const [filterStudentId, setFilterStudentId] = useState<string>("");
  const [studentQ, setStudentQ] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalStudent, setModalStudent] = useState<any | null>(null);
  const [modalPayments, setModalPayments] = useState<any[]>([]);
  const [modalTx, setModalTx] = useState<any[]>([]);
  const [txTur, setTxTur] = useState<"gelir" | "gider">("gelir");
  const [kategori, setKategori] = useState("Aylık Aidat");
  const [tutar, setTutar] = useState<number>(0);
  const [tarih, setTarih] = useState(dayjs().format("YYYY-MM-DD"));
  const [aciklama, setAciklama] = useState("");

  const [txStudentId, setTxStudentId] = useState<string>("");
  const [ogrenciId, setOgrenciId] = useState(students[0]?.id ?? "");
  const [gelirKategorisi, setGelirKategorisi] = useState("Aylık Aidat");
  const [tutarToplam, setTutarToplam] = useState<number>(0);
  const [tutarOdenen, setTutarOdenen] = useState<number>(0);
  const [sonOdeme, setSonOdeme] = useState(dayjs().format("YYYY-MM-DD"));


  const [transactions, setTransactions] = useState<any[]>(initialTransactions ?? []);
  const [payments, setPayments] = useState<any[]>(initialStudentPayments ?? []);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const studentNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (students ?? []).forEach((s) => m.set(s.id, s.ad_soyad));
    return m;
  }, [students]);

  const filteredTransactions = useMemo(() => {
    if (!filterStudentId) return transactions;
    return transactions.filter((t) => t.student_id === filterStudentId);
  }, [transactions, filterStudentId]);

  const filteredStudents = useMemo(() => {
    const qq = studentQ.trim().toLowerCase();
    if (!qq) return students;
    return (students ?? []).filter((s) => (s.ad_soyad ?? "").toLowerCase().includes(qq));
  }, [students, studentQ]);

  const monthCategoryAgg = useMemo(() => {
    const monthTx = filteredTransactions.filter((t) => dayjs(t.tarih).format("YYYY-MM") === donem);
    const m = new Map<string, { gelir: number; gider: number }>();
    monthTx.forEach((t) => {
      const key = t.kategori ?? "Diğer";
      const cur = m.get(key) ?? { gelir: 0, gider: 0 };
      if (t.tur === "gelir") cur.gelir += Number(t.tutar);
      else cur.gider += Number(t.tutar);
      m.set(key, cur);
    });
    const rows = Array.from(m.entries())
      .map(([kategori, v]) => ({ kategori, ...v, net: v.gelir - v.gider }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    const giderCount = monthTx.filter((t) => t.tur === "gider").length;
    return { rows, giderCount };
  }, [filteredTransactions, donem]);

  const ozet = useMemo(() => {
    const inMonth = (d: string) => dayjs(d).format("YYYY-MM") === donem;
    let gelir = 0;
    let gider = 0;
    filteredTransactions.filter((t) => inMonth(t.tarih)).forEach((t) => {
      if (t.tur === "gelir") gelir += Number(t.tutar);
      else gider += Number(t.tutar);
    });
    return { gelir, gider, net: gelir - gider };
  }, [filteredTransactions, donem]);

  const monthlyLine = useMemo(() => {
    const map = new Map<string, { gelir: number; gider: number }>();
    filteredTransactions.forEach((t) => {
      const key = dayjs(t.tarih).format("YYYY-MM");
      const cur = map.get(key) ?? { gelir: 0, gider: 0 };
      if (t.tur === "gelir") cur.gelir += Number(t.tutar);
      else cur.gider += Number(t.tutar);
      map.set(key, cur);
    });
    const keys = Array.from(map.keys()).sort();
    return {
      labels: keys,
      datasets: [
        { label: "Gelir", data: keys.map((k) => map.get(k)!.gelir), borderColor: "#D4AF37" },
        { label: "Gider", data: keys.map((k) => map.get(k)!.gider), borderColor: "#EF4444" }
      ]
    };
  }, [filteredTransactions]);

  const expenseBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filteredTransactions
      .filter((t) => dayjs(t.tarih).format("YYYY-MM") === donem && t.tur === "gider")
      .forEach((t) => m.set(t.kategori, (m.get(t.kategori) ?? 0) + Number(t.tutar)));
    const labels = Array.from(m.keys());
    return {
      labels,
      datasets: [
        { label: "Gider", data: labels.map((l) => m.get(l)!), backgroundColor: "rgba(239,68,68,.35)" }
      ]
    };
  }, [filteredTransactions, donem]);

  function durumHesapla(toplam: number, odenen: number, son: string) {
    if (odenen >= toplam) return "ödendi";
    if (odenen > 0 && odenen < toplam) return "kısmi";
    if (dayjs(son).isBefore(dayjs(), "day")) return "gecikmiş";
    return "ödenmedi";
  }

  async function yenile() {
    // Yenileme işlemi: sayfa reload yerine basit bir refresh (server'dan yeni initial data gelmesi için)
    // Not: MVP - kullanıcı akışını bozmadan hızlı çözüm
    window.location.reload();
  }

  async function openStudent(studentId: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalStudent(null);
    setModalPayments([]);
    setModalTx([]);
    try {
      const r = await fetch("/api/finance/student/detail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Detay alınamadı.");
      setModalStudent(j.student);
      setModalPayments(j.payments ?? []);
      setModalTx(j.transactions ?? []);
    } catch (e: any) {
      setHata(e?.message ?? "Detay alınamadı.");
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  }

  async function txEkle(e: React.FormEvent) {
    e.preventDefault();
    setBilgi(null);
    setHata(null);
    try {
      const r = await fetch("/api/finance/ledger/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tur: txTur,
          kategori,
          tutar,
          tarih,
          aciklama: aciklama || null,
          student_id: txStudentId || null
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Kayıt eklenemedi.");
      setBilgi("Kayıt eklendi.");
      setTutar(0);
      setAciklama("");
      await yenile();
    } catch (e: any) {
      setHata(e?.message ?? "Kayıt eklenemedi.");
    }
  }

  async function odemeEkle(e: React.FormEvent) {
    e.preventDefault();
    setBilgi(null);
    setHata(null);
    try {
      const r = await fetch("/api/finance/student-payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          student_id: ogrenciId,
          donem,
          gelir_kategorisi: gelirKategorisi,
          tutar_toplam: tutarToplam,
          tutar_odenen: tutarOdenen,
          son_odeme_tarihi: sonOdeme
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Ödeme kaydı eklenemedi.");
      setBilgi("Ödeme kaydı eklendi.");
      setTutarToplam(0);
      setTutarOdenen(0);
      await yenile();
    } catch (e: any) {
      setHata(e?.message ?? "Ödeme kaydı eklenemedi.");
    }
  }

  async function tahsilatGuncelle(id: string, toplam: number, son: string, yeniOdenen: number) {
    setBilgi(null);
    setHata(null);
    try {
      const r = await fetch("/api/finance/student-payments/update-collection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, tutar_odenen: yeniOdenen })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.hata ?? "Tahsilat güncellenemedi.");
      setBilgi("Tahsilat güncellendi.");
      await yenile();
    } catch (e: any) {
      setHata(e?.message ?? "Tahsilat güncellenemedi.");
    }
  }

  return (
    <div className="space-y-6">
      <StudentFinanceModalClient
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={modalLoading}
        student={modalStudent}
        payments={modalPayments}
        transactions={modalTx}
      />

      <div className="grid md:grid-cols-3 gap-3">
        <motion.div
          className="card card-neon p-4"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="text-sm text-[color:var(--muted)]">Dönem</div>
          <input className="input mt-1" value={donem} onChange={(e) => setDonem(e.target.value)} />
        </motion.div>

        <motion.div
          className="card card-neon p-4"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.03, ease: "easeOut" }}
        >
          <div className="text-sm text-[color:var(--muted)]">Öğrenci Filtresi</div>
          <select className="input mt-1" value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)}>
            <option value="">Tümü</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad_soyad}
              </option>
            ))}
          </select>
          <div className="text-xs text-[color:var(--muted)] mt-1">Özet/grafikler/defter listesi bu filtreye göre güncellenir.</div>
        </motion.div>

        <motion.div
          className="card card-neon p-4"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
        >
          <div className="text-sm text-[color:var(--muted)]">Gelir</div>
          <motion.div
            className="text-2xl font-semibold tabular-nums"
            initial={reduceMotion ? undefined : { scale: 0.98, opacity: 0.85 }}
            animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {ozet.gelir.toLocaleString("tr-TR")} ₺
          </motion.div>
        </motion.div>
        <motion.div
          className="card card-neon p-4"
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
        >
          <div className="text-sm text-[color:var(--muted)]">Net Kâr</div>
          <motion.div
            className="text-2xl font-semibold tabular-nums"
            initial={reduceMotion ? undefined : { scale: 0.98, opacity: 0.85 }}
            animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {ozet.net.toLocaleString("tr-TR")} ₺
          </motion.div>
        </motion.div>
      </div>

      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-semibold">Öğrenciler</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">İsme tıkla → sadece finans detay popup</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input h-9 py-1" placeholder="Öğrenci ara..." value={studentQ} onChange={(e) => setStudentQ(e.target.value)} />
            <button className="btn-ghost" type="button" onClick={() => setStudentQ("")}>
              Temizle
            </button>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredStudents.slice(0, 60).map((s) => (
            <button
              key={s.id}
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 transition"
              onClick={() => {
                setFilterStudentId(s.id);
                openStudent(s.id);
              }}
            >
              <div className="font-semibold">{s.ad_soyad}</div>
              <div className="text-xs text-[color:var(--muted)]">Detayı aç • Filtrele</div>
            </button>
          ))}
          {filteredStudents.length === 0 && <div className="text-[color:var(--muted)]">Öğrenci bulunamadı.</div>}
        </div>

        {filteredStudents.length > 60 && (
          <div className="text-xs text-[color:var(--muted)] mt-3">
            Performans için ilk 60 sonuç gösteriliyor. Aramayı daralt.
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Aylık Gelir/Gider</div>
          <Line
            data={monthlyLine}
            options={{
              responsive: true,
              animation: reduceMotion ? false : { duration: 900, easing: "easeOutQuart" as any },
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.65)" } },
                y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.65)" } }
              }
            }}
          />
        </div>
        <div className="card card-neon p-6">
          <div className="font-semibold mb-3">Gider Dağılımı ({donem})</div>
          <Bar
            data={expenseBreakdown}
            options={{
              responsive: true,
              animation: reduceMotion ? false : { duration: 850, easing: "easeOutQuart" as any },
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.65)" } },
                y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "rgba(255,255,255,0.65)" } }
              }
            }}
          />
        </div>
      </div>

      <div className="card card-neon p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-semibold">Kalem Detayı ({donem})</div>
            <div className="text-sm text-[color:var(--muted)] mt-1">Gelir/Gider kategorilerini detaylı gör</div>
          </div>
          {monthCategoryAgg.giderCount === 0 && (
            <div className="text-sm rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2">
              Bu dönemde <b>gider</b> kaydı yok. Eksikse gider ekleyebilirsin.
            </div>
          )}
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-[color:var(--muted)]">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Kategori</th>
                <th className="text-right py-2 pr-3">Gelir</th>
                <th className="text-right py-2 pr-3">Gider</th>
                <th className="text-right py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {monthCategoryAgg.rows.map((r) => (
                <tr key={r.kategori} className="border-t border-white/10">
                  <td className="py-2 pr-3">{r.kategori}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.gelir.toLocaleString("tr-TR")} ₺</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.gider.toLocaleString("tr-TR")} ₺</td>
                  <td className="py-2 text-right tabular-nums">{r.net.toLocaleString("tr-TR")} ₺</td>
                </tr>
              ))}
              {monthCategoryAgg.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[color:var(--muted)]">
                    Bu dönemde kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <form className="card card-neon p-6 space-y-3" onSubmit={txEkle}>
          <div className="font-semibold">Defter Kaydı (Gelir/Gider)</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-[color:var(--muted)]">İşlem Öğrencisi (opsiyonel)</label>
              <select
                className="input mt-1"
                value={txStudentId}
                onChange={(e) => setTxStudentId(e.target.value)}
              >
                <option value="">Genel (öğrenci yok)</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad_soyad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Tür</label>
              <select className="input mt-1" value={txTur} onChange={(e) => setTxTur(e.target.value as any)}>
                <option value="gelir">Gelir</option>
                <option value="gider">Gider</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Kategori</label>
              <input className="input mt-1" value={kategori} onChange={(e) => setKategori(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Tutar</label>
              <input className="input mt-1" type="number" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Tarih</label>
              <input className="input mt-1" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[color:var(--muted)]">Açıklama</label>
              <input className="input mt-1" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" type="submit">
            Kaydet
          </button>
        </form>

        <form className="card card-neon p-6 space-y-3" onSubmit={odemeEkle}>
          <div className="font-semibold">Öğrenci Ödeme Takibi</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[color:var(--muted)]">Öğrenci</label>
              <select className="input mt-1" value={ogrenciId} onChange={(e) => setOgrenciId(e.target.value)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad_soyad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Dönem</label>
              <input className="input mt-1" value={donem} onChange={(e) => setDonem(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[color:var(--muted)]">Gelir kategorisi</label>
              <input className="input mt-1" value={gelirKategorisi} onChange={(e) => setGelirKategorisi(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Toplam tutar</label>
              <input className="input mt-1" type="number" value={tutarToplam} onChange={(e) => setTutarToplam(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-[color:var(--muted)]">Ödenen</label>
              <input className="input mt-1" type="number" value={tutarOdenen} onChange={(e) => setTutarOdenen(Number(e.target.value))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[color:var(--muted)]">Son ödeme tarihi</label>
              <input className="input mt-1" type="date" value={sonOdeme} onChange={(e) => setSonOdeme(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" type="submit">
            Kaydet
          </button>
        </form>
      </div>

      {bilgi && <div className="text-sm text-[color:var(--success)]">{bilgi}</div>}
      {hata && <div className="text-sm text-[color:var(--danger)]">{hata}</div>}

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Defter Kayıtları (Son 50)</div>
        {filteredTransactions.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt yok.</div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.slice(0, 50).map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {t.tur} • {t.kategori} • {Number(t.tutar).toLocaleString("tr-TR")} ₺
                    </div>
                    <div className="text-sm text-[color:var(--muted)] mt-1">
                      {t.tarih}
                      {t.student_id ? ` • Öğrenci: ${studentNameMap.get(t.student_id) ?? t.student_id}` : ""}
                      {t.aciklama ? ` • ${t.aciklama}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={async () => {
                        try {
                          await duzenleDefterKaydi(t);
                          await yenile();
                        } catch (e: any) {
                          setHata(e?.message ?? "Güncellenemedi.");
                        }
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      className="btn-ghost"
                      type="button"
                      onClick={async () => {
                        try {
                          await iptalDefterKaydi(t.id);
                          await yenile();
                        } catch (e: any) {
                          setHata(e?.message ?? "İptal edilemedi.");
                        }
                      }}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card card-neon p-6">
        <div className="font-semibold mb-3">Ödeme Durumları</div>
        {payments.length === 0 ? (
          <div className="text-[color:var(--muted)]">Kayıt yok.</div>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 100).map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="font-semibold">
                  {p.gelir_kategorisi} • {p.donem} • {Number(p.tutar_toplam).toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-sm text-[color:var(--muted)] mt-1">
                  Durum: {p.durum} • Ödenen: {Number(p.tutar_odenen).toLocaleString("tr-TR")} ₺ • Son tarih: {p.son_odeme_tarihi}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-[color:var(--muted)]">Tahsilat güncelle:</span>
                  <input
                    className="input w-32"
                    type="number"
                    defaultValue={Number(p.tutar_odenen)}
                    onBlur={(e) =>
                      tahsilatGuncelle(p.id, Number(p.tutar_toplam), p.son_odeme_tarihi, Number(e.target.value))
                    }
                  />
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={async () => {
                      try {
                        await duzenleBorcKaydi(p);
                        await yenile();
                      } catch (e: any) {
                        setHata(e?.message ?? "Güncellenemedi.");
                      }
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={async () => {
                      try {
                        await iptalBorcKaydi(p.id);
                        await yenile();
                      } catch (e: any) {
                        setHata(e?.message ?? "İptal edilemedi.");
                      }
                    }}
                  >
                    İptal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
