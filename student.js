/* AttwoodBiology: student sign-in and progress reporting.
   Students type their name once. Their progress on each topic is sent to
   the teacher's Google Sheet. Nothing is sent until ENDPOINT is set. */
(function(){
  // Paste the Google Apps Script web app URL (ending /exec) between the quotes.
  const ENDPOINT = "";

  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  window.ibbioStudent = () => get("ibbio-student");

  function send(payload){
    if (!ENDPOINT) return;
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], {type: "text/plain"}))) return;
    } catch(e){}
    try { fetch(ENDPOINT, {method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain"}, body}); } catch(e){}
  }

  /* Called by each topic page whenever progress changes */
  const timers = {};
  window.ibbioReport = function(code, prog){
    const s = get("ibbio-student");
    if (!ENDPOINT || !s || !code) return;
    const payload = {name: s.name, group: s.group || "", code, title: prog.title || "", level: prog.level,
      terms: prog.terms, mcq: prog.mcq, exam: prog.exam, check: prog.check, complete: !!prog.complete};
    const sig = JSON.stringify(payload);
    if (get("ibbio-sent-" + code) === sig) return;
    clearTimeout(timers[code]);
    timers[code] = setTimeout(() => { send(payload); set("ibbio-sent-" + code, sig); }, 1500);
  };

  /* Send everything already saved on this device (used after signing in) */
  function sendAll(){
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("ibbio-progress-") === 0) {
        const p = get(k);
        if (p) { localStorage.removeItem("ibbio-sent-" + k.slice(15)); window.ibbioReport(k.slice(15), p); }
      }
    }
  }

  /* Sign-in box */
  function showSignIn(force){
    if (!ENDPOINT) return;
    if (!force && (get("ibbio-student") || sessionStorageGet("ibbio-skip"))) return;
    if (document.getElementById("signin")) return;
    const s = get("ibbio-student") || {};
    const wrap = document.createElement("div");
    wrap.id = "signin";
    wrap.innerHTML = `
      <form class="signin-card" aria-labelledby="signin-title">
        <h2 id="signin-title">Save your progress</h2>
        <p>Type your name so your teacher can see which topics you have completed. You only need to do this once on this device.</p>
        <label for="signin-first">First name</label>
        <input id="signin-first" autocomplete="given-name" required maxlength="30" value="${esc((s.name || "").split(" ")[0] || "")}">
        <label for="signin-last">Last name</label>
        <input id="signin-last" autocomplete="family-name" required maxlength="30" value="${esc((s.name || "").split(" ").slice(1).join(" "))}">
        <label for="signin-group">Class or group <span class="signin-optional">(optional)</span></label>
        <input id="signin-group" maxlength="30" placeholder="e.g. Year 12 HL" value="${esc(s.group || "")}">
        <div class="signin-actions">
          <button type="submit" class="btn">Save my name</button>
          <button type="button" class="btn ghost" id="signin-skip">Not now</button>
        </div>
      </form>`;
    document.body.appendChild(wrap);
    document.getElementById("signin-first").focus();
    wrap.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const first = document.getElementById("signin-first").value.trim();
      const last = document.getElementById("signin-last").value.trim();
      if (!first || !last) return;
      const tidy = w => w.charAt(0).toUpperCase() + w.slice(1);
      set("ibbio-student", {name: tidy(first) + " " + tidy(last), group: document.getElementById("signin-group").value.trim()});
      wrap.remove();
      sendAll();
      renderStatus();
    });
    document.getElementById("signin-skip").addEventListener("click", () => { sessionStorageSet("ibbio-skip", "1"); wrap.remove(); });
  }
  function sessionStorageGet(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }
  function sessionStorageSet(k, v){ try { sessionStorage.setItem(k, v); } catch(e){} }

  /* "Signed in as" line, on the home page progress card */
  function renderStatus(){
    const el = document.getElementById("student-status");
    if (!el || !ENDPOINT) return;
    const s = get("ibbio-student");
    el.innerHTML = s
      ? `Signed in as <b>${esc(s.name)}</b>${s.group ? " (" + esc(s.group) + ")" : ""} · <button type="button" class="linkish" id="student-change">Change</button>`
      : `<button type="button" class="linkish" id="student-change">Add your name</button> so your teacher can see your progress.`;
    document.getElementById("student-change").onclick = () => showSignIn(true);
  }
  window.ibbioRenderStatus = renderStatus;

  function init(){ renderStatus(); showSignIn(false); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
