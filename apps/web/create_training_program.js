const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(envPath) {
  const txt = fs.readFileSync(envPath, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx < 0) continue;
    const k = t.slice(0, idx).trim();
    let v = t.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  loadEnv(path.join(__dirname, ".env.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Supabase env eksik (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");

  const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // En az 1 öğrencisi olan koçu seç
  const { data: studentsAll, error: se } = await sb
    .from("students")
    .select("id, ad_soyad, coach_id")
    .not("coach_id", "is", null)
    .limit(5000);
  if (se) throw se;
  if (!studentsAll || studentsAll.length === 0) throw new Error("Sistemde antrenöre bağlı öğrenci bulunamadı.");

  const coachId = studentsAll[0].coach_id;
  const students = studentsAll.filter((s) => s.coach_id === coachId).slice(0, 12);

  const { data: coachProfile } = await sb
    .from("profiles")
    .select("id, ad_soyad, rol")
    .eq("id", coachId)
    .maybeSingle();

  // Yarın 18:00
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tarih = fmtDate(tomorrow);
  const baslik = "Haftalık Program - Dayanıklılık";

  const { data: oturum, error: ie } = await sb
    .from("training_sessions")
    .insert({ coach_id: coachId, baslik, tarih, saat: "18:00", konum: "Saha 1" })
    .select("id")
    .single();
  if (ie) throw ie;

  const rows = students.map((s) => ({ training_session_id: oturum.id, student_id: s.id }));
  const { error: ae } = await sb.from("training_session_students").insert(rows);
  if (ae) throw ae;

  console.log(
    JSON.stringify(
      {
        ok: true,
        training_session_id: oturum.id,
        coach: coachProfile?.ad_soyad ?? coachId,
        date: tarih,
        time: "18:00",
        location: "Saha 1",
        assigned_students: students.length,
        sample_students: students.slice(0, 5).map((s) => s.ad_soyad)
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("HATA:", e?.message ?? e);
  process.exit(1);
});

