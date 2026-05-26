// Supabase Edge Function: Analyze quiz performance using Gemini API
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — same pattern as pdf-quiz-generator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing Authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError(401, "Unauthorized");
    }

    if (!GEMINI_API_KEY) {
      return jsonError(500, "GEMINI_API_KEY is not configured");
    }

    // Parse JSON body
    const body = await req.json();
    const current = body?.current;
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!current) {
      return jsonError(400, "Missing current quiz result");
    }

    const questionsData = Array.isArray(current.questions_data)
      ? current.questions_data
      : [];

    interface QuestionRecord { text?: string; is_correct?: boolean; was_skipped?: boolean; }
    interface HistoryRecord { deck_name?: string; category?: string; score?: number; completed_at?: string; }

    // Build prompt
    const wrongList = (questionsData as QuestionRecord[])
      .filter((q) => !q.is_correct && !q.was_skipped)
      .map((q) => `- ${q.text}`)
      .join("\n");

    const skippedList = (questionsData as QuestionRecord[])
      .filter((q) => q.was_skipped)
      .map((q) => `- ${q.text}`)
      .join("\n");

    const historySection =
      history.length === 0
        ? "This is the student's first quiz attempt."
        : `Previous results (most recent first):\n${(history as HistoryRecord[])
            .map(
              (h, i) =>
                `${i + 1}. "${h.deck_name}" (${h.category}) — ${Number(h.score).toFixed(1)}% on ${new Date(h.completed_at ?? "").toLocaleDateString()}`
            )
            .join("\n")}`;

    const SPM_SEJARAH_SYLLABUS = `
SILIBUS SEJARAH SPM (KSSM)

=== TINGKATAN 4 ===

Bab 1: Kemunculan Tamadun Awal Manusia
- 1.1 Pengertian tamadun: definisi, ciri-ciri asas tamadun (bandar, pertanian, tulisan, undang-undang, agama)
- 1.2 Faktor kemunculan tamadun: pertanian menetap, kawasan lembah sungai, sistem pengairan, kepimpinan, kepercayaan
- 1.3 Perkembangan manusia prasejarah: Zaman Paleolitik, Mesolitik, Neolitik, Zaman Logam
- 1.4 Sumbangan tamadun awal: sistem tulisan, undang-undang bertulis, teknologi pertanian, seni bina

Bab 2: Tamadun Mesopotamia
- 2.1 Latar belakang geografi: Lembah Tigris-Euphrates, Tanah Bulan Sabit Subur
- 2.2 Sistem pemerintahan: negara kota (city-state), raja sebagai wakil tuhan
- 2.3 Pencapaian ekonomi: pertanian dengan sistem pengairan, perdagangan, sistem barter
- 2.4 Sistem tulisan cuneiform: fungsi, bahan (tanah liat), perkembangan
- 2.5 Undang-undang Kod Hammurabi: kandungan, kepentingan, konsep "mata ganti mata"
- 2.6 Kepercayaan dan agama: politeisme, ziggurat, pendeta
- 2.7 Sumbangan tamadun Mesopotamia kepada dunia

Bab 3: Tamadun Mesir Purba
- 3.1 Peranan Sungai Nil: banjir tahunan, kesuburan tanah, pertanian, pengangkutan
- 3.2 Sistem pemerintahan Firaun: Firaun sebagai raja-tuhan, hierarki sosial (Firaun, bangsawan, pendeta, petani, hamba)
- 3.3 Sistem tulisan hieroglif: simbol gambar, batu Rosetta, penggunaan papirus
- 3.4 Seni bina: piramid (Giza), Sphinx, kuil (Karnak, Luxor), teknik pembinaan
- 3.5 Pencapaian sains: perubatan (pembedahan, mumifikasi), astronomi (kalendar 365 hari), matematik
- 3.6 Kepercayaan dan agama: politeisme, dewa-dewa utama (Ra, Osiris, Isis, Horus), kehidupan selepas mati, Book of the Dead

Bab 4: Tamadun India
- 4.1 Tamadun Indus: lokasi (Mohenjo-daro, Harappa), perancangan bandar sistematik, sistem perparitan
- 4.2 Kedatangan bangsa Arya dan sistem Veda
- 4.3 Sistem kasta: Brahmin, Kshatriya, Vaishya, Shudra, dan tak berkasta
- 4.4 Agama Hindu: konsep dharma, karma, samsara, moksha; kitab Veda, Upanishad
- 4.5 Agama Buddha: ajaran Siddhartha Gautama, Empat Kebenaran Mulia, Jalan Lapan Lapis
- 4.6 Pencapaian ilmu: sistem nombor Hindu-Arab (sifar), astronomi, perubatan Ayurveda, algebra
- 4.7 Pengaruh tamadun India ke Asia Tenggara: agama, seni bina (candi), bahasa Sanskrit, sistem pemerintahan

Bab 5: Tamadun China
- 5.1 Latar belakang geografi: Lembah Huang He dan Yangtze, tembok besar sebagai pertahanan
- 5.2 Sistem pemerintahan dinasti: Dinasti Shang, Zhou, Qin, Han; konsep "Mandat Syurga"
- 5.3 Pencapaian teknologi: kertas (Cai Lun), percetakan blok kayu, kompas, ubat bedil, sutera, tembikar porselin
- 5.4 Jalan Sutera: laluan perdagangan, barangan yang diperdagangkan, kepentingan
- 5.5 Falsafah Confucius (Kongfuzi): konsep ren (belas ihsan), li (budi pekerti), kesetiaan kepada pemerintah dan keluarga
- 5.6 Taoisme (Laozi): konsep Tao, keharmonian dengan alam
- 5.7 Penyebaran Buddhisme ke China
- 5.8 Sistem tulisan dan birokrasi: peperiksaan awam (imperial examination)

Bab 6: Tamadun Awal Asia Tenggara
- 6.1 Kerajaan Funan (abad ke-1 hingga ke-7): lokasi (Kemboja/Vietnam), perdagangan, pengaruh India
- 6.2 Kerajaan Champa (abad ke-2 hingga ke-17): Vietnam Tengah, agama Hindu, seni bina Cham
- 6.3 Kerajaan Khmer (abad ke-9 hingga ke-15): Angkor Wat, Angkor Thom, sistem pengairan, Jayavarman VII
- 6.4 Kerajaan Srivijaya (abad ke-7 hingga ke-13): pusat perdagangan Selat Melaka, penyebaran Buddha Mahayana, Palembang
- 6.5 Kerajaan Majapahit (abad ke-13 hingga ke-15): Jawa Timur, Gajah Mada, Sumpah Palapa, Hayam Wuruk
- 6.6 Pengaruh India: agama Hindu-Buddha, bahasa Sanskrit, sistem pemerintahan dewaraja, seni bina candi
- 6.7 Pengaruh China: perdagangan, hubungan diplomatik, komuniti pedagang Cina

Bab 7: Kerajaan Alam Melayu
- 7.1 Kerajaan Melayu awal: Kedah Tua (Lembah Bujang), Gangga Negara (Perak), Chi Tu
- 7.2 Kerajaan bercorak Hindu-Buddha: sistem dewaraja, istana, candi
- 7.3 Sistem pemerintahan: raja, pembesar (menteri, hulubalang), rakyat; konsep daulat dan derhaka
- 7.4 Sistem sosial: golongan raja dan bangsawan, rakyat merdeka, hamba
- 7.5 Ekonomi: pertanian (padi), perdagangan (emas, timah, rempah), pelabuhan entreport
- 7.6 Hubungan luar: dengan India, China, Arab; sistem ufti

Bab 8: Kesultanan Melayu Melaka
- 8.1 Penubuhan Melaka: Parameswara, pengasasan sekitar 1400 M, pemilihan lokasi strategik
- 8.2 Faktor kemajuan Melaka: lokasi di Selat Melaka, angin monsun, dasar pelabuhan terbuka, perlindungan Siam dan China (Laksamana Zheng He)
- 8.3 Pengislaman Melaka: Parameswara memeluk Islam, peranan pedagang Arab dan India (Gujarat), nama diubah kepada Megat Iskandar Shah
- 8.4 Sistem pentadbiran: Sultan (pemegang kuasa tertinggi), Bendahara (perdana menteri), Temenggung (keselamatan), Laksamana (tentera laut), Syahbandar (pelabuhan)
- 8.5 Peranan sebagai pusat perdagangan: barangan (rempah, emas, kain, porselin), pedagang dari pelbagai negara
- 8.6 Penyebaran Islam: peranan ulama, masjid, madrasah, penggunaan tulisan Jawi
- 8.7 Undang-Undang Melaka: Hukum Kanun Melaka (undang-undang darat), Undang-Undang Laut Melaka
- 8.8 Bahasa Melayu sebagai lingua franca perdagangan dan diplomatik
- 8.9 Kejatuhan Melaka kepada Portugis (1511): sebab (perpecahan dalaman, kekuatan tentera Portugis, Alfonso de Albuquerque), kesan

Bab 9: Perkembangan Islam di Malaysia
- 9.1 Kedatangan Islam ke Asia Tenggara: abad ke-7 (pedagang Arab), abad ke-13 (meluas), abad ke-15 (kukuh di Melaka)
- 9.2 Faktor penyebaran Islam: perdagangan, perkahwinan, peranan ulama dan mubaligh, sifat Islam yang mudah diterima
- 9.3 Pengaruh Islam dalam pemerintahan: gelaran Sultan, konsep khalifah, undang-undang Islam (hudud, qisas, takzir)
- 9.4 Pengaruh Islam dalam sosiobudaya: adat resam, pakaian, makanan halal, seni khat, seni bina masjid
- 9.5 Pengaruh Islam dalam bahasa dan sastera: tulisan Jawi, istilah Arab-Melayu, hikayat berunsur Islam
- 9.6 Institusi Islam: masjid (pusat ibadat dan pendidikan), madrasah (sekolah agama), ulama (pemimpin agama)

=== TINGKATAN 5 ===

Bab 1: Nasionalisme di Asia, Afrika dan Amerika Latin
- 1.1 Konsep nasionalisme: definisi, faktor-faktor yang mendorong (penjajahan, penindasan ekonomi, kesedaran identiti)
- 1.2 Nasionalisme di India: Indian National Congress (1885), Bal Gangadhar Tilak, Mahatma Gandhi (gerakan Non-Cooperation, Civil Disobedience, Quit India), Muhammad Ali Jinnah
- 1.3 Nasionalisme di China: Sun Yat-sen, Tiga Prinsip Rakyat (nasionalisme, demokrasi, kebajikan rakyat), Revolusi 1911, Republik China
- 1.4 Nasionalisme di Filipina: Jose Rizal, Andres Bonifacio, Katipunan, kemerdekaan 1946
- 1.5 Nasionalisme di Vietnam: Ho Chi Minh, Viet Minh, penentangan Perancis
- 1.6 Nasionalisme di Indonesia: Budi Utomo (1908), Sarekat Islam, Sukarno, Parti Nasional Indonesia, kemerdekaan 1945
- 1.7 Nasionalisme di Afrika: Pan-Afrikanisme, Kwame Nkrumah (Ghana), kemerdekaan negara-negara Afrika
- 1.8 Nasionalisme di Amerika Latin: Simon Bolivar, Jose de San Martin, kemerdekaan negara-negara Amerika Latin
- 1.9 Faktor umum nasionalisme: imperialisme Barat, Perang Dunia, pengaruh idea liberalisme dan demokrasi

Bab 2: Nasionalisme di Malaysia Sehingga Perang Dunia Kedua
- 2.1 Latar belakang penjajahan British: Perjanjian Pangkor (1874), Residen British, Federated dan Unfederated Malay States
- 2.2 Kesan penjajahan: ekonomi dualistik, penghijrahan buruh (Cina, India), perubahan sosial dan budaya
- 2.3 Kesedaran awal nasionalisme Melayu: kebangkitan agama Islam, pengaruh Mesir (Al-Imam 1906), golongan ulama
- 2.4 Golongan intelektual Melayu: Kaum Muda vs Kaum Tua, perbahasan agama dan pemodenan
- 2.5 Persatuan dan pertubuhan Melayu awal: KMM (Kesatuan Melayu Muda, 1938) — Ibrahim Yaakob, KRIS
- 2.6 Kesatuan Melayu Singapura (1926): Mohd Eunos Abdullah, tuntutan hak orang Melayu
- 2.7 Akhbar dan majalah Melayu: Al-Imam, Utusan Melayu, Warta Malaya — alat menyebarkan semangat kebangsaan
- 2.8 Isu-isu utama: hak ke atas tanah, ekonomi orang Melayu, pendidikan vernakular vs kebangsaan

Bab 3: Perang Dunia Kedua dan Kesannya di Malaysia
- 3.1 Sebab-sebab Perang Dunia Kedua: Perjanjian Versailles yang tidak adil, kebangkitan fasisme (Hitler, Mussolini), militarisme Jepun, dasar tunduk-periksa (appeasement)
- 3.2 Perang di Asia Pasifik: serangan Pearl Harbor (1941), kemaraan Jepun di Asia Tenggara
- 3.3 Penaklukan Jepun di Tanah Melayu: pendaratan Kota Bharu (8 Dis 1941), kejatuhan Singapura (15 Feb 1942), kekalahan British
- 3.4 Pentadbiran Jepun: nama diubah kepada Syonan-to (Singapura), sistem Gunsei (pentadbiran tentera), penggunaan bahasa Jepun, mata wang pisang
- 3.5 Layanan Jepun kepada penduduk: kekejaman (kempeitai), kerja paksa (Jalan Kereta Api Burma-Siam), kebuluran
- 3.6 Penentangan terhadap Jepun: MPAJA (Malayan People's Anti-Japanese Army) — komunis Cina; Force 136 — British dan tempatan; penentangan orang Melayu (PETA)
- 3.7 Kesan Perang Dunia Kedua: ekonomi musnah, trauma sosial, kebangkitan semangat kebangsaan, melemahkan British, pengaruh komunisme meningkat
- 3.8 Penyerahan Jepun (Ogos 1945): bom atom Hiroshima dan Nagasaki, era pendudukan tamat

Bab 4: Semangat Kebangsaan dan Kemerdekaan
- 4.1 Malayan Union (1946): cadangan British — kerakyatan sama rata, kuasa raja-raja Melayu dihapuskan, bantahan orang Melayu, penubuhan UMNO (Dato' Onn Jaafar, 11 Mei 1946)
- 4.2 Pembentukan Persekutuan Tanah Melayu 1948: kuasa raja-raja dipulihkan, kerakyatan berdasarkan prinsip jus soli terhad
- 4.3 Darurat 1948-1960: Parti Komunis Malaya (PKM), rampasan kuasa, pembunuhan, Rancangan Briggs (kampung baru), operasi anti-komunis
- 4.4 Parti-parti politik: UMNO (Melayu), MCA (Cina), MIC (India) — pembentukan Perikatan 1954
- 4.5 Pilihanraya Persekutuan 1955: Perikatan menang besar (51/52 kerusi), Tunku Abdul Rahman — Ketua Menteri
- 4.6 Perjuangan kemerdekaan: rundingan London (1956), Perlembagaan Persekutuan digubal
- 4.7 Kemerdekaan 31 Ogos 1957: pengisytiharan di Padang Kelab Selangor (kini Dataran Merdeka), Tunku Abdul Rahman — Perdana Menteri pertama
- 4.8 Pembentukan Malaysia 16 September 1963: Tanah Melayu + Singapura + Sabah + Sarawak; Cobbold Commission; tentangan Indonesia (Konfrontasi)
- 4.9 Pemisahan Singapura 9 Ogos 1965: perselisihan kaum dan politik (Malaysian Malaysia vs ketuanan Melayu), Lee Kuan Yew

Bab 5: Pembinaan Negara dan Bangsa Malaysia
- 5.1 Cabaran awal: peristiwa 13 Mei 1969 (rusuhan kaum), Majlis Gerakan Negara (MAGERAN), penggantungan Parlimen
- 5.2 Rukun Negara (1970): lima prinsip — Kepercayaan kepada Tuhan, Kesetiaan kepada Raja dan Negara, Keluhuran Perlembagaan, Kedaulatan Undang-undang, Kesopanan dan Kesusilaan
- 5.3 Dasar Ekonomi Baru (DEB) 1971-1990: dua objektif — membasmi kemiskinan, menyusun semula masyarakat; sasaran 30% ekuiti Bumiputera
- 5.4 Dasar Pendidikan Kebangsaan: Laporan Razak (1956), Akta Pendidikan 1961, bahasa Melayu sebagai bahasa pengantar
- 5.5 Perlembagaan Malaysia: Perkara 153 (hak istimewa Bumiputera), Perkara 152 (bahasa kebangsaan), Perkara 181 (kedaulatan raja-raja)
- 5.6 Perpaduan kaum: Jawatankuasa Hubungan Antara Kaum (JBK), Dasar Kebudayaan Kebangsaan, Sukan sebagai alat perpaduan
- 5.7 Wawasan 2020 (1991): diumumkan oleh Tun Dr Mahathir, sembilan cabaran, matlamat negara maju

Bab 6: Kemajuan dan Kesejahteraan Negara
- 6.1 Dasar Pembangunan Nasional (DPN) 1991-2000: kesinambungan DEB, penekanan pertumbuhan ekonomi seimbang
- 6.2 Dasar Wawasan Negara (DWN) 2001-2010: pembangunan modal insan, K-ekonomi
- 6.3 Perindustrian: Dasar Perindustrian Negara, zon perindustrian bebas, pelaburan asing (Intel, Motorola), Proton (1985)
- 6.4 Pertanian moden: FELDA (peneroka, kelapa sawit, getah), FELCRA, RISDA, pertanian komersial
- 6.5 Kemajuan infrastruktur: Lebuh Raya Utara-Selatan, KLCC, Putrajaya, Lapangan Terbang KLIA, Koridor Raya Multimedia (MSC)
- 6.6 Teknologi dan pendidikan: Universiti Malaya, UTM, UPM, MARA, program biasiswa, Sekolah Bestari
- 6.7 Peningkatan kualiti hidup: perumahan awam, sistem kesihatan, pendapatan per kapita meningkat

Bab 7: Malaysia dan Kerjasama Antarabangsa
- 7.1 ASEAN (1967): pengasas (Malaysia, Indonesia, Filipina, Singapura, Thailand), Deklarasi Bangkok, matlamat kerjasama ekonomi dan keselamatan
- 7.2 Peranan Malaysia dalam ASEAN: AFTA (kawasan perdagangan bebas), ASEAN Community, penyelesaian konflik serantau
- 7.3 Pertubuhan Bangsa-Bangsa Bersatu (PBB): Malaysia anggota 1957, sumbangan dalam misi pengaman (Congo, Namibia, Bosnia, Lubnan)
- 7.4 Dasar luar Malaysia: berkecuali aktif, tidak berpihak, mengutamakan ASEAN, hubungan dengan negara membangun
- 7.5 Gerakan Negara-Negara Berkecuali (NAM): diasaskan 1961, Malaysia anggota aktif, tuan rumah KTT 2003
- 7.6 Pertubuhan Kerjasama Islam (OIC): Malaysia anggota aktif, kerjasama ekonomi dan politik negara Islam
- 7.7 Komanwel: Malaysia kekal selepas merdeka, Sukan Komanwel, kerjasama pendidikan dan ekonomi
- 7.8 Hubungan diplomatik: dengan negara-negara jiran, kuasa besar (AS, China, UK), negara Timur Tengah
`;

    const categoryLower = (current.category ?? "").toLowerCase();
    const isSejarah = categoryLower.includes("sejarah") && categoryLower.includes("spm");

    const prompt = isSejarah
      ? `You are an expert educational AI tutor specialising in SPM Sejarah. Analyze this student's quiz performance and return ONLY a valid JSON object (no markdown, no code fences). Write ALL text fields in Bahasa Malaysia.

Use the SPM Sejarah syllabus below to identify the exact BAB (chapter) and SUBTOPIK the student is weak or strong in, based on the questions they got wrong or skipped. Be specific — name the bab number and subtopik title from the syllabus.

${SPM_SEJARAH_SYLLABUS}

---

Current quiz: "${current.deck_name}" (${current.category})
Score: ${Number(current.score).toFixed(1)}% — ${current.correct_count} betul, ${current.wrong_count} salah, ${current.skipped_count} dilangkau daripada ${current.total_count}

${wrongList ? `Soalan yang dijawab salah:\n${wrongList}` : "Semua soalan dijawab dengan betul!"}
${skippedList ? `\nSoalan yang dilangkau:\n${skippedList}` : ""}

${historySection}

Return this JSON structure only (all values in Bahasa Malaysia):
{"overall_trend":"improving atau declining atau stable atau first_attempt","performance_summary":"1-2 ayat ringkasan prestasi","weak_areas":["Bab X: Nama Bab — Subtopik"],"strong_areas":["Bab X: Nama Bab — Subtopik"],"improvement_tips":["tip1","tip2","tip3"],"comparison_note":"1 ayat perbandingan dengan percubaan lepas"}`
      : `You are an expert educational AI tutor. Analyze this student's quiz performance and return ONLY a valid JSON object (no markdown, no code fences). Write ALL text fields in Bahasa Malaysia.

Identify what topics or concepts the student is weak or strong in based on the actual question content below. Do NOT assume a specific subject — base your analysis solely on the questions and answers provided.

Current quiz: "${current.deck_name}" (${current.category})
Score: ${Number(current.score).toFixed(1)}% — ${current.correct_count} betul, ${current.wrong_count} salah, ${current.skipped_count} dilangkau daripada ${current.total_count}

${wrongList ? `Soalan yang dijawab salah:\n${wrongList}` : "Semua soalan dijawab dengan betul!"}
${skippedList ? `\nSoalan yang dilangkau:\n${skippedList}` : ""}

${historySection}

Return this JSON structure only (all values in Bahasa Malaysia):
{"overall_trend":"improving atau declining atau stable atau first_attempt","performance_summary":"1-2 ayat ringkasan prestasi berdasarkan soalan-soalan ini","weak_areas":["Topik atau konsep yang perlu diperbaiki berdasarkan soalan yang salah"],"strong_areas":["Topik atau konsep yang dikuasai berdasarkan soalan yang betul"],"improvement_tips":["tip1","tip2","tip3"],"comparison_note":"1 ayat perbandingan dengan percubaan lepas"}`;

    // Call Gemini — same pattern as pdf-quiz-generator
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return jsonError(502, `Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      return jsonError(422, "Gemini returned empty response");
    }

    // Parse JSON from response
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return jsonError(422, `Could not parse Gemini response: ${cleaned.slice(0, 200)}`);
    }

    const analysis = JSON.parse(cleaned.slice(start, end + 1));

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("quiz-performance-analyzer error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(500, msg);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
