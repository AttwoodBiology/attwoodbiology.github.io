/* AttwoodBiology — animated DNA helix and drifting cells for the page header.
   Draws into every <canvas class="helix">, using the page's --glow colour. */
(function(){
  const reduce = true; // still image: the helix and cells do not move
  const FRONT = "#b9f2c8"; // light green for the strands nearest the viewer
  document.querySelectorAll("canvas.helix").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, cells = [];
    let glow = "#5fe0c8";

    function size(){
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells = Array.from({length: Math.round(w / 90)}, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 10 + Math.random() * 34, n: 0.25 + Math.random() * 0.35,
        vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12
      }));
    }

    function fadeAt(x){ // keep the left side calm so text stays readable
      const t = (x / w - 0.28) / 0.4;
      return Math.max(0.08, Math.min(1, t));
    }

    function frame(t){
      glow = (getComputedStyle(canvas).getPropertyValue("--glow") || glow).trim();
      ctx.clearRect(0, 0, w, h);
      // drifting cells with nuclei
      cells.forEach(c => {
        if (!reduce){ c.x += c.vx; c.y += c.vy;
          if (c.x < -50) c.x = w + 50; if (c.x > w + 50) c.x = -50;
          if (c.y < -50) c.y = h + 50; if (c.y > h + 50) c.y = -50; }
        ctx.globalAlpha = 0.10 * fadeAt(c.x) + 0.04;
        ctx.strokeStyle = glow; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(c.x + c.r * .2, c.y - c.r * .1, c.r * c.n, 0, Math.PI * 2); ctx.fill();
      });

      // double helix across the header
      const phase = reduce ? 0 : t * 0.0006;
      const cy = h * 0.52, amp = Math.min(h * 0.26, 80), k = (Math.PI * 2) / 300;
      const yAt = (x, off) => cy + amp * Math.sin(k * x + phase + off);
      const zAt = (x, off) => (Math.cos(k * x + phase + off) + 1) / 2;
      // base-pair rungs, two-tone like complementary bases
      for (let x = 0; x < w; x += 24){
        const y1 = yAt(x, 0), y2 = yAt(x, Math.PI), m = (y1 + y2) / 2, f = fadeAt(x);
        ctx.lineWidth = 2.5; ctx.lineCap = "round";
        ctx.globalAlpha = 0.32 * f; ctx.strokeStyle = glow;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, m); ctx.stroke();
        ctx.globalAlpha = 0.24 * f; ctx.strokeStyle = FRONT;
        ctx.beginPath(); ctx.moveTo(x, m); ctx.lineTo(x, y2); ctx.stroke();
      }
      // sugar-phosphate backbones: continuous ribbons, thicker and brighter in front
      [0, Math.PI].forEach(off => {
        for (let x = 0; x < w; x += 4){
          const d = zAt(x, off), f = fadeAt(x);
          ctx.globalAlpha = (0.15 + 0.6 * d) * f;
          ctx.strokeStyle = d > 0.55 ? FRONT : glow;
          ctx.lineWidth = 1.5 + 4 * d;
          ctx.beginPath(); ctx.moveTo(x, yAt(x, off)); ctx.lineTo(x + 4.5, yAt(x + 4.5, off)); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(frame);
    }

    size();
    window.addEventListener("resize", () => { size(); if (reduce) frame(0); });
    requestAnimationFrame(frame);
  });
})();
