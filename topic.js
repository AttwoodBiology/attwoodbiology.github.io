/* AttwoodBiology — topic page engine. Builds every section from the TOPIC data
   defined in each topic page. Fix or improve something here and every topic updates. */
(function(){
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const tag = l => `<span class="tag ${l === "AHL" ? "ahl" : "sl"}">${l}</span>`;
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const KEY = "ibbio-" + TOPIC.code;

document.body.dataset.strand = TOPIC.code.charAt(0);
$("#topic-code").textContent = TOPIC.code;
$("#theme-name").textContent = TOPIC.theme;
$("#topic-title").innerHTML = `<em>${esc(TOPIC.code)}</em> ${esc(TOPIC.title)}`;
$("#topic-guiding").textContent = TOPIC.guiding;

/* Level switch */
function setLevel(l){
  if (TOPIC.hlOnly) l = "HL";
  document.body.classList.toggle("sl-only", l === "SL");
  if (TOPIC.hlOnly) { updateScore(); return; }
  $("#btn-sl").setAttribute("aria-pressed", l === "SL");
  $("#btn-hl").setAttribute("aria-pressed", l !== "SL");
  store.set("ibbio-level", l);
  updateScore();
}
if (TOPIC.hlOnly) {
  $(".level-switch").outerHTML = '<span class="hl-only-badge">HL only topic</span>';
} else {
  $("#btn-sl").onclick = () => setLevel("SL");
  $("#btn-hl").onclick = () => setLevel("HL");
}

/* Videos */
const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
$("#video-list").innerHTML = TOPIC.videos.map(v => `
  <article class="card video" data-level="${v.level}">
    <div class="frame">${v.youtubeId
      ? `<iframe src="https://www.youtube.com/embed/${esc(v.youtubeId)}?rel=0" title="${esc(v.title)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : `<div class="placeholder">${playIcon}<div><b>Video coming soon</b></div></div>`}
    </div>
    <h3>${esc(v.title)} ${tag(v.level)}</h3>
    <p>${esc(v.desc)}</p>
    ${v.youtubeId ? `<p><a href="https://www.youtube.com/watch?v=${esc(v.youtubeId)}">Open on YouTube</a></p>` : ""}
  </article>`).join("");

/* Key ideas */
$("#idea-list").innerHTML = TOPIC.ideas.map(i => `
  <div class="idea" data-level="${i.level}"><h3><span>${esc(i.h)}</span>${tag(i.level)}</h3><p>${esc(i.p)}</p></div>`).join("");

/* Multiple choice */
let answers = store.get(KEY + "-mcq") || {};
const L = "ABCD";
function renderMCQ(){
  $("#mcq-list").innerHTML = TOPIC.mcq.map((q, qi) => `
    <article class="card" data-level="${q.level}" id="mcq-${qi}">
      <div class="q-num">QUESTION ${qi + 1} ${tag(q.level)}</div>
      <p class="stem">${esc(q.stem)}</p>
      <div class="opts">${q.opts.map((o, oi) => `
        <button type="button" class="opt" data-q="${qi}" data-o="${oi}"><span class="letter">${L[oi]}</span><span>${esc(o[0])}</span></button>`).join("")}
      </div>
      <div class="feedback" aria-live="polite"></div>
    </article>`).join("");
  Object.entries(answers).forEach(([qi, oi]) => showMCQ(+qi, oi));
  updateScore();
}
function showMCQ(qi, oi){
  const q = TOPIC.mcq[qi], card = $("#mcq-" + qi); if (!card) return;
  const fb = card.querySelector(".feedback");
  card.querySelectorAll(".opt").forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add("correct");
    else if (i === oi) b.classList.add("wrong");
    else b.classList.add("dim");
  });
  const right = oi === q.answer;
  let html = `<b>${right ? "Correct" : "Not quite. The answer is " + L[q.answer]}</b>${esc(q.why)}`;
  if (!right && q.opts[oi][1]) html += `<ul><li><b style="display:inline">Why ${L[oi]} is wrong:</b> ${esc(q.opts[oi][1])}</li></ul>`;
  fb.innerHTML = html;
  fb.className = "feedback show " + (right ? "good" : "bad");
}
$("#mcq-list").addEventListener("click", e => {
  const b = e.target.closest(".opt"); if (!b || b.disabled) return;
  const qi = +b.dataset.q, oi = +b.dataset.o;
  answers[qi] = oi; store.set(KEY + "-mcq", answers);
  showMCQ(qi, oi); updateScore();
});
$("#mcq-reset").onclick = () => { answers = {}; store.set(KEY + "-mcq", answers); renderMCQ(); };
function updateScore(){
  const slOnly = document.body.classList.contains("sl-only");
  const pool = TOPIC.mcq.map((q, i) => ({q, i})).filter(x => !slOnly || x.q.level === "SL");
  const done = pool.filter(x => x.i in answers);
  const right = done.filter(x => answers[x.i] === x.q.answer).length;
  const txt = `${right} / ${done.length} correct · ${pool.length - done.length} left`;
  $("#mcq-score").textContent = txt;
  if (window.ibbioSaveProgress) window.ibbioSaveProgress();
}

/* Exam-style questions */
let pid = 0;
$("#exam-list").innerHTML = TOPIC.exam.map((ex, ei) => {
  const total = ex.parts.reduce((s, p) => s + p.marks, 0);
  const table = ex.table ? `<div class="table-scroll"><table><tr>${ex.table.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr>${ex.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>` : "";
  return `<article class="card exam" data-level="${ex.level}">
    <div class="q-head"><h3>${ei + 1}. ${esc(ex.title)} ${tag(ex.level)}</h3><span class="marks">[${total} mark${total > 1 ? "s" : ""}]</span></div>
    ${ex.intro ? `<p class="prompt">${esc(ex.intro)}</p>` : ""}${table}
    ${ex.parts.map(p => { const id = "p" + (pid++); return `
      <div class="part" data-max="${p.marks}" id="${id}">
        <div class="q-head"><p>${p.prompt}</p><span class="marks">[${p.marks}]</span></div>
        <label class="note" for="${id}-ans">Your answer</label>
        <textarea id="${id}-ans" placeholder="Write your answer before revealing the mark scheme"></textarea>
        <div class="toolbar" style="margin-top:10px"><button type="button" class="btn ghost reveal" aria-controls="${id}-ms" aria-expanded="false">Show mark scheme</button></div>
        <div class="ms" id="${id}-ms">
          <h4>Marking points: award 1 mark each, maximum ${p.marks}</h4>
          ${p.points.map((pt, k) => `<label for="${id}-c${k}"><input type="checkbox" id="${id}-c${k}"><span>${esc(pt)}</span></label>`).join("")}
          <p class="selfscore" aria-live="polite">Your score: 0 / ${p.marks}</p>
          ${p.examiner ? `<div class="block"><h4>Examiner tip</h4><p>${esc(p.examiner)}</p></div>` : ""}
          ${p.mistakes && p.mistakes.length ? `<div class="block"><h4 class="warn">Common mistakes</h4><ul>${p.mistakes.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
        </div>
      </div>`; }).join("")}
  </article>`;
}).join("");
$("#exam-list").addEventListener("click", e => {
  const b = e.target.closest(".reveal"); if (!b) return;
  const ms = document.getElementById(b.getAttribute("aria-controls"));
  const open = ms.classList.toggle("show");
  b.setAttribute("aria-expanded", open);
  if (open) {
    const seen = store.get(KEY + "-exam") || {};
    seen[b.closest(".part").id] = true;
    store.set(KEY + "-exam", seen);
    if (window.ibbioSaveProgress) window.ibbioSaveProgress();
  }
  b.textContent = open ? "Hide mark scheme" : "Show mark scheme";
});
/* Save typed answers and ticked marking points so students can pick up where they left off */
const examText = store.get(KEY + "-exam-text") || {}, examTicks = store.get(KEY + "-exam-ticks") || {};
function scorePart(part){
  const max = +part.dataset.max, n = part.querySelectorAll("input:checked").length;
  part.querySelector(".selfscore").textContent = `Your score: ${Math.min(n, max)} / ${max}` + (n > max ? " (maximum reached)" : "");
}
document.querySelectorAll("#exam-list .part").forEach(part => {
  const ta = part.querySelector("textarea");
  if (examText[part.id]) ta.value = examText[part.id];
  (examTicks[part.id] || []).forEach(k => { const c = document.getElementById(part.id + "-c" + k); if (c) c.checked = true; });
  scorePart(part);
});
let typingTimer = null;
$("#exam-list").addEventListener("input", e => {
  if (e.target.tagName !== "TEXTAREA") return;
  const part = e.target.closest(".part");
  examText[part.id] = e.target.value;
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { store.set(KEY + "-exam-text", examText); if (window.ibbioSaveProgress) window.ibbioSaveProgress(); }, 400);
});
$("#exam-list").addEventListener("change", e => {
  const part = e.target.closest(".part"); if (!part) return;
  examTicks[part.id] = [...part.querySelectorAll("input[type=checkbox]")].map((c, k) => c.checked ? k : -1).filter(k => k >= 0);
  store.set(KEY + "-exam-ticks", examTicks);
  if (window.ibbioSaveProgress) window.ibbioSaveProgress();
  const max = +part.dataset.max, n = part.querySelectorAll("input:checked").length;
  part.querySelector(".selfscore").textContent = `Your score: ${Math.min(n, max)} / ${max}` + (n > max ? " (maximum reached)" : "");
});

/* Revision sheets */
$("#sheet-list").innerHTML = TOPIC.sheets.map(s => `
  <article class="card sheet" data-level="${s.level}">
    <div class="icon">PDF</div>
    <h3>${esc(s.title)} ${tag(s.level)}</h3>
    <p>${esc(s.desc)}</p>
    ${s.file ? `<a class="btn" href="${esc(s.file)}" download>Download PDF</a>` : `<span class="btn" aria-disabled="true">Coming soon</span>`}
  </article>`).join("");

setLevel(store.get("ibbio-level") === "SL" ? "SL" : "HL");
renderMCQ();
})();

/* ============================================================
   KEY TERMS: drag each term onto its definition.
   TOPIC.terms is the SL set (or the only set on HL-only topics).
   TOPIC.termsHL is an extra HL set, hidden when SL is selected.
   Works with a mouse, touch (drag, or tap a term then tap a box)
   and keyboard (Enter on a term, then Enter on a box).
   ============================================================ */
(function(){
  const section = document.getElementById("key-terms");
  const slBox = document.getElementById("key-terms-box");
  if (!section || !slBox || !TOPIC.terms || !TOPIC.terms.length) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  if (TOPIC.termsHL && TOPIC.termsHL.length) {
    slBox.insertAdjacentHTML("beforebegin", '<h3 class="kt-sub">SL key terms <span class="tag sl">SL</span></h3>');
    section.insertAdjacentHTML("beforeend",
      '<div data-level="AHL" class="kt-hl"><h3 class="kt-sub">HL key terms <span class="tag ahl">AHL</span></h3><div class="key-terms" id="key-terms-hl-box"></div></div>');
    keyTerms(document.getElementById("key-terms-hl-box"), TOPIC.termsHL, "hl");
  }
  keyTerms(slBox, TOPIC.terms, "sl");

  function shuffle(a){ for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function keyTerms(box, terms, setId){
    let selected = null, drag = null, suppressClick = false;
    const bank = () => box.querySelector(".kt-bank");
    const chip = i => `<button type="button" class="kt-chip" data-i="${i}">${esc(terms[i].term)}</button>`;

    function render(){
      // Shuffle the definitions, then shuffle the terms so that no term
      // sits in the same position as its own definition.
      const rows = shuffle(terms.map((_, i) => i));
      let order, tries = 0;
      do { order = shuffle(terms.map((_, i) => i)); tries++; }
      while (tries < 200 && order.some((t, k) => t === rows[k]));
      box.innerHTML = `
        <div class="kt-bank" aria-label="Key terms to place">${order.map(chip).join("")}</div>
        <ol class="kt-list">${rows.map(i => `
          <li class="kt-row">
            <div class="kt-slot" data-i="${i}" tabindex="0" role="button" aria-label="Place the selected term on this definition"><span class="kt-placeholder">Drop term here</span></div>
            <p class="kt-def">${esc(terms[i].def)}</p>
          </li>`).join("")}</ol>
        <div class="toolbar">
          <button type="button" class="btn kt-check">Check answers</button>
          <button type="button" class="btn ghost kt-show">Show answers</button>
          <button type="button" class="btn ghost kt-reset">Start again</button>
          <span class="selfscore kt-score" aria-live="polite"></span>
        </div>`;
      selected = null;
      box.classList.remove("placing");
    }
    function tidy(){
      box.querySelectorAll(".kt-slot").forEach(s => {
        const filled = !!s.querySelector(".kt-chip");
        s.querySelector(".kt-placeholder").hidden = filled;
        s.classList.toggle("filled", filled);
        s.classList.remove("right", "wrong");
      });
      box.querySelector(".kt-score").textContent = "";
    }
    function select(c){
      if (selected) selected.classList.remove("selected");
      selected = (selected === c) ? null : c;
      if (selected) selected.classList.add("selected");
      box.classList.toggle("placing", !!selected);
    }
    function place(c, target){
      if (target.classList.contains("kt-slot")) {
        const existing = target.querySelector(".kt-chip");
        if (existing && existing !== c) bank().appendChild(existing);
        target.appendChild(c);
      } else {
        bank().appendChild(c);
      }
      if (selected) select(selected);
      tidy();
    }
    function check(fromShow){
      let right = 0;
      box.querySelectorAll(".kt-slot").forEach(s => {
        const c = s.querySelector(".kt-chip");
        s.classList.remove("right", "wrong");
        if (!c) return;
        const ok = c.dataset.i === s.dataset.i;
        s.classList.add(ok ? "right" : "wrong");
        if (ok) right++;
      });
      const placed = box.querySelectorAll(".kt-slot .kt-chip").length;
      if (!fromShow && right === terms.length) {
        try { localStorage.setItem("ibbio-" + TOPIC.code + "-terms-" + setId, "true"); } catch(e){}
        if (window.ibbioSaveProgress) window.ibbioSaveProgress();
      }
      box.querySelector(".kt-score").textContent = right === terms.length
        ? `All ${terms.length} correct!`
        : `${right} / ${terms.length} correct` + (placed < terms.length ? ` · ${terms.length - placed} still to place` : " · move the red ones and check again");
    }
    function showAnswers(){
      box.querySelectorAll(".kt-slot").forEach(s => s.appendChild(box.querySelector(`.kt-chip[data-i="${s.dataset.i}"]`)));
      tidy(); check(true);
    }

    box.addEventListener("click", e => {
      if (e.target.closest(".kt-check")) return check(false);
      if (e.target.closest(".kt-show")) return showAnswers();
      if (e.target.closest(".kt-reset")) return render();
      const c = e.target.closest(".kt-chip");
      if (c) {
        if (suppressClick) { suppressClick = false; return; }
        const slot = c.parentElement.classList.contains("kt-slot") ? c.parentElement : null;
        if (selected && selected !== c && slot) return place(selected, slot);
        return select(c);
      }
      const target = e.target.closest(".kt-slot") || e.target.closest(".kt-bank");
      if (target && selected) place(selected, target);
    });
    box.addEventListener("keydown", e => {
      const s = e.target.closest(".kt-slot");
      if (s && e.target === s && (e.key === "Enter" || e.key === " ") && selected) { e.preventDefault(); place(selected, s); }
    });

    /* Dragging with mouse or finger */
    box.addEventListener("pointerdown", e => {
      const c = e.target.closest(".kt-chip"); if (!c || e.button > 0) return;
      drag = { chip: c, x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener("pointermove", e => {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        const r = drag.chip.getBoundingClientRect();
        drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
        drag.ghost = drag.chip.cloneNode(true);
        drag.ghost.className = "kt-chip kt-ghost";
        drag.ghost.style.width = r.width + "px";
        document.body.appendChild(drag.ghost);
        drag.chip.classList.add("dragging");
        drag.moved = true;
      }
      drag.ghost.style.left = (e.clientX - drag.ox) + "px";
      drag.ghost.style.top = (e.clientY - drag.oy) + "px";
      box.querySelectorAll(".kt-slot.over").forEach(s => s.classList.remove("over"));
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const s = under && under.closest(".kt-slot");
      if (s && box.contains(s)) s.classList.add("over");
    });
    function endDrag(e, drop){
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      d.ghost.remove(); d.chip.classList.remove("dragging");
      box.querySelectorAll(".kt-slot.over").forEach(s => s.classList.remove("over"));
      if (!drop) return;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under && (under.closest(".kt-slot") || under.closest(".kt-bank"));
      if (target && box.contains(target)) place(d.chip, target);
    }
    window.addEventListener("pointerup", e => endDrag(e, true));
    window.addEventListener("pointercancel", e => endDrag(e, false));

    render();
  }
})();

/* ============================================================
   REVISION CHECKLIST and PAGE PROGRESS
   Ratings and progress are saved in this browser only.
   Progress is shown in the menu bar and on the home page.
   ============================================================ */
(function(){
  const KEY = "ibbio-" + TOPIC.code;
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const slOnly = () => document.body.classList.contains("sl-only");
  const inLevel = l => !slOnly() || l !== "AHL";

  /* Checklist */
  const box = document.getElementById("checklist-box");
  const items = TOPIC.checklist || [];
  let ck = get(KEY + "-check") || {};
  const OPTS = [["r", "Not yet"], ["a", "Nearly"], ["g", "Confident"]];
  function summary(){
    if (!box) return;
    const vis = items.map((c, i) => ({c, i})).filter(x => inLevel(x.c.level));
    const n = {r: 0, a: 0, g: 0};
    vis.forEach(x => { if (ck[x.i]) n[ck[x.i]]++; });
    const none = vis.length - n.r - n.a - n.g, w = k => (100 * k / (vis.length || 1)) + "%";
    box.querySelector(".ck-summary").innerHTML = `
      <div class="ck-bar" aria-hidden="true"><i class="g" style="width:${w(n.g)}"></i><i class="a" style="width:${w(n.a)}"></i><i class="r" style="width:${w(n.r)}"></i></div>
      <p class="ck-counts"><span class="dot g"></span>Confident ${n.g}<span class="dot a"></span>Nearly ${n.a}<span class="dot r"></span>Not yet ${n.r}<span class="dot n"></span>Not rated ${none}</p>`;
  }
  if (box && items.length) {
    box.innerHTML = `<div class="ck-summary" aria-live="polite"></div>
      <ul class="ck-list">${items.map((c, i) => `
        <li class="ck-row" data-level="${c.level}" data-i="${i}">
          <p class="ck-text">${c.level === "AHL" ? '<span class="tag ahl">AHL</span> ' : ""}${esc(c.text)}</p>
          <div class="ck-rag" role="group" aria-label="How confident are you?">${OPTS.map(([v, l]) =>
            `<button type="button" class="ck-btn ck-${v}" data-v="${v}" aria-pressed="${ck[i] === v}">${l}</button>`).join("")}</div>
        </li>`).join("")}</ul>
      <div class="toolbar"><button type="button" class="btn ghost ck-clear">Clear my ratings</button></div>`;
    box.addEventListener("click", e => {
      const b = e.target.closest(".ck-btn");
      if (b) {
        const row = b.closest(".ck-row"), i = row.dataset.i;
        if (ck[i] === b.dataset.v) delete ck[i]; else ck[i] = b.dataset.v;
        row.querySelectorAll(".ck-btn").forEach(x => x.setAttribute("aria-pressed", ck[i] === x.dataset.v));
        set(KEY + "-check", ck);
        window.ibbioSaveProgress();
      }
      if (e.target.closest(".ck-clear")) {
        ck = {}; set(KEY + "-check", ck);
        box.querySelectorAll(".ck-btn").forEach(x => x.setAttribute("aria-pressed", "false"));
        window.ibbioSaveProgress();
      }
    });
  }

  /* Page progress.
     A page is complete when the key terms are done (all correct), every exam
     question has been attempted (answer typed or mark scheme opened) and every
     checklist statement has been rated. Multiple choice progress is shown too. */
  window.ibbioSaveProgress = function(){
    const answers = get(KEY + "-mcq") || {};
    const pool = TOPIC.mcq.map((q, i) => ({q, i})).filter(x => inLevel(x.q.level));
    const mcq = pool.length ? pool.filter(x => x.i in answers).length / pool.length : null;

    const sets = [];
    if (TOPIC.terms && TOPIC.terms.length) sets.push(get(KEY + "-terms-sl") ? 1 : 0);
    if (!slOnly() && TOPIC.termsHL && TOPIC.termsHL.length) sets.push(get(KEY + "-terms-hl") ? 1 : 0);
    const terms = sets.length ? sets.reduce((a, b) => a + b, 0) / sets.length : null;

    const seen = get(KEY + "-exam") || {}, typed = get(KEY + "-exam-text") || {};
    const ex = [...document.querySelectorAll("#exam-list .part")].filter(p => inLevel(p.closest(".exam").dataset.level));
    const exam = ex.length ? ex.filter(p => seen[p.id] || (typed[p.id] || "").trim()).length / ex.length : null;

    const vis = items.map((c, i) => ({c, i})).filter(x => inLevel(x.c.level));
    const check = vis.length ? vis.filter(x => ck[x.i]).length / vis.length : null;

    const needed = [terms, exam, check].filter(v => v !== null);
    const complete = needed.length > 0 && needed.every(v => v === 1);
    const prog = {terms, mcq, exam, check, complete, level: slOnly() ? "SL" : "HL", updated: Date.now()};
    set("ibbio-progress-" + TOPIC.code, prog);

    const chip = document.getElementById("score-chip");
    if (chip) chip.innerHTML = progressDots(prog) + (complete ? ' <b class="chip-done">Page complete ✓</b>' : "");
    summary();
  };
  function progressDots(p){
    const dot = (v, letter, name) => v === null ? "" :
      `<span class="pdot ${v >= 1 ? "full" : v > 0 ? "half" : ""}" title="${name}: ${v >= 1 ? "done" : v > 0 ? "started" : "not started"}">${letter}</span>`;
    return dot(p.terms, "K", "Key terms") + dot(p.mcq, "M", "Multiple choice") + dot(p.exam, "E", "Exam questions") + dot(p.check, "C", "Checklist");
  }
  window.ibbioSaveProgress();
})();
