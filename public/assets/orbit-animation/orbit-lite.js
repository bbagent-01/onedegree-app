/**
 * v4-orbit.js — 3-ring concentric orbital animation
 *
 * Ring 1 (inner / "Your friends"): 9 larger avatars
 * Ring 2 (middle / "Friends of friends"): 10 medium avatars
 * Ring 3 (outer / "Extended network"): 9 smaller avatars
 *
 * Features:
 * - 3 concentric rings rotating clockwise at different speeds
 * - Thin solid brand-green ring lines
 * - Trust graph connection lines between inner ↔ middle and middle ↔ outer
 * - Radial gradient fade behind center text
 * - Scroll-velocity-affected rotation speed
 * - Load animation: fast spin → exponential decay to cruise speed
 */
(function () {
  'use strict';

  // ── Avatar assignments per ring ──
  const RING_1_AVATARS = [
    '/assets/orbit-animation/avatars/avatar-06-latina-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-18-black-man-2.jpg',
    '/assets/orbit-animation/avatars/avatar-10-asian-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-13-white-man.jpg',
    '/assets/orbit-animation/avatars/avatar-03-black-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-09-blonde-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-anna.jpg',
    '/assets/orbit-animation/avatars/avatar-james.jpg',
    '/assets/orbit-animation/avatars/avatar-19-indian-man.jpg',
    '/assets/orbit-animation/avatars/avatar-06-latina-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-18-black-man-2.jpg',
    '/assets/orbit-animation/avatars/avatar-10-asian-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-13-white-man.jpg',
    '/assets/orbit-animation/avatars/avatar-03-black-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-09-blonde-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-anna.jpg',
    '/assets/orbit-animation/avatars/avatar-james.jpg',
    '/assets/orbit-animation/avatars/avatar-19-indian-man.jpg',
  ];

  const RING_2_AVATARS = [
    '/assets/orbit-animation/avatars/avatar-05-indian-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-21-asian-man.jpg',
    '/assets/orbit-animation/avatars/avatar-08-mixed-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-15-latino-man.jpg',
    '/assets/orbit-animation/avatars/avatar-04-white-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-22-mixed-man.jpg',
    '/assets/orbit-animation/avatars/avatar-16-black-man.jpg',
    '/assets/orbit-animation/avatars/avatar-maya.jpg',
    '/assets/orbit-animation/avatars/avatar-luke.jpg',
    '/assets/orbit-animation/avatars/avatar-14-white-man-2.jpg',
    '/assets/orbit-animation/avatars/avatar-07-white-woman-2.jpg',
    '/assets/orbit-animation/avatars/avatar-11-middleeast-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-12-black-woman-2.jpg',
    '/assets/orbit-animation/avatars/avatar-17-white-man-3.jpg',
    '/assets/orbit-animation/avatars/avatar-20-middleeast-man.jpg',
    '/assets/orbit-animation/avatars/avatar-host.jpg',
    '/assets/orbit-animation/avatars/avatar-guest.jpg',
    '/assets/orbit-animation/avatars/avatar-og-1.jpg',
    '/assets/orbit-animation/avatars/avatar-og-2.jpg',
  ];

  const RING_3_AVATARS = [
    '/assets/orbit-animation/avatars/avatar-05-indian-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-21-asian-man.jpg',
    '/assets/orbit-animation/avatars/avatar-08-mixed-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-15-latino-man.jpg',
    '/assets/orbit-animation/avatars/avatar-04-white-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-22-mixed-man.jpg',
    '/assets/orbit-animation/avatars/avatar-16-black-man.jpg',
    '/assets/orbit-animation/avatars/avatar-maya.jpg',
    '/assets/orbit-animation/avatars/avatar-luke.jpg',
    '/assets/orbit-animation/avatars/avatar-14-white-man-2.jpg',
    '/assets/orbit-animation/avatars/avatar-07-white-woman-2.jpg',
    '/assets/orbit-animation/avatars/avatar-11-middleeast-woman.jpg',
    '/assets/orbit-animation/avatars/avatar-12-black-woman-2.jpg',
    '/assets/orbit-animation/avatars/avatar-17-white-man-3.jpg',
    '/assets/orbit-animation/avatars/avatar-20-middleeast-man.jpg',
    '/assets/orbit-animation/avatars/avatar-host.jpg',
    '/assets/orbit-animation/avatars/avatar-guest.jpg',
    '/assets/orbit-animation/avatars/avatar-og-1.jpg',
  ];

  const BRAND_RGB = '79, 177, 145';

  let canvas, ctx, cx, cy, W, H, dpr;
  let isMobileView = false;
  let ring1Images = [], ring2Images = [], ring3Images = [];
  let loaded = 0;
  const totalImages = RING_1_AVATARS.length + RING_2_AVATARS.length + RING_3_AVATARS.length;
  let ring1Angle = 0, ring2Angle = 0, ring3Angle = 0;
  let raf;
  let isVisible = true;       // IntersectionObserver flag

  // ── Animated connection lines ──
  // Each "spark" is a line that draws in, holds, then fades out
  const sparks = [];
  const SPARK_DRAW_TIME = 600;    // ms to draw the line in
  const SPARK_HOLD_TIME = 1200;   // ms to hold fully visible
  const SPARK_FADE_TIME = 800;    // ms to fade out
  const SPARK_INTERVAL = 350;     // ms between new sparks
  const MAX_SPARKS = 6;           // max simultaneous lines
  let lastSparkTime = 0;

  // Ring geometry (set in resize)
  let ring1Radius, ring2Radius, ring3Radius;
  let ring1Size, ring2Size, ring3Size;
  let centerFadeRadius;

  // Speeds (radians per frame at 60fps)
  const RING_1_CRUISE = 0.0018;
  const RING_2_CRUISE = 0.0011;
  const RING_3_CRUISE = 0.0007;

  // Load animation state
  let startTime = 0;
  const SPIN_UP_MULTIPLIER = 8;    // initial speed multiplier
  const SPIN_DECAY_RATE = 0.6;     // exponential decay — slows down almost immediately

  // Scroll speed boost
  let scrollVelocity = 0;
  let lastScrollY = 0;
  let lastScrollTime = 0;
  const SCROLL_BOOST = 3;           // max speed multiplier from scroll
  const SCROLL_DECAY = 0.92;        // velocity decay per frame

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Load all images, then start — use Promise.all to avoid race conditions
    const allSrcs = [
      ...RING_1_AVATARS.map((src, i) => ({ src, arr: ring1Images, idx: i })),
      ...RING_2_AVATARS.map((src, i) => ({ src, arr: ring2Images, idx: i })),
      ...RING_3_AVATARS.map((src, i) => ({ src, arr: ring3Images, idx: i })),
    ];

    Promise.all(allSrcs.map(({ src, arr, idx }) => new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = img.onerror = () => { arr[idx] = img; resolve(); };
      img.src = src;
    }))).then(start);

    window.addEventListener('resize', function() { resize(); resizeTop(); });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Pause when scrolled off-screen
    const observer = new IntersectionObserver(function(entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !raf) tick(); // resume
    }, { threshold: 0 });
    observer.observe(canvas);
  }

  function onScroll() {
    const now = performance.now();
    const dt = now - lastScrollTime;
    if (dt > 0) {
      const dy = Math.abs(window.scrollY - lastScrollY);
      scrollVelocity = Math.min(dy / Math.max(dt, 8), SCROLL_BOOST);
    }
    lastScrollY = window.scrollY;
    lastScrollTime = now;
  }

  function resize() {
    // Use the canvas's own rect — on mobile CSS overrides its size
    const rect = canvas.getBoundingClientRect();
    W = rect.width * dpr;
    H = rect.height * dpr;
    canvas.width = W;
    canvas.height = H;

    isMobileView = rect.width <= 680;

    if (isMobileView) {
      // Mobile: perfect circles, same proportions as desktop — just cropped
      // Center is way above the canvas; only the very bottom band is visible
      cx = W / 2;

      const base = W * 0.9;         // large circles — sides/top way off screen
      ring1Radius = base * 1.15;
      ring2Radius = base * 1.32;
      ring3Radius = base * 1.50;

      // Position center so circles sit lower — inner ring clears text fade
      // Bottom of outer ring near canvas bottom, with small padding
      cy = -(ring3Radius - H + (20 * dpr));

      ring1Size = 39 * dpr;   // 75% of 52
      ring2Size = 32 * dpr;   // 75% of 42
      ring3Size = 26 * dpr;   // 75% of 34

      centerFadeRadius = 0;
    } else {
      // Desktop — fixed pixel-based geometry so the orbit keeps its
      // intended scale on every viewport. On narrow viewports the
      // outer rings extend past the canvas edges and avatars get
      // clipped (intentional) instead of shrinking to fit. The
      // inner ring is sized to clear the centered text content; the
      // top of the inner ring sits well below the trustead header
      // logo so avatars don't crowd it.
      cx = W / 2;
      cy = H / 2;

      ring1Radius = 360 * dpr;
      ring2Radius = 470 * dpr;
      ring3Radius = 590 * dpr;

      ring1Size = 88 * dpr;
      ring2Size = 50 * dpr;
      ring3Size = 38 * dpr;

      centerFadeRadius = 270 * dpr;
    }
  }

  function start() {
    resize();
    resizeTop();
    startTime = performance.now();
    lastScrollTime = startTime;
    lastScrollY = window.scrollY;
    tick();
  }

  function getPositions(count, radius, angle) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      const a = angle + (i / count) * Math.PI * 2;
      positions.push({
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      });
    }
    return positions;
  }

  function getSpeedMultiplier() {
    // Load animation: exponential decay from fast spin to cruise
    const elapsed = (performance.now() - startTime) / 1000;
    const loadBoost = (SPIN_UP_MULTIPLIER - 1) * Math.exp(-elapsed / SPIN_DECAY_RATE);

    // Scroll boost: decays each frame
    scrollVelocity *= SCROLL_DECAY;
    const scrollBoost = scrollVelocity * SCROLL_BOOST;

    return 1 + loadBoost + scrollBoost;
  }

  function tick() {
    if (!isVisible) { raf = null; return; } // stop loop when off-screen

    ctx.clearRect(0, 0, W, H);

    const speedMul = getSpeedMultiplier();

    // Update angles
    ring1Angle += RING_1_CRUISE * speedMul;
    ring2Angle += RING_2_CRUISE * speedMul;
    ring3Angle += RING_3_CRUISE * speedMul;

    // Get positions — desktop uses half the inner ring avatars
    const ring1Count = isMobileView ? RING_1_AVATARS.length : Math.ceil(RING_1_AVATARS.length / 2);
    const pos1 = getPositions(ring1Count, ring1Radius, ring1Angle);
    const pos2 = getPositions(RING_2_AVATARS.length, ring2Radius, ring2Angle);
    const pos3 = getPositions(RING_3_AVATARS.length, ring3Radius, ring3Angle);

    // ── Draw thin solid purple ring lines ──
    drawRingLine(ring1Radius, 0.3);   // inner ring more visible purple
    drawRingLine(ring2Radius, 0.08);
    drawRingLine(ring3Radius, 0.06);

    // ── Animated trust graph connection sparks ──
    // Returns { ring2: Map(idx→alpha), ring3: Map(idx→alpha) } for lit-up avatars
    const litUp = updateSparks(pos1, pos2, pos3);

    // ── Draw ring 3 (outer / smallest / behind) ──
    pos3.forEach((p, i) => {
      const glow = litUp.ring3.get(i) || 0;
      drawAvatar(ring3Images[i], p.x, p.y, ring3Size, 0.55, glow);
    });

    // ── Draw ring 2 (middle) ──
    pos2.forEach((p, i) => {
      const glow = litUp.ring2.get(i) || 0;
      drawAvatar(ring2Images[i], p.x, p.y, ring2Size, 0.7, glow);
    });

    // ── Draw ring 1 (inner / largest / in front) ──
    pos1.forEach((p, i) => {
      drawAvatar(ring1Images[i], p.x, p.y, ring1Size, 0.9, 1); // always purple ring on inner
    });

    // ── Draw center fade overlay ──
    drawCenterFade();

    // ── Render top-arc mirror canvas (mobile only) ──
    tickTop();

    raf = requestAnimationFrame(tick);
  }

  function drawRingLine(radius, opacity) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${BRAND_RGB}, ${opacity})`;
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
    ctx.restore();
  }

  // Distance from a point to the nearest point on a line segment
  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx, projY = ay + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  // Find the N closest avatars in outerPos to a given point
  function closestN(point, outerPos, n) {
    return outerPos
      .map((p, i) => ({ i, d: Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map(o => o.i);
  }

  function updateSparks(pos1, pos2, pos3) {
    const now = performance.now();
    const centerExclusionR = centerFadeRadius * 0.85; // lines must not pass closer than this to center

    // Spawn new sparks on interval
    if (now - lastSparkTime > SPARK_INTERVAL && sparks.length < MAX_SPARKS) {
      const innerIdx = Math.floor(Math.random() * pos1.length);
      const from = pos1[innerIdx];

      // Pick from the closest 3 avatars on ring 2 or ring 3
      const useRing3 = Math.random() < 0.35;
      const outerPos = useRing3 ? pos3 : pos2;
      const candidates = closestN(from, outerPos, 3);

      // Filter out any whose line crosses too close to center
      const valid = candidates.filter(idx => {
        const to = outerPos[idx];
        return distToSegment(cx, cy, from.x, from.y, to.x, to.y) > centerExclusionR;
      });

      if (valid.length > 0) {
        const outerIdx = valid[Math.floor(Math.random() * valid.length)];
        sparks.push({
          innerIdx,
          outerIdx,
          outerRing: useRing3 ? 3 : 2,
          born: now,
        });
        lastSparkTime = now;
      }
    }

    // Track which outer avatars are lit up (and how bright)
    const litUp = { ring2: new Map(), ring3: new Map() };

    // Draw and cull sparks
    const totalLife = SPARK_DRAW_TIME + SPARK_HOLD_TIME + SPARK_FADE_TIME;
    for (let s = sparks.length - 1; s >= 0; s--) {
      const spark = sparks[s];
      const age = now - spark.born;

      if (age > totalLife) {
        sparks.splice(s, 1);
        continue;
      }

      // Get current positions (they move with the rings)
      const from = pos1[spark.innerIdx];
      const outerPositions = spark.outerRing === 3 ? pos3 : pos2;
      const to = outerPositions[spark.outerIdx];

      // Calculate draw progress and alpha
      let drawProgress, alpha;
      if (age < SPARK_DRAW_TIME) {
        drawProgress = age / SPARK_DRAW_TIME;
        alpha = 0.25;
      } else if (age < SPARK_DRAW_TIME + SPARK_HOLD_TIME) {
        drawProgress = 1;
        alpha = 0.25;
      } else {
        drawProgress = 1;
        const fadeAge = age - SPARK_DRAW_TIME - SPARK_HOLD_TIME;
        alpha = 0.25 * (1 - fadeAge / SPARK_FADE_TIME);
      }

      // Ease the draw progress for a smoother feel
      drawProgress = drawProgress * drawProgress * (3 - 2 * drawProgress);

      // Draw the line segment
      const endX = from.x + (to.x - from.x) * drawProgress;
      const endY = from.y + (to.y - from.y) * drawProgress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgb(${BRAND_RGB})`;
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      // Small dot at the drawing tip during draw phase
      if (age < SPARK_DRAW_TIME) {
        ctx.beginPath();
        ctx.arc(endX, endY, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${BRAND_RGB}, ${alpha * 1.5})`;
        ctx.fill();
      }
      ctx.restore();

      // Track lit-up outer avatars once the line has reached them
      if (drawProgress > 0.9) {
        const ringMap = spark.outerRing === 3 ? litUp.ring3 : litUp.ring2;
        // Use the brightest alpha if multiple sparks hit the same avatar
        const existing = ringMap.get(spark.outerIdx) || 0;
        const glowAlpha = alpha / 0.25; // normalize to 0-1
        ringMap.set(spark.outerIdx, Math.max(existing, glowAlpha));
      }
    }

    return litUp;
  }

  function drawAvatar(img, x, y, size, baseAlpha, purpleGlow) {
    const half = size / 2;

    // Brand-green glow ring (drawn behind the avatar)
    if (purpleGlow > 0) {
      ctx.save();
      ctx.globalAlpha = purpleGlow * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, half + 4 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgb(${BRAND_RGB})`;
      ctx.lineWidth = 2.5 * dpr;
      ctx.stroke();
      // Soft outer glow
      ctx.globalAlpha = purpleGlow * 0.15;
      ctx.beginPath();
      ctx.arc(x, y, half + 7 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgb(${BRAND_RGB})`;
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = baseAlpha;

    // Circular clip + draw image
    ctx.beginPath();
    ctx.arc(x, y, half, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x - half, y - half, size, size);
    } else {
      ctx.fillStyle = 'rgba(79, 177, 145, 0.15)';
      ctx.fill();
    }
    ctx.restore();

    // Default subtle border (only when no glow active)
    if (!purpleGlow) {
      ctx.save();
      ctx.globalAlpha = baseAlpha * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, half + 1.5 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${BRAND_RGB}, 0.25)`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawCenterFade() {
    if (centerFadeRadius <= 0) return; // skip on mobile
    // Radial gradient: solid bg color in center → transparent at edge
    // Uses the trustead dark-forest background #07221B
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerFadeRadius);
    grad.addColorStop(0, 'rgba(7, 34, 27, 1)');
    grad.addColorStop(0.5, 'rgba(7, 34, 27, 0.95)');
    grad.addColorStop(0.75, 'rgba(7, 34, 27, 0.5)');
    grad.addColorStop(1, 'rgba(7, 34, 27, 0)');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(cx - centerFadeRadius, cy - centerFadeRadius, centerFadeRadius * 2, centerFadeRadius * 2);
    ctx.restore();
  }

  // ── Top-arc mirror (mobile only) ──
  // Shows the top crop of the same rings above the solution text
  let topCanvas, topCtx, topW, topH;
  let topActive = false;
  const topSparks = [];
  let lastTopSparkTime = 0;

  function initTop(canvasId) {
    topCanvas = document.getElementById(canvasId);
    if (!topCanvas) return;
    topCtx = topCanvas.getContext('2d');
    topActive = false;
    // Will activate on resize if mobile
  }

  function resizeTop() {
    if (!topCanvas) return;
    const rect = topCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) { topActive = false; return; }
    topActive = rect.width <= 680;
    if (!topActive) return;

    topW = rect.width * dpr;
    topH = rect.height * dpr;
    topCanvas.width = topW;
    topCanvas.height = topH;
  }

  function tickTop() {
    if (!topActive || !topCtx) return;
    topCtx.clearRect(0, 0, topW, topH);

    // Mirror: center is below the canvas so top arcs are visible
    const topCx = topW / 2;
    const base = topW * 0.9;
    const r1 = base * 1.15;
    const r2 = base * 1.32;
    const r3 = base * 1.50;
    // Center sits below the canvas so we only see the top arc of
    // each ring. Larger pull-up = orbit center moves UP = the visible
    // arcs sit higher in the canvas, leaving more clear space at the
    // bottom of the canvas for the slide text below it.
    const topCy = r3 + topH - (380 * dpr);

    const ring1Count = RING_1_AVATARS.length;
    const pos1 = [], pos2 = [], pos3 = [];
    for (let i = 0; i < ring1Count; i++) {
      const a = ring1Angle + (i / ring1Count) * Math.PI * 2;
      pos1.push({ x: topCx + Math.cos(a) * r1, y: topCy + Math.sin(a) * r1 });
    }
    for (let i = 0; i < RING_2_AVATARS.length; i++) {
      const a = ring2Angle + (i / RING_2_AVATARS.length) * Math.PI * 2;
      pos2.push({ x: topCx + Math.cos(a) * r2, y: topCy + Math.sin(a) * r2 });
    }
    for (let i = 0; i < RING_3_AVATARS.length; i++) {
      const a = ring3Angle + (i / RING_3_AVATARS.length) * Math.PI * 2;
      pos3.push({ x: topCx + Math.cos(a) * r3, y: topCy + Math.sin(a) * r3 });
    }

    // Draw ring lines
    drawRingLineOn(topCtx, topCx, topCy, r1, 0.3);
    drawRingLineOn(topCtx, topCx, topCy, r2, 0.08);
    drawRingLineOn(topCtx, topCx, topCy, r3, 0.06);

    // Spark connections for top canvas
    const now = performance.now();
    const margin = 40 * dpr;
    function isVisible(p, size) { return p.y - size / 2 < topH + margin; }

    // Spawn new sparks — only between visible avatars
    if (now - lastTopSparkTime > SPARK_INTERVAL && topSparks.length < MAX_SPARKS) {
      // Pick a visible inner ring avatar
      const visibleInner = pos1.map((p, i) => ({ p, i })).filter(o => isVisible(o.p, ring1Size));
      if (visibleInner.length > 0) {
        const pick = visibleInner[Math.floor(Math.random() * visibleInner.length)];
        const useRing3 = Math.random() < 0.35;
        const outerPos = useRing3 ? pos3 : pos2;
        const candidates = closestN(pick.p, outerPos, 3).filter(idx => isVisible(outerPos[idx], useRing3 ? ring3Size : ring2Size));
        if (candidates.length > 0) {
          const outerIdx = candidates[Math.floor(Math.random() * candidates.length)];
          topSparks.push({ innerIdx: pick.i, outerIdx, outerRing: useRing3 ? 3 : 2, born: now });
          lastTopSparkTime = now;
        }
      }
    }

    // Track lit-up avatars
    const topLitUp = { ring2: new Map(), ring3: new Map() };
    const totalLife = SPARK_DRAW_TIME + SPARK_HOLD_TIME + SPARK_FADE_TIME;

    for (let s = topSparks.length - 1; s >= 0; s--) {
      const spark = topSparks[s];
      const age = now - spark.born;
      if (age > totalLife) { topSparks.splice(s, 1); continue; }

      const from = pos1[spark.innerIdx];
      const to = (spark.outerRing === 3 ? pos3 : pos2)[spark.outerIdx];

      let drawProgress, alpha;
      if (age < SPARK_DRAW_TIME) {
        drawProgress = age / SPARK_DRAW_TIME;
        alpha = 0.25;
      } else if (age < SPARK_DRAW_TIME + SPARK_HOLD_TIME) {
        drawProgress = 1;
        alpha = 0.25;
      } else {
        drawProgress = 1;
        alpha = 0.25 * (1 - (age - SPARK_DRAW_TIME - SPARK_HOLD_TIME) / SPARK_FADE_TIME);
      }
      drawProgress = drawProgress * drawProgress * (3 - 2 * drawProgress);

      const endX = from.x + (to.x - from.x) * drawProgress;
      const endY = from.y + (to.y - from.y) * drawProgress;

      topCtx.save();
      topCtx.globalAlpha = alpha;
      topCtx.beginPath();
      topCtx.moveTo(from.x, from.y);
      topCtx.lineTo(endX, endY);
      topCtx.strokeStyle = `rgb(${BRAND_RGB})`;
      topCtx.lineWidth = 1.2 * dpr;
      topCtx.stroke();
      if (age < SPARK_DRAW_TIME) {
        topCtx.beginPath();
        topCtx.arc(endX, endY, 2 * dpr, 0, Math.PI * 2);
        topCtx.fillStyle = `rgba(${BRAND_RGB}, ${alpha * 1.5})`;
        topCtx.fill();
      }
      topCtx.restore();

      if (drawProgress > 0.9) {
        const ringMap = spark.outerRing === 3 ? topLitUp.ring3 : topLitUp.ring2;
        const existing = ringMap.get(spark.outerIdx) || 0;
        ringMap.set(spark.outerIdx, Math.max(existing, alpha / 0.25));
      }
    }

    // Draw avatars (only those visible in the canvas)
    pos3.forEach((p, i) => { if (isVisible(p, ring3Size)) drawAvatarOn(topCtx, ring3Images[i], p.x, p.y, ring3Size, 0.55, topLitUp.ring3.get(i) || 0); });
    pos2.forEach((p, i) => { if (isVisible(p, ring2Size)) drawAvatarOn(topCtx, ring2Images[i], p.x, p.y, ring2Size, 0.7, topLitUp.ring2.get(i) || 0); });
    pos1.forEach((p, i) => { if (isVisible(p, ring1Size)) drawAvatarOn(topCtx, ring1Images[i], p.x, p.y, ring1Size, 0.9, 1); });
  }

  function drawRingLineOn(c, centerX, centerY, radius, opacity) {
    c.save();
    c.beginPath();
    c.arc(centerX, centerY, radius, 0, Math.PI * 2);
    c.strokeStyle = `rgba(${BRAND_RGB}, ${opacity})`;
    c.lineWidth = 1 * dpr;
    c.stroke();
    c.restore();
  }

  function drawAvatarOn(c, img, x, y, size, baseAlpha, purpleGlow) {
    const half = size / 2;
    if (purpleGlow > 0) {
      c.save();
      c.globalAlpha = purpleGlow * 0.6;
      c.beginPath();
      c.arc(x, y, half + 4 * dpr, 0, Math.PI * 2);
      c.strokeStyle = `rgb(${BRAND_RGB})`;
      c.lineWidth = 2.5 * dpr;
      c.stroke();
      c.globalAlpha = purpleGlow * 0.15;
      c.beginPath();
      c.arc(x, y, half + 7 * dpr, 0, Math.PI * 2);
      c.strokeStyle = `rgb(${BRAND_RGB})`;
      c.lineWidth = 4 * dpr;
      c.stroke();
      c.restore();
    }
    c.save();
    c.globalAlpha = baseAlpha;
    c.beginPath();
    c.arc(x, y, half, 0, Math.PI * 2);
    c.closePath();
    c.clip();
    if (img && img.complete && img.naturalWidth) {
      c.drawImage(img, x - half, y - half, size, size);
    } else {
      c.fillStyle = 'rgba(79, 177, 145, 0.15)';
      c.fill();
    }
    c.restore();
    if (!purpleGlow) {
      c.save();
      c.globalAlpha = baseAlpha * 0.3;
      c.beginPath();
      c.arc(x, y, half + 1.5 * dpr, 0, Math.PI * 2);
      c.strokeStyle = `rgba(${BRAND_RGB}, 0.25)`;
      c.lineWidth = 1.5 * dpr;
      c.stroke();
      c.restore();
    }
  }

  // Expose
  window.initOrbitHero = init;
  window.initOrbitTop = initTop;
})();
