"use client";

export async function iptalDefterKaydi(id: string) {
  const neden = prompt("İptal nedeni (opsiyonel):") ?? null;
  const r = await fetch("/api/finance/ledger/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, neden })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.hata ?? "İptal edilemedi.");
}

export async function duzenleDefterKaydi(row: any) {
  const tur = (prompt("Tür (gelir/gider):", row.tur) ?? row.tur) as "gelir" | "gider";
  const kategori = prompt("Kategori:", row.kategori) ?? row.kategori;
  const tutar = Number(prompt("Tutar:", String(row.tutar)) ?? row.tutar);
  const tarih = prompt("Tarih (YYYY-MM-DD):", row.tarih) ?? row.tarih;
  const aciklama = prompt("Açıklama (opsiyonel):", row.aciklama ?? "") ?? row.aciklama;
  const student_id_raw = prompt("Öğrenci ID (boş bırak = genel):", row.student_id ?? "") ?? (row.student_id ?? "");
  const student_id = student_id_raw.trim() ? student_id_raw.trim() : null;

  const r = await fetch("/api/finance/ledger/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: row.id, tur, kategori, tutar, tarih, aciklama: aciklama || null, student_id })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.hata ?? "Güncellenemedi.");
}

export async function iptalBorcKaydi(id: string) {
  const neden = prompt("İptal nedeni (opsiyonel):") ?? null;
  const r = await fetch("/api/finance/student-payments/cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, neden })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.hata ?? "İptal edilemedi.");
}

export async function duzenleBorcKaydi(row: any) {
  const donem = prompt("Dönem (YYYY-MM):", row.donem) ?? row.donem;
  const gelir_kategorisi = prompt("Gelir kategorisi:", row.gelir_kategorisi) ?? row.gelir_kategorisi;
  const tutar_toplam = Number(prompt("Tutar toplam:", String(row.tutar_toplam)) ?? row.tutar_toplam);
  const tutar_odenen = Number(prompt("Tutar ödenen:", String(row.tutar_odenen ?? 0)) ?? row.tutar_odenen);
  const son_odeme_tarihi = prompt("Son ödeme tarihi (YYYY-MM-DD):", row.son_odeme_tarihi) ?? row.son_odeme_tarihi;

  const r = await fetch("/api/finance/student-payments/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: row.id, donem, gelir_kategorisi, tutar_toplam, tutar_odenen, son_odeme_tarihi })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.hata ?? "Güncellenemedi.");
}
