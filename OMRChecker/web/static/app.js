"use strict";

const OPTIONS = ["", "A", "B", "C", "D", "E"]; // blank + options; covers MCQ4/MCQ5
let selectedFile = null;
let questions = [];

// ---- tab switching --------------------------------------------------------------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ---- helpers --------------------------------------------------------------------
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error((await r.json()).detail || r.statusText);
  return r.json();
}

function setStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = "muted " + (ok === true ? "status-ok" : ok === false ? "status-err" : "");
}

// ---- answer key -----------------------------------------------------------------
async function initAnswerKey() {
  const qData = await getJSON("/api/questions");
  questions = qData.questions;

  const grid = document.getElementById("key-grid");
  grid.innerHTML = "";
  questions.forEach((q) => {
    const wrap = document.createElement("div");
    wrap.className = "key-item";
    const label = document.createElement("label");
    label.textContent = q;
    const sel = document.createElement("select");
    sel.id = "key-" + q;
    OPTIONS.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt === "" ? "—" : opt;
      sel.appendChild(o);
    });
    wrap.appendChild(label);
    wrap.appendChild(sel);
    grid.appendChild(wrap);
  });

  // Pre-fill with the existing key, if any.
  try {
    const keyData = await getJSON("/api/answer-key");
    if (keyData.answer_key) {
      const opts = keyData.answer_key.options || {};
      const ans = opts.answers_in_order || [];
      questions.forEach((q, i) => {
        const sel = document.getElementById("key-" + q);
        if (sel && typeof ans[i] === "string") sel.value = ans[i];
      });
      const m = (keyData.answer_key.marking_schemes || {}).DEFAULT || {};
      if (m.correct !== undefined) document.getElementById("mark-correct").value = m.correct;
      if (m.incorrect !== undefined) document.getElementById("mark-incorrect").value = m.incorrect;
      if (m.unmarked !== undefined) document.getElementById("mark-unmarked").value = m.unmarked;
    }
    updateKeyBanner(keyData.has_key);
  } catch (e) {
    /* no key yet */
  }
}

function updateKeyBanner(hasKey) {
  document.getElementById("no-key-banner").classList.toggle("hidden", !!hasKey);
}

document.getElementById("save-key-btn").addEventListener("click", async () => {
  const status = document.getElementById("key-status");
  const answers = questions.map((q) => document.getElementById("key-" + q).value);
  const blanks = answers.filter((a) => a === "").length;
  if (blanks > 0) {
    setStatus(status, `Please select an answer for every question (${blanks} left blank).`, false);
    return;
  }
  setStatus(status, "Saving…");
  try {
    const r = await fetch("/api/answer-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers_in_order: answers,
        marking: {
          correct: document.getElementById("mark-correct").value,
          incorrect: document.getElementById("mark-incorrect").value,
          unmarked: document.getElementById("mark-unmarked").value,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Save failed");
    setStatus(status, "✅ Answer key saved.", true);
    updateKeyBanner(true);
  } catch (e) {
    setStatus(status, "❌ " + e.message, false);
  }
});

// ---- file selection -------------------------------------------------------------
function pickFile(file) {
  selectedFile = file;
  document.getElementById("file-name").textContent = file ? "Selected: " + file.name : "";
  document.getElementById("scan-btn").disabled = !file;
}

document.getElementById("camera-input").addEventListener("change", (e) =>
  pickFile(e.target.files[0])
);
document.getElementById("file-input").addEventListener("change", (e) =>
  pickFile(e.target.files[0])
);

const dz = document.getElementById("dropzone");
["dragenter", "dragover"].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.add("over");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.remove("over");
  })
);
dz.addEventListener("drop", (e) => {
  if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
});

// ---- scan & grade ---------------------------------------------------------------
document.getElementById("scan-btn").addEventListener("click", async () => {
  if (!selectedFile) return;
  const status = document.getElementById("scan-status");
  const btn = document.getElementById("scan-btn");
  btn.disabled = true;
  setStatus(status, "Processing… this can take a few seconds.");
  document.getElementById("results").classList.add("hidden");

  const fd = new FormData();
  fd.append("file", selectedFile);
  try {
    const r = await fetch("/api/scan", { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Scan failed");
    renderResult(data);
    setStatus(status, "Done.", true);
  } catch (e) {
    setStatus(status, "❌ " + e.message, false);
  } finally {
    btn.disabled = false;
  }
});

function renderResult(data) {
  const results = document.getElementById("results");
  results.classList.remove("hidden");

  const pct = data.max_score > 0 ? Math.round((data.score / data.max_score) * 100) : 0;
  document.getElementById("score-box").innerHTML =
    `Score: ${data.score} / ${data.max_score} <span class="muted">(${pct}%)</span>` +
    (data.multi_marked ? '<br><span style="color:var(--amber);font-size:1rem">⚠ multi-marked bubbles detected</span>' : "");

  const tbody = document.querySelector("#results-table tbody");
  tbody.innerHTML = "";
  data.per_question.forEach((row) => {
    const tr = document.createElement("tr");
    const v = (row.verdict || "").toLowerCase();
    if (v.startsWith("correct")) tr.className = "correct";
    else if (v.startsWith("incorrect")) tr.className = "incorrect";
    else tr.className = "unmarked";
    tr.innerHTML =
      `<td>${row.question}</td><td>${row.marked || "–"}</td>` +
      `<td>${row.answer}</td><td>${row.verdict}</td><td>${row.delta}</td>`;
    tbody.appendChild(tr);
  });

  const img = document.getElementById("annotated");
  if (data.annotated_image) {
    img.src = data.annotated_image;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }
}

// ---- init -----------------------------------------------------------------------
initAnswerKey().catch((e) => console.error(e));
