/* Sarrón Harfsterkamp — portfolio draft v0.2 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const touch = !fine && (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);
  if (touch) root.classList.add("touch");
  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const FAM = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
  const INK = "#202020", SIG = "#E86A33";

  /* ---------- one cursor everywhere ---------- */
  const cur = $(".cursor"), curT = $(".cursor__t");
  if (fine && cur) {
    root.classList.add("has-cursor");
    const HOT = "a, button, .frame, .lens__stack, [role=tab], .seq__track, .ctrl-cell, .show__p";
    addEventListener("mousemove", (e) => {
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      curT.textContent = `X ${String(e.clientX).padStart(4, "0")} · Y ${String(Math.round(e.pageY)).padStart(5, "0")}`;
      cur.classList.add("on");
      cur.classList.toggle("hot", !!(e.target.closest && e.target.closest(HOT)));
    }, { passive: true });
    root.addEventListener("mouseleave", () => cur.classList.remove("on"));
    addEventListener("mousedown", () => cur.classList.add("down"));
    addEventListener("mouseup", () => cur.classList.remove("down"));
  }

  /* ---------- keys: grid overlay (G), console (1–6), close lightbox ---------- */
  addEventListener("keydown", (e) => {
    if (root.classList.contains("is-intro")) return;
    if (e.key === "g" || e.key === "G") document.body.classList.toggle("show-grid");
    if (e.key === "Escape") closeLb();
  });

  /* ---------- bar: page number (home), active link, progress ---------- */
  const pageEl = $("#page"), bar = $(".bar");
  const navLinks = $$(".bar__nav a"), secs = $$("[data-label]");
  if (pageEl && secs.length) {
    const secObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = secs.indexOf(en.target);
        pageEl.textContent = `${pad2(i + 1)} / ${pad2(secs.length)}`;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => secObs.observe(s));
  }

  let ticking = false;
  const prog = () => {
    const max = root.scrollHeight - innerHeight;
    bar.style.setProperty("--prog", max > 0 ? (scrollY / max).toFixed(4) : 0);
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(prog); } }, { passive: true });
  prog();

  /* ---------- explore → discover → improve ticker ---------- */
  const steps = $$("#steps span");
  let si = 0;
  setInterval(() => { steps.forEach((s, i) => s.classList.toggle("on", i === si)); si = (si + 1) % steps.length; }, 1400);

  /* ---------- read-more toggles ---------- */
  $$(".more-btn").forEach((b) => {
    const panel = document.getElementById(b.getAttribute("aria-controls"));
    const lbl = $(".lbl", b), base = lbl.textContent;
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", open);
      panel.classList.toggle("open", open);
      lbl.textContent = open ? lbl.dataset.less || base : base;
    });
  });

  /* ---------- captions: number always, description on hover ---------- */
  $$(".fig figcaption").forEach((fc) => {
    const b = $("b", fc);
    if (!b || b !== fc.firstElementChild) return;
    const span = document.createElement("span");
    span.className = "cap-t";
    while (b.nextSibling) span.appendChild(b.nextSibling);
    fc.appendChild(span);
  });

  /* ---------- figures: blur reveal + lightbox ---------- */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -12% 0px" });
  $$(".fig").forEach((f) => revObs.observe(f));

  const lb = $("#lb"), lbImg = lb && $("img", lb), lbCap = $("#lbCap");
  function openLb(img, cap) { lbImg.src = img.currentSrc || img.src; lbCap.textContent = cap || ""; lb.classList.add("on"); }
  function closeLb() { if (lb) lb.classList.remove("on"); }
  if (lb) {
    lb.addEventListener("click", closeLb);
    $$(".fig .frame").forEach((fr) => fr.addEventListener("click", () => {
      const fc = $("figcaption", fr.closest(".fig"));
      openLb($("img", fr), fc ? fc.textContent.trim().replace(/\s+/g, " ") : "");
    }));
  }

  /* ---------- cover lens (blur → focus) ---------- */
  const lens = $("#lens");
  if (lens) {
    const stack = $(".lens__stack", lens);
    const setPos = (x, y) => { lens.style.setProperty("--x", x + "px"); lens.style.setProperty("--y", y + "px"); };
    if (!touch) {
      stack.addEventListener("mouseenter", () => lens.classList.add("on"));
      stack.addEventListener("mouseleave", () => lens.classList.remove("on"));
      stack.addEventListener("mousemove", (e) => {
        const r = stack.getBoundingClientRect();
        setPos(e.clientX - r.left, e.clientY - r.top);
      });
    } else {
      // touch: the focus slowly wanders over the photo; a touch moves it to the finger
      lens.classList.add("on");
      let held = 0, raf2;
      const wander = (now) => {
        const r = stack.getBoundingClientRect();
        if (now > held && r.width) {
          const t = now / 1000;
          setPos(r.width * (0.5 + 0.28 * Math.sin(t * 0.43)), r.height * (0.5 + 0.32 * Math.sin(t * 0.31 + 1.3)));
        }
        raf2 = requestAnimationFrame(wander);
      };
      if (!reduced) raf2 = requestAnimationFrame(wander);
      const follow = (e) => {
        const r = stack.getBoundingClientRect(), t = e.touches[0];
        setPos(t.clientX - r.left, t.clientY - r.top); held = performance.now() + 2500;
      };
      stack.addEventListener("touchstart", follow, { passive: true });
      stack.addEventListener("touchmove", follow, { passive: true });
    }
  }

  /* ---------- contents showcase: two photos per project, slow diffuse swap ---------- */
  const shows = $$(".show__p");
  if (shows.length) {
    const showEl = $(".show");
    shows.forEach((p) => {
      p.addEventListener("mouseenter", () => { if (touch) return; p.dataset.hold = "1"; p.classList.add("alt"); });
      p.addEventListener("mouseleave", () => { delete p.dataset.hold; });
      // touch on a wide screen: first tap opens the panel, second tap opens the project
      p.addEventListener("click", (e) => {
        if (!touch || innerWidth <= 900 || p.classList.contains("active")) return;
        e.preventDefault();
        shows.forEach((q) => { q.classList.toggle("active", q === p); delete q.dataset.hold; });
        showEl.classList.add("has-active");
        p.dataset.hold = "1"; p.classList.add("alt");
      });
      const tap = document.createElement("span");
      tap.className = "show__tap mono"; tap.textContent = "Tap again to open";
      p.appendChild(tap);
    });
    // touch on a phone: the panel in the middle of the carousel shows its second photo
    if (touch && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (innerWidth > 900) return;
        en.target.classList.toggle("alt", en.intersectionRatio > 0.75);
        en.target.dataset.hold = en.intersectionRatio > 0.75 ? "1" : "";
        if (!en.target.dataset.hold) delete en.target.dataset.hold;
      }), { root: showEl, threshold: [0, 0.75, 1] });
      shows.forEach((p) => io.observe(p));
    }
    let k = 0;
    setInterval(() => {
      const p = shows[k % shows.length];
      if (!p.dataset.hold) p.classList.toggle("alt");
      k++;
    }, 1700);
  }

  /* ---------- other work: sunflower-ordered photos in the page, never overlapping ---------- */
  const owF = $("#owField");
  if (owF) {
    const nodes = $$(".fig", owF);
    const AREA = 36000, GAP = 20, CAP = 22;
    const pack = (ratios) => {
      const GA = Math.PI * (3 - Math.sqrt(5)), c = Math.sqrt(AREA) * 0.62, sx = 1.5;
      const it = ratios.map((r, i) => {
        const w = Math.sqrt(AREA * r), h = w / r + CAP, rad = c * Math.sqrt(i + 0.5), a = i * GA;
        const tx = rad * Math.cos(a) * sx, ty = rad * Math.sin(a);
        return { w, h, tx, ty, x: tx, y: ty };
      });
      const sep = () => {
        let moved = false;
        for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) {
          const A = it[i], B = it[j];
          const dx = B.x - A.x || 0.01 * (j - i), dy = B.y - A.y || 0.01;
          const ox = (A.w + B.w) / 2 + GAP - Math.abs(dx), oy = (A.h + B.h) / 2 + GAP - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox < oy) { const m = ox / 2 * Math.sign(dx); A.x -= m; B.x += m; }
            else { const m = oy / 2 * Math.sign(dy); A.y -= m; B.y += m; }
          }
        }
        return moved;
      };
      for (let k = 0; k < 1200; k++) {
        sep();
        it.forEach((p) => { p.x += (p.tx - p.x) * 0.012; p.y += (p.ty - p.y) * 0.012; });
      }
      for (let k = 0; k < 400 && sep(); k++);
      const x0 = Math.min(...it.map((p) => p.x - p.w / 2)), x1 = Math.max(...it.map((p) => p.x + p.w / 2));
      const y0 = Math.min(...it.map((p) => p.y - p.h / 2)), y1 = Math.max(...it.map((p) => p.y + p.h / 2));
      return { it, x0, y0, bw: x1 - x0, bh: y1 - y0 };
    };
    let layout = null;
    const place = () => {
      const W = owF.clientWidth;
      if (W < 760) { owF.classList.add("stack"); owF.style.height = ""; nodes.forEach((n) => { n.style.width = ""; }); return; }
      owF.classList.remove("stack");
      if (!layout) layout = pack(nodes.map((n) => { const im = $("img", n); return im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1.3; }));
      const k = W / layout.bw;
      layout.it.forEach((p, i) => {
        const n = nodes[i];
        n.style.width = p.w * k + "px";
        n.style.left = (p.x - p.w / 2 - layout.x0) * k + "px";
        n.style.top = (p.y - p.h / 2 - layout.y0) * k + "px";
      });
      owF.style.height = layout.bh * k + "px";
    };
    Promise.all(nodes.map((n) => new Promise((resolve) => {
      const im = $("img", n);
      if (im.complete) return resolve();
      im.addEventListener("load", resolve, { once: true }); im.addEventListener("error", resolve, { once: true });
    }))).then(place);
    let owT;
    addEventListener("resize", () => { clearTimeout(owT); owT = setTimeout(place, 120); });
  }
  /* ---------- pixel sampling ---------- */
  function sample(W, H, cell, draw) {
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    o.fillStyle = "#000";
    o.textBaseline = "alphabetic";
    draw(o);
    const data = o.getImageData(0, 0, W, H).data, pts = [];
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const px = Math.min(W - 1, x + (cell >> 1)), py = Math.min(H - 1, y + (cell >> 1));
        if (data[(py * W + px) * 4 + 3] > 128) pts.push({ x, y });
      }
    }
    return pts;
  }

  /* ---------- pixel name on the cover (modules: chaos ↔ order) ---------- */
  const name = (() => {
    const cv = $("#pixelname");
    if (!cv) return null;
    const hero = $(".hero"), ctx = cv.getContext("2d");
    let W = 0, H = 0, cell = 8, parts = [], mx = -9999, my = -9999;
    let running = false, started = false, visible = true, raf;

    function build() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.round(cv.clientWidth); H = Math.round(cv.clientHeight);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.max(4, Math.round(W / 165));
      const pts = sample(W, H, cell, (o) => {
        const lines = ["SARRÓN", "HARFSTERKAMP"];
        o.font = `600 100px ${FAM}`;
        const w = Math.max(...lines.map((l) => o.measureText(l).width));
        const fs = Math.min((100 * (W * 0.985)) / w, H / 1.9);
        o.font = `600 ${fs}px ${FAM}`;
        const b2 = H - fs * 0.02, b1 = b2 - fs * 0.86;
        o.fillText(lines[0], 0, b1);
        o.fillText(lines[1], 0, b2);
      });
      const old = parts;
      parts = pts.map((p, i) => ({
        hx: p.x, hy: p.y,
        x: old[i] ? old[i].x : p.x, y: old[i] ? old[i].y : p.y,
        vx: 0, vy: 0,
        hollow: old[i] ? old[i].hollow : Math.random() < 0.035,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      const R = cell * 8, R2 = R * R, s = cell - 1;
      if (!reduced && Math.random() < 0.12) {
        const p = parts[(Math.random() * parts.length) | 0];
        if (p) { p.vx += (Math.random() - 0.5) * cell * 1.1; p.vy += (Math.random() - 0.5) * cell * 1.1; }
      }
      const hot = [];
      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      for (const p of parts) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 1.2;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx += (p.hx - p.x) * 0.025; p.vy += (p.hy - p.y) * 0.025;
        p.vx *= 0.84; p.vy *= 0.84;
        p.x += p.vx; p.y += p.vy;
        if (Math.abs(p.x - p.hx) + Math.abs(p.y - p.hy) > cell * 0.8) { hot.push(p); continue; }
        if (p.hollow) ctx.strokeRect(p.x + 0.5, p.y + 0.5, s - 1, s - 1);
        else ctx.fillRect(p.x, p.y, s, s);
      }
      ctx.fillStyle = SIG;
      for (const p of hot) ctx.fillRect(p.x, p.y, s, s);
      if (running) raf = requestAnimationFrame(frame);
    }

    function start() {
      started = true;
      if (!running && visible) { running = true; frame(); }
    }

    hero.addEventListener("mousemove", (e) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    hero.addEventListener("mouseleave", () => { mx = my = -9999; });
    hero.addEventListener("click", (e) => {
      if (touch || e.target.closest("a, button, .lens")) return;
      for (const p of parts) { p.vx += (Math.random() - 0.5) * cell * 5; p.vy += (Math.random() - 0.5) * cell * 5; }
    });

    // touch: the finger acts as the cursor, a tap pushes the modules locally
    const burst = (x, y) => {
      const R = cell * 14;
      for (const p of parts) {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < R) { const f = (1 - d / R) * cell * 2.4; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      }
    };
    const tpos = (e) => { const r = cv.getBoundingClientRect(), t = e.touches[0]; return [t.clientX - r.left, t.clientY - r.top]; };
    hero.addEventListener("touchstart", (e) => {
      if (e.target.closest("a, button, .lens")) return;
      const [x, y] = tpos(e); mx = x; my = y; burst(x, y); sweepUntil = performance.now() + 6000;
    }, { passive: true });
    hero.addEventListener("touchmove", (e) => { const [x, y] = tpos(e); mx = x; my = y; }, { passive: true });
    hero.addEventListener("touchend", () => { mx = my = -9999; }, { passive: true });

    // touch: a slow invisible "finger" sweeps through the name now and then
    let sweepUntil = 0;
    if (touch && !reduced) {
      const sweep = () => {
        if (running && performance.now() > sweepUntil) {
          const t0 = performance.now(), y0 = H * (0.25 + Math.random() * 0.5), dir = Math.random() < 0.5 ? 1 : -1;
          const step = (now) => {
            const k = (now - t0) / 2600;
            if (k > 1 || performance.now() < sweepUntil) { if (performance.now() >= sweepUntil) mx = my = -9999; return; }
            mx = dir > 0 ? k * W : (1 - k) * W; my = y0 + Math.sin(k * Math.PI * 2) * H * 0.15;
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
        setTimeout(sweep, 5200);
      };
      setTimeout(sweep, 1800);
    }

    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (!started) return;
      if (visible && !running) { running = true; frame(); }
      else if (!visible) { running = false; cancelAnimationFrame(raf); }
    }).observe(hero);

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 150); });

    return { cv, build, start, get parts() { return parts; }, get cell() { return cell; } };
  })();

  /* ---------- opening animation: full-screen phyllotaxis field → name ---------- */
  function endIntro() {
    root.classList.remove("intro-hold", "is-intro");
  }

  function runIntro() {
    const el = $("#intro");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);

    const cv = $(".intro__cv", el), ctx = cv.getContext("2d");
    const bg = $(".intro__bg", el), ui = $(".intro__ui", el);
    const pctEl = $("#introPct"), stepEl = $("#introStep");
    const W = root.clientWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = name.cell, s = cell - 1;
    const byX = (a, b) => a.x - b.x || a.y - b.y;
    const easeS = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
    const r = name.cv.getBoundingClientRect();
    const N = name.parts.map((p, j) => ({ x: r.left + p.hx, y: r.top + p.hy, j })).sort(byX);

    // full-screen phyllotaxis field
    const P = N.length;
    const cx = W / 2 - s / 2, cy = H / 2 - s / 2, R = Math.hypot(W, H) / 2 + cell;
    const M = Math.min(16000, Math.max(Math.round(P * 1.2), Math.round((Math.PI * R * R) / (cell * 1.7) ** 2)));
    const field = [];
    for (let k = 0; k < M; k++) {
      const rr = R * Math.sqrt((k + 0.5) / M), th = k * 2.39996323;
      const x = cx + rr * Math.cos(th), y = cy + rr * Math.sin(th);
      field.push({ x, y, on: x > -cell && x < W && y > -cell && y < H });
    }
    const visible = field.filter((f) => f.on).sort(byX);
    const pool = visible.length >= P ? visible : field.slice().sort(byX);
    const used = new Set();
    const parts = [];
    for (let i = 0; i < P; i++) {
      const a = pool[Math.floor((i * pool.length) / P)], c = N[i];
      used.add(a);
      parts.push({ a, c, t3: 800 + (c.x / W) * 500 + Math.random() * 40, hollow: name.parts[c.j].hollow });
    }
    const extras = field.filter((f) => !used.has(f)).map((f) => ({ a: f, tx: 480 + clamp01(f.x / W) * 620 + Math.random() * 60 }));

    const END = 2600, MORPH = 1200;
    const t0 = performance.now();
    let done = false;

    function draw(now) {
      if (done) return;
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = easeOut(clamp01(t / 220));

      // the field slowly turns while it is "explored"
      const th = -0.18 * easeS(clamp01(t / 1500)), co = Math.cos(th), si = Math.sin(th);
      const rx = (q) => cx + (q.x - cx) * co - (q.y - cy) * si;
      const ry = (q) => cy + (q.x - cx) * si + (q.y - cy) * co;

      ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const e of extras) {
        const g = 1 - easeS(clamp01((t - e.tx) / 700));
        if (g <= 0) continue;
        const z = s * g, x = rx(e.a), y = ry(e.a);
        if (x < -cell || x > W || y < -cell || y > H) continue;
        ctx.rect(x + (s - z) / 2, y + (s - z) / 2, z, z);
      }
      ctx.fill();

      for (const p of parts) {
        const e3 = clamp01((t - p.t3) / MORPH);
        let x = rx(p.a), y = ry(p.a);
        if (e3 > 0) { const k = easeS(e3); x += (p.c.x - x) * k; y += (p.c.y - y) * k; }
        if (e3 >= 1 && p.hollow) ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
        else ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;

      pctEl.textContent = String(Math.min(100, Math.floor((t / 2500) * 100))).padStart(3, "0");
      stepEl.textContent = t < 800 ? "01 Explore" : t < 1500 ? "02 Discover" : "03 Improve";
      ui.style.opacity = 1 - clamp01((t - 1800) / 400);
      bg.style.opacity = 1 - easeS(clamp01((t - 1850) / 750));
      if (t > 1850) root.classList.remove("intro-hold");

      if (t >= END) {
        done = true;
        name.start();
        requestAnimationFrame(() => endIntro());
        return;
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  const fontsReady = document.fonts
    ? Promise.race([document.fonts.load(`600 100px "Inter Tight"`).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 1800))])
    : Promise.resolve();
  fontsReady.catch(() => {}).then(() => {
    if (!name) { endIntro(); return; }
    name.build();
    if (root.classList.contains("is-intro")) runIntro();
    else name.start();
  });

  /* ---------- P01 interactive sketch: 21 buttons → 21 tilting mirrors (Voronoi) ---------- */
  const ctrlSvg = $("#ctrl"), mirSvg = $("#mirrors");
  if (ctrlSvg && mirSvg) {
    const NS = "http://www.w3.org/2000/svg";
    const N = 21, GHOST = 16, SC = 10, GA = 2.39996323, BOX = 90;
    const mk = (tag, attrs, parent) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      parent.appendChild(el);
      return el;
    };
    const pts = (arr) => arr.map((v) => v.x.toFixed(2) + "," + v.y.toFixed(2)).join(" ");

    // phyllotaxis seeds; the outer ring of ghost seeds shapes the star outline but is not drawn
    const seeds = [];
    for (let k = 0; k < N + GHOST; k++) {
      const r = SC * Math.sqrt(k + 0.5), th = k * GA;
      seeds.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
    }
    const clip = (poly, nx, ny, d) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length];
        const da = nx * A.x + ny * A.y - d, db = nx * B.x + ny * B.y - d;
        if (da <= 0) out.push(A);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          const t = da / (da - db);
          out.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
        }
      }
      return out;
    };
    const cells = [];
    for (let j = 0; j < N; j++) {
      const p = seeds[j];
      let poly = [{ x: -BOX, y: -BOX }, { x: BOX, y: -BOX }, { x: BOX, y: BOX }, { x: -BOX, y: BOX }];
      const planes = [];
      seeds.forEach((q, k) => {
        if (k === j) return;
        const nx = q.x - p.x, ny = q.y - p.y, d = (nx * (p.x + q.x) + ny * (p.y + q.y)) / 2;
        planes.push({ k, nx, ny, d });
        poly = clip(poly, nx, ny, d);
      });
      let A = 0, cx = 0, cy = 0;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], cr = a.x * b.y - b.x * a.y;
        A += cr; cx += (a.x + b.x) * cr; cy += (a.y + b.y) * cr;
      }
      cx /= 3 * A; cy /= 3 * A;
      const nb = planes.filter((pl) => pl.k < N && poly.filter((v) => Math.abs(pl.nx * v.x + pl.ny * v.y - pl.d) / Math.hypot(pl.nx, pl.ny) < 0.01).length >= 2).map((pl) => pl.k);
      cells.push({ poly, cx, cy, nb });
    }
    const inset = (c, f) => c.poly.map((v) => ({ x: c.cx + (v.x - c.cx) * f, y: c.cy + (v.y - c.cy) * f }));

    // control side
    const pressed = new Array(N).fill(false);
    const btns = cells.map((c, j) => {
      const el = mk("polygon", { points: pts(inset(c, 0.93)), class: "ctrl-cell", role: "button", tabindex: "0", "aria-pressed": "false", "aria-label": "Button " + pad2(j + 1) }, ctrlSvg);
      const num = mk("text", { x: c.cx.toFixed(2), y: c.cy.toFixed(2), class: "ctrl-num" }, ctrlSvg);
      num.textContent = pad2(j + 1);
      const toggle = () => { pressed[j] = !pressed[j]; sync(); };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      return { el, num };
    });

    // output side: projected, tilting plates over a flat frame
    const V = 0.62, F = 260;
    const project = (X, Y, Z) => {
      const yv = Y * Math.cos(V) - Z * Math.sin(V), zv = Y * Math.sin(V) + Z * Math.cos(V), k = F / (F - zv);
      return { x: X * k, y: yv * k };
    };
    const order = cells.map((c, j) => j).sort((a, b) => cells[a].cy - cells[b].cy);
    order.forEach((j) => mk("polygon", { points: pts(cells[j].poly.map((v) => project(v.x, v.y, 0))), class: "mir-frame" }, mirSvg));
    const mirEls = [];
    order.forEach((j) => { mirEls[j] = mk("polygon", { class: "mir" }, mirSvg); });
    const plates = cells.map((c) => inset(c, 0.86).map((v) => ({ dx: v.x - c.cx, dy: v.y - c.cy })));

    // tilt model: a pressed button turns its mirror towards the light, its neighbours are pushed away
    const REST = { a: -0.12, b: 0.1 }, AIM = { a: 0.5, b: -0.36 };
    const tgt = cells.map(() => ({ ...REST })), cur = cells.map(() => ({ ...REST }));
    const phase = cells.map(() => ({ p: Math.random() * 6.28, q: Math.random() * 6.28, s: 0.7 + Math.random() * 0.8 }));
    let flux = false;

    function sync() {
      cells.forEach((c, j) => { tgt[j].a = REST.a; tgt[j].b = REST.b; });
      cells.forEach((c, i) => {
        if (!pressed[i]) return;
        tgt[i].a += AIM.a - REST.a; tgt[i].b += AIM.b - REST.b;
        c.nb.forEach((k) => {
          const dx = cells[k].cx - c.cx, dy = cells[k].cy - c.cy, l = Math.hypot(dx, dy) || 1;
          tgt[k].a += 0.2 * (dy / l); tgt[k].b += 0.2 * (dx / l);
        });
      });
      tgt.forEach((t) => { t.a = Math.max(-0.9, Math.min(0.9, t.a)); t.b = Math.max(-0.9, Math.min(0.9, t.b)); });
      btns.forEach((b, j) => { b.el.setAttribute("aria-pressed", pressed[j]); b.num.classList.toggle("on", pressed[j]); });
      $("#vIn").textContent = pad2(pressed.filter(Boolean).length);
      wake();
    }

    let running = false, visible = false, still = 0;
    function step(now) {
      let lit = 0, moving = 0;
      cells.forEach((c, j) => {
        let ta = tgt[j].a, tb = tgt[j].b;
        if (flux) { const ph = phase[j]; ta += 0.42 * Math.sin(now * 0.0011 * ph.s + ph.p); tb += 0.42 * Math.cos(now * 0.0009 * ph.s + ph.q); }
        const k = reduced ? 1 : 0.085;
        cur[j].a += (ta - cur[j].a) * k; cur[j].b += (tb - cur[j].b) * k;
        moving += Math.abs(ta - cur[j].a) + Math.abs(tb - cur[j].b);
        const a = cur[j].a, b = cur[j].b, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        const poly = plates[j].map((v) => {
          const x1 = v.dx * cb, z1 = -v.dx * sb, y1 = v.dy;
          return project(c.cx + x1, c.cy + y1 * ca - z1 * sa, y1 * sa + z1 * ca);
        });
        const s = Math.exp(-((a - AIM.a) ** 2 + (b - AIM.b) ** 2) / 0.14);
        const g = 0.07 + 0.14 * clamp01(0.5 + a * 0.7 - b * 0.5);
        const v = g + (1 - g) * s;
        const col = [38 + 209 * v, 38 + 205 * v, 37 + 197 * v].map((n) => Math.round(n));
        const el = mirEls[j];
        el.setAttribute("points", pts(poly));
        el.setAttribute("fill", `rgb(${col})`);
        el.classList.toggle("lit", s > 0.55);
        if (s > 0.55) lit++;
      });
      $("#vOut").textContent = pad2(lit);
      still = moving < 0.002 && !flux ? still + 1 : 0;
      if (running && visible && still < 3) requestAnimationFrame(step);
      else running = false;
    }
    function wake() {
      still = 0;
      if (!running && visible) { running = true; requestAnimationFrame(step); }
    }

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe($(".console"));

    const fluxBtn = $("#flux");
    fluxBtn.addEventListener("click", () => {
      flux = !flux;
      fluxBtn.setAttribute("aria-pressed", flux);
      wake();
    });
    $("#reset").addEventListener("click", () => { pressed.fill(false); sync(); });

    [2, 7, 10, 15, 18].forEach((i) => { pressed[i] = true; });
    sync();
    cur.forEach((c, j) => { c.a = tgt[j].a; c.b = tgt[j].b; });
    step(performance.now());
  }

  /* ---------- P02 scale switch ---------- */
  const scale = $("#scale");
  if (scale) {
    const tabs = $$("[role=tab]", scale), imgs = $$(".scale__view img", scale), label = $("#scaleLabel");
    const names = ["Render · ×1 module", "Render · ×7 cluster", "Render · ×n chain", "AI visual based on a render · in space"];
    const go = (i) => {
      tabs.forEach((t, k) => t.setAttribute("aria-selected", k === i));
      imgs.forEach((im, k) => im.classList.toggle("on", k === i));
      label.textContent = `Fig. 02.R${i + 1} — ${names[i]}`;
    };
    let i = 0;
    const auto = setInterval(() => go((i = (i + 1) % tabs.length)), 3200);
    tabs.forEach((t) => t.addEventListener("click", () => { clearInterval(auto); go(+t.dataset.i); }));
  }
})();
