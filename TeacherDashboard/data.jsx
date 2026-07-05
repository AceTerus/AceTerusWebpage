// Demo data for ClassPulse School Analytics

const _today = new Date();
const daysAgo = (n) => {
  const d = new Date(_today);
  d.setDate(d.getDate() - n);
  return d;
};

// Avatar color palette — tied to AceTerus accents
const AVATAR_PALETTE = [
  ["#2E2BE5", "#5C5AFF"], // indigo
  ["#2F7CFF", "#5FA0FF"], // blue
  ["#16B5D6", "#4DD2EE"], // cyan
  ["#1B2540", "#3A4768"], // ink
  ["#7A4DFF", "#A07AFF"], // violet
];

function initialsOf(name) {
  const parts = name.replace(/^(En\.|Cik|Pn\.|Tn\.|Pr\.|Dr\.|Mr\.|Mrs\.|Ms\.)/i, "").trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

function makeAvatar(seed) {
  const i = seed % AVATAR_PALETTE.length;
  const [a, b] = AVATAR_PALETTE[i];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

const TRANSCRIPT_SAMPLE = [
  { ts: "09:02", who: "T", text: "Good morning class. Today we will continue from last week and look at differentiation in real-world applications." },
  { ts: "09:03", who: "T", text: "Can someone remind me what differentiation does? Yes, Aisha?" },
  { ts: "09:03", who: "S", text: "It gives us the rate of change." },
  { ts: "09:04", who: "T", text: "Excellent. So if I have a function f of x, the derivative tells us how steeply it's climbing at any point." },
  { ts: "09:06", who: "T", text: "Let's start with the chain rule. I'll do one example on the board, then you'll do two." },
  { ts: "09:11", who: "T", text: "Now — try this one with your partner. Don't peek." },
  { ts: "09:18", who: "T", text: "Hands up if you got it. Beautiful — most of you nailed the chain rule." },
  { ts: "09:22", who: "T", text: "Next, the product rule. This is where I see students slip during SPM. Watch carefully." },
  { ts: "09:34", who: "S", text: "Cikgu, can we use the product rule for three terms?" },
  { ts: "09:35", who: "T", text: "Great question. Yes — you apply it iteratively. Let me show you." },
  { ts: "09:42", who: "T", text: "Final ten minutes: let's apply differentiation to a velocity problem. Open page 84." },
];

const TEACHERS = [
  {
    id: "t-1",
    name: "Ahmad Faizi Razali",
    title: "En. Ahmad Faizi · Mathematics & Physics",
    subjects: ["Mathematics", "Physics"],
    avg: 83,
    trend: +4,
    trendData: [62, 71, 68, 75, 78, 80, 83],
    sessions: 12,
    sessionsWk: 3,
    goals: { hit: 10, total: 12 },
    last: daysAgo(1),
    department: "Sains & Matematik",
    rows: [
      {
        id: "s-1", className: "4 Amanah", subject: "Physics",
        objective: "Understand Newton's Laws of Motion and their applications.",
        keyConcepts: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Friction"],
        covered: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law", "Friction"],
        missed: [],
        coverage: 91, talkRatio: 45, partCount: 29,
        date: daysAgo(1), duration: 42,
        coach: "Outstanding student talk ratio. The group activity worked very well — recommend running it again for the Forces chapter.",
      },
      {
        id: "s-2", className: "5 Bestari", subject: "Mathematics",
        objective: "Introduction to integration techniques.",
        keyConcepts: ["Integration", "Substitution Method", "Definite Integrals", "Area Under Curve"],
        covered: ["Integration", "Substitution Method"],
        missed: ["Definite Integrals", "Area Under Curve"],
        coverage: 73, talkRatio: 71, partCount: 18,
        date: daysAgo(2), duration: 38,
        coach: "Consider allocating more time for definite integrals — students need practice with bounds before the next test.",
      },
      {
        id: "s-3", className: "4 Amanah", subject: "Mathematics",
        objective: "Students will understand differentiation and its applications.",
        keyConcepts: ["Differentiation", "Chain Rule", "Product Rule", "Applications"],
        covered: ["Differentiation", "Chain Rule", "Product Rule", "Applications"],
        missed: [],
        coverage: 87, talkRatio: 58, partCount: 24,
        date: daysAgo(4), duration: 45,
        coach: "Excellent session. Students were highly engaged with the board examples.",
      },
      {
        id: "s-4", className: "5 Bestari", subject: "Mathematics",
        objective: "Vectors in two dimensions — addition, magnitude, direction.",
        keyConcepts: ["Vector Addition", "Magnitude", "Direction Cosines", "Unit Vectors"],
        covered: ["Vector Addition", "Magnitude", "Unit Vectors"],
        missed: ["Direction Cosines"],
        coverage: 78, talkRatio: 60, partCount: 22,
        date: daysAgo(7), duration: 40,
        coach: "Direction cosines briefly mentioned but never worked through — schedule a 15-min reinforcement.",
      },
    ],
  },
  {
    id: "t-2",
    name: "Nurul Huda Azman",
    title: "Cik Nurul Huda · Biology & Chemistry",
    subjects: ["Biology", "Chemistry"],
    avg: 79,
    trend: +1,
    trendData: [70, 74, 72, 78, 76, 79, 79],
    sessions: 14,
    sessionsWk: 4,
    goals: { hit: 11, total: 14 },
    last: daysAgo(1),
    department: "Sains & Matematik",
    rows: [
      {
        id: "s-5", className: "4 Bestari", subject: "Biology",
        objective: "Cell division — mitosis and meiosis.",
        keyConcepts: ["Mitosis", "Meiosis", "Chromosomes", "Cell Cycle"],
        covered: ["Mitosis", "Meiosis", "Chromosomes", "Cell Cycle"],
        missed: [],
        coverage: 94, talkRatio: 40, partCount: 31,
        date: daysAgo(4), duration: 44,
        coach: "Excellent use of diagrams and peer discussion. A model session — share recording with department.",
      },
      {
        id: "s-6", className: "5 Cemerlang", subject: "Chemistry",
        objective: "Acid-base reactions and titration.",
        keyConcepts: ["Acids & Bases", "Neutralisation", "Titration", "pH Scale", "Buffer Solutions"],
        covered: ["Acids & Bases", "Neutralisation", "Titration"],
        missed: ["pH Scale", "Buffer Solutions"],
        coverage: 65, talkRatio: 68, partCount: 14,
        date: daysAgo(3), duration: 37,
        coach: "Buffer solutions need a dedicated follow-up — students showed confusion during Q&A. Consider a lab-based reinforcement.",
      },
      {
        id: "s-7", className: "4 Bestari", subject: "Chemistry",
        objective: "Ionic and covalent bonding.",
        keyConcepts: ["Ionic Bonding", "Covalent Bonding", "Electronegativity", "Bond Energy"],
        covered: ["Ionic Bonding", "Covalent Bonding", "Electronegativity", "Bond Energy"],
        missed: [],
        coverage: 78, talkRatio: 55, partCount: 22,
        date: daysAgo(1), duration: 41,
        coach: "Good pacing. The electronegativity table exercise was effective.",
      },
    ],
  },
  {
    id: "t-3",
    name: "Radzuan Ismail",
    title: "En. Radzuan · BM, English & History",
    subjects: ["BM", "English", "History"],
    avg: 82,
    trend: +2,
    trendData: [75, 78, 76, 80, 81, 82, 82],
    sessions: 11,
    sessionsWk: 3,
    goals: { hit: 11, total: 11 },
    last: daysAgo(0),
    department: "Bahasa & Kemanusiaan",
    rows: [
      {
        id: "s-8", className: "5 Dinamik", subject: "BM",
        objective: "Penulisan karangan jenis perbincangan.",
        keyConcepts: ["Struktur Karangan", "Hujah Utama", "Hujah Sokongan", "Penutup"],
        covered: ["Struktur Karangan", "Hujah Utama", "Hujah Sokongan", "Penutup"],
        missed: [],
        coverage: 88, talkRatio: 50, partCount: 27,
        date: daysAgo(4), duration: 43,
        coach: "Students produced strong draft paragraphs during class time.",
      },
      {
        id: "s-9", className: "4 Cemerlang", subject: "History",
        objective: "The formation of Malaysia — key events and figures.",
        keyConcepts: ["Independence 1957", "Malaysia 1963", "Tunku Abdul Rahman", "Merger & Separation"],
        covered: ["Independence 1957", "Malaysia 1963", "Tunku Abdul Rahman", "Merger & Separation"],
        missed: [],
        coverage: 82, talkRatio: 52, partCount: 25,
        date: daysAgo(2), duration: 39,
        coach: "Timeline activity boosted retention. Consider extending it next session.",
      },
      {
        id: "s-10", className: "5 Dinamik", subject: "English",
        objective: "Comprehension strategies and passive voice.",
        keyConcepts: ["Skimming", "Scanning", "Passive Voice", "Inference Skills"],
        covered: ["Skimming", "Scanning", "Passive Voice", "Inference Skills"],
        missed: [],
        coverage: 76, talkRatio: 58, partCount: 20,
        date: daysAgo(0), duration: 36,
        coach: "Students need more practice with inference questions — a common SPM weak point.",
      },
    ],
  },
  {
    id: "t-4",
    name: "Salmah Mohamad",
    title: "Pn. Salmah · Mathematics",
    subjects: ["Mathematics"],
    avg: 51,
    trend: -8,
    trendData: [70, 66, 60, 58, 55, 53, 51],
    sessions: 7,
    sessionsWk: 2,
    goals: { hit: 1, total: 7 },
    last: daysAgo(1),
    flagged: true,
    department: "Sains & Matematik",
    rows: [
      {
        id: "s-11", className: "4 Dinamik", subject: "Mathematics",
        objective: "Trigonometry — sine, cosine, tangent rules.",
        keyConcepts: ["Sine Rule", "Cosine Rule", "Trigonometric Identities", "Graphs"],
        covered: ["Sine Rule"],
        missed: ["Cosine Rule", "Trigonometric Identities", "Graphs"],
        coverage: 47, talkRatio: 74, partCount: 8,
        date: daysAgo(1), duration: 34,
        coach: "Critical coverage gap. Cosine rule and identities are high-frequency SPM topics — urgent follow-up recommended.",
      },
      {
        id: "s-12", className: "5 Bestari", subject: "Mathematics",
        objective: "Statistics — mean, mode, median and standard deviation.",
        keyConcepts: ["Mean", "Median", "Mode", "Standard Deviation", "Normal Distribution"],
        covered: ["Mean", "Median"],
        missed: ["Mode", "Standard Deviation", "Normal Distribution"],
        coverage: 54, talkRatio: 72, partCount: 10,
        date: daysAgo(3), duration: 32,
        coach: "Session ran short on time. Standard deviation and normal distribution were skipped. Recommend scheduling a catch-up.",
      },
    ],
  },
  {
    id: "t-5",
    name: "Lee Mei Ling",
    title: "Cik Mei Ling · Add. Math & Physics",
    subjects: ["Add. Math", "Physics"],
    avg: 88,
    trend: +6,
    trendData: [76, 80, 82, 84, 85, 87, 88],
    sessions: 10,
    sessionsWk: 3,
    goals: { hit: 9, total: 10 },
    last: daysAgo(0),
    department: "Sains & Matematik",
    rows: [
      {
        id: "s-13", className: "5 Pintar", subject: "Add. Math",
        objective: "Progressions — arithmetic and geometric.",
        keyConcepts: ["AP Formula", "GP Formula", "Sum to Infinity", "Word Problems"],
        covered: ["AP Formula", "GP Formula", "Sum to Infinity", "Word Problems"],
        missed: [],
        coverage: 93, talkRatio: 48, partCount: 28,
        date: daysAgo(0), duration: 45,
        coach: "Pacing was exemplary. Students completed all four worked examples within the session.",
      },
      {
        id: "s-14", className: "4 Pintar", subject: "Physics",
        objective: "Heat — specific heat capacity and latent heat.",
        keyConcepts: ["Specific Heat", "Latent Heat", "Phase Change", "Calorimetry"],
        covered: ["Specific Heat", "Latent Heat", "Phase Change", "Calorimetry"],
        missed: [],
        coverage: 86, talkRatio: 52, partCount: 24,
        date: daysAgo(2), duration: 40,
        coach: "Calorimetry demo was very effective. Consider filming for next year's reference.",
      },
    ],
  },
  {
    id: "t-6",
    name: "Hafiz Tan",
    title: "En. Hafiz Tan · Geography & Moral",
    subjects: ["Geography", "Moral"],
    avg: 71,
    trend: -2,
    trendData: [76, 75, 72, 74, 73, 72, 71],
    sessions: 9,
    sessionsWk: 2,
    goals: { hit: 6, total: 9 },
    last: daysAgo(2),
    department: "Bahasa & Kemanusiaan",
    rows: [
      {
        id: "s-15", className: "4 Bestari", subject: "Geography",
        objective: "Tropical climate and monsoon patterns.",
        keyConcepts: ["Monsoon Winds", "Inter-Tropical Convergence Zone", "Rainfall Patterns", "Climate Graphs"],
        covered: ["Monsoon Winds", "Rainfall Patterns", "Climate Graphs"],
        missed: ["Inter-Tropical Convergence Zone"],
        coverage: 72, talkRatio: 64, partCount: 17,
        date: daysAgo(2), duration: 38,
        coach: "Solid coverage of monsoons. ITCZ was alluded to but not formally introduced — recommend a 10-min refresh.",
      },
      {
        id: "s-16", className: "5 Cemerlang", subject: "Moral",
        objective: "Civic responsibility and community service.",
        keyConcepts: ["Civic Duty", "Volunteerism", "Community Welfare", "Citizenship"],
        covered: ["Civic Duty", "Volunteerism", "Community Welfare"],
        missed: ["Citizenship"],
        coverage: 70, talkRatio: 67, partCount: 14,
        date: daysAgo(5), duration: 35,
        coach: "Strong discussion but ran out of time before citizenship case study.",
      },
    ],
  },
];

const SUBJECT_PERF = [
  { subject: "Mathematics", avg: 72, sessions: 14, classes: 5 },
  { subject: "Physics",     avg: 87, sessions: 8,  classes: 3 },
  { subject: "Biology",     avg: 89, sessions: 5,  classes: 2 },
  { subject: "Chemistry",   avg: 74, sessions: 7,  classes: 3 },
  { subject: "English",     avg: 79, sessions: 6,  classes: 3 },
  { subject: "BM",          avg: 84, sessions: 5,  classes: 3 },
  { subject: "History",     avg: 82, sessions: 4,  classes: 2 },
  { subject: "Geography",   avg: 73, sessions: 4,  classes: 2 },
];

// 7 days × 6 concept groups — coverage % heatmap data
const HEATMAP_ROWS = [
  { label: "Core Skills",      vals: [88, 84, 82, 85, 81, 78, 86] },
  { label: "Recall",           vals: [76, 78, 80, 74, 70, 72, 75] },
  { label: "Application",      vals: [62, 64, 60, 68, 71, 73, 70] },
  { label: "Higher-Order",     vals: [45, 50, 48, 52, 55, 58, 60] },
  { label: "Lab / Practical",  vals: [80, 82, 78, 85, 88, 86, 90] },
  { label: "SPM Exam Style",   vals: [55, 58, 60, 64, 62, 65, 70] },
];

const TRENDS_30D = {
  avgCoverage: { value: 79, delta: +3, spark: [68, 70, 71, 69, 72, 74, 73, 75, 76, 75, 77, 79] },
  studentTalk: { value: 46, delta: +5, spark: [38, 39, 41, 40, 42, 43, 42, 44, 45, 45, 46, 46] },
  goalsHit:    { value: 48, delta: -2, total: 63, spark: [40, 42, 41, 43, 44, 46, 45, 47, 48, 47, 48, 48] },
  flagged:     { value: 5,  delta: +1, spark: [3, 3, 4, 4, 3, 4, 5, 4, 5, 5, 4, 5] },
  participation:{ value: 22, delta: +2, spark: [18, 19, 20, 19, 21, 21, 22, 22, 21, 22, 22, 22], unit: "/class" },
};

Object.assign(window, {
  TEACHERS, SUBJECT_PERF, HEATMAP_ROWS, TRENDS_30D, TRANSCRIPT_SAMPLE,
  initialsOf, makeAvatar, daysAgo,
});
