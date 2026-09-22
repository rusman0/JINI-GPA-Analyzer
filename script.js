/* ==================================================================
   Smoke intro
================================================================== */
(function smokeIntro() {
  const root = document.documentElement;
  const canvas = document.getElementById("smokeCanvas");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function blockTouch(e) {
    if (root.classList.contains("intro-on")) {
      e.preventDefault();
    }
  }
  document.addEventListener("touchmove", blockTouch, { passive: false });

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    root.classList.remove("intro-on");
    document.removeEventListener("touchmove", blockTouch);
  }
  if (!canvas || !canvas.getContext || reduce) {
    finish();
    if (canvas) canvas.remove();
    return;
  }
  const ctx = canvas.getContext("2d");

  const DURATION = 6200;
  const FADE_OUT = 1300;
  const SCALE = 0.6;
  const BASE = 40;
  const DENS = 0.55;
  const COVER = "255,255,255";
  const PALETTE = [
    [21, 135, 240],
    [64, 166, 255],
    [120, 192, 255],
    [10, 105, 205],
    [170, 214, 255],
  ];

  let W = 0,
    H = 0,
    soft = 320;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.ceil(W * SCALE);
    canvas.height = Math.ceil(H * SCALE);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    soft = Math.max(260, Math.min(H * 0.38, 440));
  }
  resize();
  window.addEventListener("resize", resize);

  function makeSprite(rgb) {
    const S = 192,
      s = document.createElement("canvas");
    s.width = s.height = S;
    const c = s.getContext("2d"),
      col = rgb.join(",");
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * 6.283,
        d = Math.random() * S * 0.14;
      const x = S / 2 + Math.cos(a) * d,
        y = S / 2 + Math.sin(a) * d;
      const r = S * (0.2 + Math.random() * 0.16);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col},0.36)`);
      g.addColorStop(0.5, `rgba(${col},0.16)`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    }
    return s;
  }
  const sprites = [];
  PALETTE.forEach((rgb) => {
    sprites.push(makeSprite(rgb), makeSprite(rgb));
  });
  const puffs = [];
  const rnd = Math.random;

  function spawn(front, prog) {
    const k = Math.min(1.3, Math.max(0.7, W / 1000));
    const band = Math.min(soft * 0.9, front + 70);
    puffs.push({
      x: rnd() * (W + 240) - 120,
      y: front + 30 - rnd() * band,
      vy: 22 + rnd() * 30,
      sway: 6 + rnd() * 14,
      phase: rnd() * 6.28,
      r: (110 + rnd() * 110) * k,
      grow: 5 + rnd() * 7,
      rot: rnd() * 6.28,
      spin: (rnd() - 0.5) * 0.25,
      life: 1.8 + rnd() * 1.2,
      age: 0,
      peak: (0.4 + rnd() * 0.3) * (1 - 0.15 * prog),
      sprite: sprites[(rnd() * sprites.length) | 0],
    });
  }

  /* Intro voice and mute button */
  const audio = new Audio("Laugh.mp3");
  audio.preload = "auto";
  const ON =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  const OFF =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  let soundBtn = null;

  function addSoundButton() {
    soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "sound-btn";
    soundBtn.setAttribute("aria-label", "Mute or unmute intro sound");
    soundBtn.innerHTML = audio.muted ? OFF : ON;
    soundBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;
      soundBtn.innerHTML = audio.muted ? OFF : ON;
    });
    document.body.appendChild(soundBtn);
  }

  const LAMP_SVG =
    '<img class="lamp" src="lamp.png" alt="" width="260" draggable="false">';

  /* Shown when the browser blocks autoplay; a click provides the user gesture. */
  function showLamp(onGo) {
    const gate = document.createElement("div");
    gate.className = "intro-gate";
    gate.innerHTML =
      '<button type="button" class="lamp-btn" aria-label="Rub the lamp to begin">' +
      '<span class="lamp-ring"></span>' +
      LAMP_SVG +
      '<span class="wisp w1"></span><span class="wisp w2"></span><span class="wisp w3"></span></button>' +
      '<p class="gate-hint">Rub the lamp</p>';
    document.body.appendChild(gate);
    gate.querySelector("button").addEventListener(
      "click",
      () => {
        onGo();
        gate.classList.add("rubbing");
        setTimeout(() => gate.classList.add("hide"), 450);
        setTimeout(() => gate.remove(), 1300);
      },
      { once: true },
    );
  }

  function cleanupAudio() {
    if (soundBtn) soundBtn.remove();
  }

  /* Lightning synced to the voice (t = seconds into Laugh.mp3) */
  const LIGHTNING = [
    { t: 2.68, power: 0.45 },
    { t: 2.85, power: 0.55 },
    { t: 3.05, power: 0.6 },
    { t: 3.25, power: 1 },
    { t: 3.45, power: 0.75 },
  ];
  const bolts = [];

  /* Recursive midpoint displacement produces the jagged bolt path. */
  function jag(x1, y1, x2, y2, d, out) {
    if (d < 5) {
      out.push([x2, y2]);
      return;
    }
    const mx = (x1 + x2) / 2 + (rnd() - 0.5) * d;
    const my = (y1 + y2) / 2 + (rnd() - 0.5) * d * 0.35;
    jag(x1, y1, mx, my, d / 2, out);
    jag(mx, my, x2, y2, d / 2, out);
  }
  function makeBolt(power) {
    const x1 = W * (0.2 + rnd() * 0.6),
      y1 = -10;
    const x2 = x1 + (rnd() - 0.5) * W * 0.25,
      y2 = H * (0.4 + 0.35 * power);
    const main = [[x1, y1]];
    jag(x1, y1, x2, y2, H * 0.22, main);
    const paths = [main];
    const nb = Math.round(2 + 4 * power);
    for (let i = 0; i < nb; i++) {
      const st = main[Math.floor((0.15 + rnd() * 0.7) * main.length)];
      const dir = rnd() < 0.5 ? -1 : 1;
      const ex = st[0] + dir * (60 + rnd() * 140) * (0.6 + power * 0.6);
      const ey = st[1] + (60 + rnd() * 160) * (0.6 + power * 0.5);
      const br = [[st[0], st[1]]];
      jag(st[0], st[1], ex, ey, 60, br);
      paths.push(br);
    }
    bolts.push({ paths, age: 0, life: 0.32 + 0.25 * power, power });
  }
  function drawBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.age += dt;
      if (b.age >= b.life) {
        bolts.splice(i, 1);
        continue;
      }
      const I = (1 - b.age / b.life) * (Math.sin(b.age * 65) > -0.35 ? 1 : 0.3);
      ctx.fillStyle = `rgba(21,135,240,${0.2 * b.power * I})`;
      ctx.fillRect(0, 0, W, H);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = `rgba(64,166,255,${I})`;
      ctx.shadowBlur = 8 + 28 * b.power;
      b.paths.forEach((pts, pi) => {
        const w = (pi === 0 ? 4.5 : 2.4) * (0.7 + b.power * 0.6);
        ctx.beginPath();
        pts.forEach((pt, j) =>
          j ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]),
        );
        ctx.strokeStyle = `rgba(21,135,240,${0.9 * I})`;
        ctx.lineWidth = w;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${I})`;
        ctx.lineWidth = w * 0.4;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
  }

  /* Smoke animation loop */
  let start = null,
    last = 0,
    acc = 0,
    prevFront = null,
    endedAt = null,
    painted = false;

  function frame(now) {
    if (start === null) start = last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const p = Math.min(1, (now - start) / DURATION);
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * p);
    const front = (0.5 * p + 0.5 * ease) * (H + soft);
    if (prevFront === null) prevFront = front;
    const dist = Math.max(0, front - prevFront);
    prevFront = front;
    const trail = soft * 1.1;

    /* Use the audio clock when available so lightning stays in sync. */
    const clock =
      audio.readyState > 1 && !audio.paused && !audio.error
        ? audio.currentTime
        : (now - start) / 1000;
    LIGHTNING.forEach((st) => {
      if (!st.done && clock >= st.t) {
        st.done = true;
        if (clock - st.t < 0.6) makeBolt(st.power);
      }
    });

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (p < 1) {
      const g = ctx.createLinearGradient(0, front - soft, 0, front);
      g.addColorStop(0, `rgba(${COVER},0)`);
      g.addColorStop(0.15, `rgba(${COVER},0.03)`);
      g.addColorStop(0.3, `rgba(${COVER},0.12)`);
      g.addColorStop(0.45, `rgba(${COVER},0.3)`);
      g.addColorStop(0.6, `rgba(${COVER},0.55)`);
      g.addColorStop(0.75, `rgba(${COVER},0.8)`);
      g.addColorStop(0.9, `rgba(${COVER},0.96)`);
      g.addColorStop(1, `rgba(${COVER},1)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      acc += dt * BASE + dist * DENS;
      while (acc >= 1) {
        spawn(front, p);
        acc -= 1;
      }
    }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const q = puffs[i];
      q.age += dt;
      const t = q.age / q.life;
      if (t >= 1) {
        puffs.splice(i, 1);
        continue;
      }
      q.y += q.vy * dt;
      q.x += Math.sin(q.age * 0.9 + q.phase) * q.sway * dt;
      q.r += q.grow * dt;
      const a = q.rot + q.spin * q.age,
        c = Math.cos(a) * SCALE,
        s = Math.sin(a) * SCALE;
      ctx.setTransform(c, s, -s, c, q.x * SCALE, q.y * SCALE);
      const f = Math.max(0, Math.min(1, 1 - (front - q.y) / trail));
      const fade = f * f * (3 - 2 * f);
      ctx.globalAlpha = Math.pow(Math.sin(Math.PI * t), 1.2) * q.peak * fade;
      ctx.drawImage(q.sprite, -q.r, -q.r, q.r * 2, q.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawBolts(dt);

    if (!painted) {
      painted = true;
      canvas.style.background = "transparent";
    }

    if (p >= 1 && endedAt === null) {
      endedAt = now;
      finish();
      canvas.classList.add("fade-out");
    }
    if (endedAt !== null && now - endedAt > FADE_OUT) {
      window.removeEventListener("resize", resize);
      canvas.remove();
      cleanupAudio();
      return;
    }
    requestAnimationFrame(frame);
  }

  let introStarted = false;
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    addSoundButton();
    requestAnimationFrame(frame);
    /* Failsafe: always remove the intro even if the animation stalls. */
    setTimeout(() => {
      finish();
      if (canvas.isConnected) canvas.remove();
      cleanupAudio();
    }, DURATION + 5000);
  }

  /* Phones and tablets have a coarse pointer. */
  const isPhone = window.matchMedia("(pointer: coarse)").matches;

  function begin() {
    /* Phones: always ask for a tap, so the sound is guaranteed to play. */
    if (isPhone) {
      showLamp(() => {
        /* Start the smoke only once the audio really plays, so lightning stays in sync. */
        audio.addEventListener("playing", startIntro, { once: true });
        setTimeout(startIntro, 2500); // never wait forever
        const p = audio.play();
        if (p && p.catch) p.catch(startIntro);
      });
      return;
    }

    /* Laptop: try autoplay first, fall back to the lamp if blocked. */
    let p;
    try {
      p = audio.play();
    } catch (e) {
      p = null;
    }
    if (p && p.then) {
      p.then(startIntro).catch((err) => {
        if (err && err.name === "NotAllowedError") {
          showLamp(() => {
            try {
              audio.currentTime = 0;
            } catch (e) {}
            audio.play().catch(() => {});
            startIntro();
          });
        } else {
          startIntro();
        }
      });
    } else {
      startIntro();
    }
  }

  /* Wait for fonts, but never longer than 900 ms. */
  Promise.race([
    (document.fonts && document.fonts.ready) || Promise.resolve(),
    new Promise((r) => setTimeout(r, 900)),
  ]).then(begin);
})();

/* ==================================================================
   Reaction video card
================================================================== */
const reactionVideoState = (function () {
  const video = document.getElementById("reactionVideo");
  const card = document.getElementById("videoCard");
  const handle = document.getElementById("videoDragHandle");
  if (!video || !card) return {};

  const VIDEO_FOLDER = "Videos/";
  const DEFAULT_SRC = VIDEO_FOLDER + "Default.mp4";
  let stage = "default"; // "default" | "reaction"

  /* Reaction clips per tier (minimum GPA in comments) */
  const REACTIONS = {
    great: ["Reaction1.mp4", "Reaction1.2.mp4"], // 3.8+
    vgood: ["Reaction2.mp4"], // 3.5+
    good: ["Reaction3.mp4"], // 3.0+
    avg: ["Reaction4.mp4"], // 2.5+
    okay: ["Reaction5.mp4", "Reaction5.1.mp4"], // 2.0+
    low: ["Last.mp4"], // below 2.0
  };

  /* Sound toggle */
  const soundBtn = document.getElementById("videoSoundBtn");
  const ICON_ON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
  const ICON_OFF =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  let soundOn = true;
  let current = null; // reaction layer currently shown (null when default is showing)
  function renderSound() {
    if (soundBtn) soundBtn.innerHTML = soundOn ? ICON_ON : ICON_OFF;
  }
  renderSound();
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      video.muted = true; // the default loop is always muted
      if (current) current.muted = !soundOn;
      renderSound();
    });
  }

  /* Desktop: one preloaded layer per clip (instant playback, unchanged behaviour).
     Phone: ONE shared layer plus background prefetch, because phones cannot
     buffer or decode many <video> elements at once. */
  const IS_PHONE = window.matchMedia("(pointer: coarse)").matches;
  const layers = {};
  const cache = {}; // phone only: file -> blob URL
  let sharedLayer = null;
  let stallTimer = null;

  function makeLayer() {
    const v = document.createElement("video");
    v.className = "layer";
    v.preload = "auto";
    v.muted = true;
    v.loop = false;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("disablepictureinpicture", "");
    v.addEventListener("ended", () => {
      if (current === v) goToDefault();
    });
    v.addEventListener("error", () => {
      if (current === v) goToDefault();
    });
    card.appendChild(v);
    return v;
  }

  const allFiles = Object.values(REACTIONS).flat();

  if (IS_PHONE) {
    sharedLayer = makeLayer();

    /* Download the clips one by one in the background, then play them from memory.
       If a clip is not ready yet (or fetch fails), the direct URL is used instead. */
    const prefetchAll = function () {
      const c = navigator.connection;
      if (c && c.saveData) return; // respect Data Saver
      let i = 0;
      (function next() {
        if (i >= allFiles.length) return;
        const file = allFiles[i++];
        fetch(VIDEO_FOLDER + file)
          .then((r) => (r.ok ? r.blob() : Promise.reject()))
          .then((b) => {
            cache[file] = URL.createObjectURL(b);
          })
          .catch(() => {})
          .then(next);
      })();
    };
    setTimeout(prefetchAll, 2000);
  } else {
    allFiles.forEach((file) => {
      const v = makeLayer();
      v.src = VIDEO_FOLDER + file;
      layers[file] = v;
    });
  }

  function goToDefault() {
    stage = "default";
    clearTimeout(stallTimer);
    if (current) {
      const old = current;
      current = null;
      old.classList.remove("on");
      setTimeout(() => {
        if (current !== old) {
          old.pause();
          if (!IS_PHONE) old.currentTime = 0;
        }
      }, 200);
    }
    video.muted = true;
    video.play().catch(() => {});
  }

  function playTier(videoKey) {
    const list = REACTIONS[videoKey];
    if (!list || !list.length) return goToDefault();
    const file = list[Math.floor(Math.random() * list.length)];
    const v = IS_PHONE ? sharedLayer : layers[file];

    if (current && current !== v) {
      current.pause();
      current.classList.remove("on");
    }
    current = v;
    stage = "reaction";
    v.muted = !soundOn;

    if (IS_PHONE) {
      v.classList.remove("on");
      v.src = cache[file] || VIDEO_FOLDER + file;
    } else {
      v.currentTime = 0;
    }

    /* Reveal the layer only once it is playing to avoid a blank frame. */
    v.addEventListener(
      "playing",
      () => {
        if (current === v) v.classList.add("on");
      },
      { once: true },
    );
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });

    /* Phone only: if it has not started within 6 s, fall back to the default loop. */
    if (IS_PHONE) {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (current === v && !v.classList.contains("on")) goToDefault();
      }, 6000);
    }
  }

  /* Phone only: keep the default loop alive (Low Power Mode, tab switches, etc.) */
  if (IS_PHONE) {
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    const kick = function () {
      if (stage === "default" && video.paused) video.play().catch(() => {});
    };
    video.addEventListener("pause", () => setTimeout(kick, 150));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) kick();
    });
    ["pointerdown", "touchstart"].forEach((ev) =>
      document.addEventListener(ev, kick, { passive: true }),
    );
  }

  /* Drag support on small screens */
  const MOBILE_QUERY = window.matchMedia("(max-width: 800px)");
  let dragEnabled = false;
  let dragging = false;
  let offsetX = 0,
    offsetY = 0;

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function placeDefault() {
    const rect = card.getBoundingClientRect();
    const left = clamp(
      window.innerWidth - rect.width - 14,
      8,
      window.innerWidth - rect.width - 8,
    );
    card.style.left = left + "px";
    card.style.top = "78px";
  }

  function onPointerDown(e) {
    if (!dragEnabled) return;
    if (e.target.closest && e.target.closest(".video-sound")) return;
    dragging = true;
    card.classList.add("dragging");
    const rect = card.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    card.setPointerCapture && card.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const rect = card.getBoundingClientRect();
    const left = clamp(
      e.clientX - offsetX,
      4,
      window.innerWidth - rect.width - 4,
    );
    const top = clamp(
      e.clientY - offsetY,
      4,
      window.innerHeight - rect.height - 4,
    );
    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    card.classList.remove("dragging");
    card.releasePointerCapture && card.releasePointerCapture(e.pointerId);
  }

  card.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  function syncDragMode() {
    const shouldEnable = MOBILE_QUERY.matches;
    if (shouldEnable === dragEnabled) return;
    dragEnabled = shouldEnable;
    if (dragEnabled) {
      card.classList.add("draggable");
      placeDefault();
    } else {
      card.classList.remove("draggable");
      card.style.left = "";
      card.style.top = "";
    }
  }
  syncDragMode();
  if (MOBILE_QUERY.addEventListener) {
    MOBILE_QUERY.addEventListener("change", syncDragMode);
  } else if (MOBILE_QUERY.addListener) {
    MOBILE_QUERY.addListener(syncDragMode);
  }
  window.addEventListener("resize", () => {
    if (dragEnabled) {
      const rect = card.getBoundingClientRect();
      card.style.left =
        clamp(rect.left, 4, window.innerWidth - rect.width - 4) + "px";
      card.style.top =
        clamp(rect.top, 4, window.innerHeight - rect.height - 4) + "px";
    }
  });

  return { playTier, goToDefault };
})();

/* ==================================================================
   GPA calculator
================================================================== */
const GRADES = [
  { label: "A+  (4.00)", value: 4.0 },
  { label: "A  (4.00)", value: 4.0 },
  { label: "A-  (3.67)", value: 3.67 },
  { label: "B+  (3.33)", value: 3.33 },
  { label: "B  (3.00)", value: 3.0 },
  { label: "B-  (2.67)", value: 2.67 },
  { label: "C+  (2.33)", value: 2.33 },
  { label: "C  (2.00)", value: 2.0 },
  { label: "C-  (1.67)", value: 1.67 },
  { label: "D+  (1.33)", value: 1.33 },
  { label: "D  (1.00)", value: 1.0 },
  { label: "F  (0.00)", value: 0.0 },
];

function gradeOptions() {
  return GRADES.map(
    (g) => `<option value="${g.value}">${g.label}</option>`,
  ).join("");
}

function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height);
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = e.clientX - rect.left - size / 2 + "px";
  ripple.style.top = e.clientY - rect.top - size / 2 + "px";
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}
document.querySelectorAll(".calc-btn, .add-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => addRipple(btn, e));
});

document.querySelectorAll(".tilt-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateY(-2px)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform =
      "perspective(900px) rotateY(0) rotateX(0) translateY(0)";
  });
});

/* Tab switching */
const modeSwitch = document.getElementById("modeSwitch");
const tabBtns = document.querySelectorAll(".mode-switch button");
const pill = document.getElementById("switchPill");
const panelsWrap = document.querySelector(".panels-wrap");
let activeIndex = 0;
let switching = false;

/* Elements of a card that take part in the enter/exit animation, in visual order. */
function getAnimEls(card) {
  const kids = Array.from(card.children);
  const rowsBox = kids.find(
    (el) => el.id === "subjectRows" || el.id === "semRows",
  );
  const before = kids.slice(0, kids.indexOf(rowsBox));
  const after = kids.slice(kids.indexOf(rowsBox) + 1);
  const rows = rowsBox ? Array.from(rowsBox.children) : [];
  return [...before, ...rows, ...after];
}

const EXIT_DUR = 320,
  EXIT_STAGGER = 28,
  ENTER_DUR = 480,
  ENTER_STAGGER = 55;

/* Returns the total animation time in ms. */
function animateOut(card) {
  const els = getAnimEls(card);
  els.forEach((el, i) => {
    el.style.animation = `disassembleDown ${EXIT_DUR}ms cubic-bezier(.4,0,.2,1) forwards`;
    el.style.animationDelay = i * EXIT_STAGGER + "ms";
  });
  return els.length ? (els.length - 1) * EXIT_STAGGER + EXIT_DUR : 0;
}

/* Returns the total animation time in ms and clears inline styles afterwards. */
function animateIn(card) {
  const els = getAnimEls(card);
  els.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.animation = `assembleUp ${ENTER_DUR}ms cubic-bezier(.22,1,.36,1) forwards`;
    el.style.animationDelay = i * ENTER_STAGGER + "ms";
  });
  const total = els.length ? (els.length - 1) * ENTER_STAGGER + ENTER_DUR : 0;
  setTimeout(() => {
    els.forEach((el) => {
      el.style.animationDelay = "";
      el.style.opacity = "";
      el.style.animation = el.classList.contains("calc-btn") ? "" : "none";
    });
  }, total + 20);
  return total;
}

tabBtns.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    if (i === activeIndex || switching) return;
    switching = true;
    modeSwitch.classList.add("is-switching");

    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    pill.style.transform = `translateX(${i * 100}%)`;
    hideResult();

    panelsWrap.classList.remove("sweeping");
    void panelsWrap.offsetWidth; // force reflow to restart the animation
    panelsWrap.classList.add("sweeping");
    setTimeout(() => panelsWrap.classList.remove("sweeping"), 750);

    const oldPanel = document.querySelector(".panel.active");
    const newPanel = document.getElementById("panel-" + btn.dataset.tab);
    const oldCard = oldPanel.querySelector(".input-card");
    const newCard = newPanel.querySelector(".input-card");

    const outDuration = animateOut(oldCard);
    setTimeout(() => {
      oldPanel.classList.remove("active");
      newPanel.classList.add("active");
      const inDuration = animateIn(newCard);
      setTimeout(() => {
        switching = false;
        modeSwitch.classList.remove("is-switching");
      }, inDuration);
    }, outDuration);

    activeIndex = i;
  });
});

/* Course and semester rows */
function renderQuestDots(containerId, labelId, count, noun) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("div");
    dot.className = "quest-dot";
    container.appendChild(dot);
  }
  document.getElementById(labelId).textContent =
    count + " " + noun + (count === 1 ? "" : "s") + " added";
}

const subjectRows = document.getElementById("subjectRows");
let subjectCount = 0;

function addSubjectRow() {
  const row = document.createElement("div");
  row.className = "subject-row";
  row.innerHTML = `
    <input type="text" placeholder="e.g. Calculus I" class="subj-name">
    <input type="number" min="0" step="0.5" placeholder="3" class="subj-credit">
    <select class="subj-grade">${gradeOptions()}</select>
    <button class="remove-btn" title="Vanish">&#10005;</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.classList.add("row-leave");
    setTimeout(() => {
      row.remove();
      subjectCount--;
      renderQuestDots(
        "questDotsSgpa",
        "questLabelSgpa",
        subjectCount,
        "course",
      );
    }, 220);
  });
  subjectRows.appendChild(row);
  subjectCount++;
  renderQuestDots("questDotsSgpa", "questLabelSgpa", subjectCount, "course");
}
document
  .getElementById("addSubjectBtn")
  .addEventListener("click", addSubjectRow);
for (let i = 0; i < 4; i++) addSubjectRow();

const semRows = document.getElementById("semRows");
let semCount = 0;

function addSemRow(defaultName) {
  const row = document.createElement("div");
  row.className = "sem-row";
  row.innerHTML = `
    <input type="text" placeholder="e.g. Semester 1" class="sem-name" value="${defaultName || ""}">
    <input type="number" min="0" max="4" step="0.01" placeholder="3.50" class="sem-sgpa">
    <input type="number" min="0" step="0.5" placeholder="18" class="sem-credit">
    <button class="remove-btn" title="Vanish">&#10005;</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.classList.add("row-leave");
    setTimeout(() => {
      row.remove();
      semCount--;
      renderQuestDots("questDotsCgpa", "questLabelCgpa", semCount, "semester");
    }, 220);
  });
  semRows.appendChild(row);
  semCount++;
  renderQuestDots("questDotsCgpa", "questLabelCgpa", semCount, "semester");
}
document
  .getElementById("addSemBtn")
  .addEventListener("click", () => addSemRow());
for (let i = 1; i <= 2; i++) addSemRow("Semester " + i);

/* Calculation: SGPA is credit-weighted grade points; CGPA is credit-weighted SGPA. */
document.getElementById("calcSgpaBtn").addEventListener("click", () => {
  let points = 0,
    credits = 0;
  subjectRows.querySelectorAll(".subject-row").forEach((row) => {
    const credit = parseFloat(row.querySelector(".subj-credit").value);
    const grade = parseFloat(row.querySelector(".subj-grade").value);
    if (!isNaN(credit) && credit > 0) {
      points += credit * grade;
      credits += credit;
    }
  });
  if (!credits) return shakeCard("panel-sgpa");
  showResult(points / credits, "Your SGPA");
});

document.getElementById("calcCgpaBtn").addEventListener("click", () => {
  let points = 0,
    credits = 0;
  semRows.querySelectorAll(".sem-row").forEach((row) => {
    const sgpa = parseFloat(row.querySelector(".sem-sgpa").value);
    const credit = parseFloat(row.querySelector(".sem-credit").value);
    if (!isNaN(sgpa) && !isNaN(credit) && credit > 0) {
      points += sgpa * credit;
      credits += credit;
    }
  });
  if (!credits) return shakeCard("panel-cgpa");
  showResult(points / credits, "Your CGPA");
});

function shakeCard(panelId) {
  const card = document.querySelector("#" + panelId + " .input-card");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function hideResult() {
  document.getElementById("placeholderState").style.display = "block";
  document.getElementById("resultBody").classList.remove("show");
  document.getElementById("mascotWrap").classList.remove("idle-bounce");
}

/* Result messages, mascot faces and levels */
const messages = {
  great: [
    "Exceptional. This is elite territory. Guard it with the same discipline that built it.",
    "Outstanding standard. Excellence is a habit, so maintain it relentlessly.",
    "Superb. You earned every point. Now defend this position without compromise.",
  ],
  vgood: [
    "Strong, but not elite yet. Master your weakest course and close the final gap.",
    "Good is not the goal. The top tier is close, so sharpen your discipline and push harder.",
    "One relentless effort separates you from the top. Eliminate every weak spot.",
  ],
  good: [
    "Decent, but decent builds no legacy. Raise your standard and attack your weakest course.",
    "You are capable of far more than this. Cut the distractions and work with real intensity.",
    "Comfort is the enemy of progress. Set a harder target and pursue it daily.",
  ],
  avg: [
    "Average is a choice, not a fate. Commit to focused daily study and outwork your past self.",
    "This is not your ceiling. Tighten your routine, confront your weak courses, and do more.",
    "Mediocrity ends where real effort begins. Revise daily and demand better results.",
  ],
  okay: [
    "This falls short of your potential. Stop delaying, build a strict routine, and execute it.",
    "Excuses will not raise this number, effort will. Confront your weakest subjects now.",
    "Below your capability. Discipline, revision, and relentless effort can reverse this.",
  ],
  low: [
    "This result demands immediate action. Face the gaps, seek guidance, and rebuild with discipline.",
    "A serious wake-up call. Take ownership, ask for help, and fight your way back daily.",
    "Staying here is not an option. One course, one hour, one day at a time, without excuses.",
  ],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FACE = {
  great: {
    eyes: "",
    brows: "",
    accessoryFront: `
      <rect x="37" y="44" width="46" height="14" rx="7" fill="#0b1b33"/>
      <circle cx="47" cy="51" r="6.2" fill="#1e293b"/>
      <circle cx="73" cy="51" r="6.2" fill="#1e293b"/>
      <line x1="53" y1="50" x2="67" y2="50" stroke="#0b1b33" stroke-width="3"/>`,
    mouth: "M44 64 Q60 82 76 64",
    capOpacity: 1,
  },
  vgood: {
    eyes: `<path d="M41 52 Q47 45 53 52" stroke="#0b1b33" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M67 52 Q73 45 79 52" stroke="#0b1b33" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    brows: "",
    accessoryFront: "",
    mouth: "M45 64 Q60 80 75 64",
    capOpacity: 1,
  },
  good: {
    eyes: `<circle cx="47" cy="51" r="3.6" fill="#0b1b33"/><path d="M69 51 Q73 54.5 77 51" stroke="#0b1b33" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    brows: `<path d="M67 42 L79 39" stroke="#0b1b33" stroke-width="2.4" stroke-linecap="round"/>`,
    accessoryFront: "",
    mouth: "M46 67 Q60 76 76 62",
    capOpacity: 1,
  },
  avg: {
    eyes: `<circle cx="47" cy="51" r="3.4" fill="#0b1b33"/><circle cx="73" cy="51" r="3.4" fill="#0b1b33"/>`,
    brows: `<path d="M41 43 L53 42" stroke="#0b1b33" stroke-width="2.2" stroke-linecap="round"/><path d="M67 42 L79 43" stroke="#0b1b33" stroke-width="2.2" stroke-linecap="round"/>`,
    accessoryFront: "",
    mouth: "M46 67 Q60 73 74 67",
    capOpacity: 1,
  },
  okay: {
    eyes: `<ellipse cx="47" cy="51" rx="4" ry="2" fill="#0b1b33"/><ellipse cx="73" cy="51" rx="4" ry="2" fill="#0b1b33"/>`,
    brows: `<path d="M41 43 L53 43" stroke="#0b1b33" stroke-width="2.2" stroke-linecap="round"/><path d="M67 43 L79 43" stroke="#0b1b33" stroke-width="2.2" stroke-linecap="round"/>`,
    accessoryFront: `<path d="M94 36 Q89 45 94 49 Q99 45 94 36 Z" fill="#bfe0ff" stroke="#60a5fa" stroke-width="1.3"/>`,
    mouth: "M48 68 L72 68",
    capOpacity: 1,
  },
  low: {
    eyes: `<circle cx="47" cy="51" r="3.2" fill="#0b1b33"/><circle cx="73" cy="51" r="3.2" fill="#0b1b33"/>`,
    brows: `<path d="M39 40 L54 46" stroke="#0b1b33" stroke-width="2.6" stroke-linecap="round"/><path d="M81 40 L66 46" stroke="#0b1b33" stroke-width="2.6" stroke-linecap="round"/>`,
    accessoryFront: `<path d="M41 58 Q37 66 41 70 Q45 66 41 58 Z" fill="#bfe0ff" stroke="#60a5fa" stroke-width="1.3"/>`,
    mouth: "M46 73 Q60 64 74 73",
    capOpacity: 1,
  },
};

const levels = {
  great: { n: 6, name: "Sultan" },
  vgood: { n: 5, name: "Grand Vizier" },
  good: { n: 4, name: "Royal Sage" },
  avg: { n: 3, name: "Court Scribe" },
  okay: { n: 2, name: "Apprentice" },
  low: { n: 1, name: "Wanderer" },
};

const TAGS = {
  great: "Excellent",
  vgood: "Very Good",
  good: "Good",
  avg: "Average",
  okay: "Fair",
  low: "Needs improvement",
};

/* A single tier drives both the result card and the reaction video. */
function tierFor(v) {
  if (v >= 3.8) return "great";
  if (v >= 3.5) return "vgood";
  if (v >= 3.0) return "good";
  if (v >= 2.5) return "avg";
  if (v >= 2.0) return "okay";
  return "low";
}

/* Result effects */
function animateNumber(el, endValue, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = ((1 - Math.pow(1 - t, 3)) * endValue).toFixed(2);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = endValue.toFixed(2);
  }
  requestAnimationFrame(tick);
}

function spawnRings(stage) {
  for (let i = 0; i < 4; i++) {
    const ring = document.createElement("div");
    ring.className = "ring";
    stage.appendChild(ring);
    setTimeout(() => {
      ring.classList.add("animate");
      setTimeout(() => ring.remove(), 1150);
    }, i * 140);
  }
}

function spawnSparkles(field, tierKey) {
  field.innerHTML = "";
  const counts = { great: 10, vgood: 8, good: 5 };
  const count = counts[tierKey];
  if (!count) return;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.textContent = "\u2726";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.animationDelay = Math.random() * 1.2 + "s";
    field.appendChild(s);
  }
}

/* Confetti for the top three tiers, rising dots for the rest. */
function spawnParticles(container, tierKey) {
  const colors = ["#1587f0", "#40a6ff", "#7cc4ff", "#0b6fd0", "#ffc83d"];
  const shapes = ["confetti-sq", "confetti-circ", "confetti-tri"];
  const celebrate = { great: 40, vgood: 30, good: 20 };
  if (celebrate[tierKey]) {
    for (let i = 0; i < celebrate[tierKey]; i++) {
      const p = document.createElement("div");
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      p.className = "particle " + shape;
      p.style.left = Math.random() * 100 + "%";
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (shape === "confetti-tri") {
        p.style.borderBottom = "9px solid " + color;
      } else {
        p.style.width = "7px";
        p.style.height = "12px";
        p.style.background = color;
      }
      p.style.animationDuration = 1 + Math.random() * 0.8 + "s";
      p.style.animationDelay = Math.random() * 0.3 + "s";
      container.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  } else {
    const n = { avg: 10, okay: 9, low: 8 }[tierKey];
    const col = { avg: "#f5a623", okay: "#f08a4b", low: "#5aa9f0" }[tierKey];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "particle rise";
      p.style.left = 30 + Math.random() * 40 + "%";
      p.style.width = p.style.height = "5px";
      p.style.background = col;
      p.style.animationDuration = 1.3 + Math.random() * 0.7 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      container.appendChild(p);
      setTimeout(() => p.remove(), 2400);
    }
  }
}

function showResult(value, label) {
  document.getElementById("placeholderState").style.display = "none";

  const body = document.getElementById("resultBody");
  const fill = document.getElementById("scaleFill");
  const xpRight = document.getElementById("xpRightLabel");
  const mascotWrap = document.getElementById("mascotWrap");

  const tierKey = tierFor(value);
  const tagText = TAGS[tierKey];
  const videoKey = tierKey;

  const face = FACE[tierKey];
  const lvl = levels[tierKey];

  document.getElementById("resultLabel").textContent = label;
  document.getElementById("resultTag").textContent = tagText;
  document.getElementById("levelTag").textContent =
    "\u2726 Level " + lvl.n + " \u2014 " + lvl.name;
  document.getElementById("resultMsg").textContent = pick(messages[tierKey]);

  document.getElementById("mascotEyes").innerHTML = face.eyes;
  document.getElementById("mascotBrows").innerHTML = face.brows;
  document.getElementById("mascotAccessoryFront").innerHTML =
    face.accessoryFront;
  document.getElementById("mascotMouth").setAttribute("d", face.mouth);
  document.getElementById("mascotCap").style.opacity = face.capOpacity;

  body.className = "result-body tier-" + tierKey;
  void body.offsetWidth;
  body.classList.add("show");

  animateNumber(document.getElementById("resultNumber"), value, 1000);

  const pct = Math.min(100, (value / 4) * 100);
  fill.style.width = "0%";
  xpRight.textContent = "0%";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => (fill.style.width = pct + "%")),
  );

  const t0 = performance.now();
  (function xpTick(now) {
    const t = Math.min(1, (now - t0) / 900);
    xpRight.textContent = Math.round(t * pct) + "%";
    if (t < 1) requestAnimationFrame(xpTick);
  })(t0);

  mascotWrap.classList.remove("pop", "idle-bounce");
  void mascotWrap.offsetWidth;
  mascotWrap.classList.add("pop");
  setTimeout(() => mascotWrap.classList.add("idle-bounce"), 800);

  spawnRings(document.getElementById("badgeStage"));
  spawnSparkles(document.getElementById("sparkleField"), tierKey);
  spawnParticles(document.getElementById("resultPanel"), tierKey);

  if (reactionVideoState.playTier) reactionVideoState.playTier(videoKey);

  const flash = document.getElementById("flashOverlay");
  flash.classList.remove("flash");
  void flash.offsetWidth;
  flash.classList.add("flash");
  document
    .getElementById("resultPanel")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}
