// =========================================================
// PROTOTYPE — Projects Index v2 (moving photographic wall)
// =========================================================
// Isolated script for prototype/projects-index-v2.html. Not loaded
// by the live site. v2 supersedes v1 per Tan's review of the v1
// recording: "REWORK -- do not integrate. The core idea is approved
// [the incoming photograph already exists in the field before it
// becomes dominant], but the current visual execution is not [small
// centered image + huge black space + bottom-left label, repeated
// four times]." This file keeps v1's underlying mechanic --
// scroll-driven presence per photo, threaded entry/home/exit offsets
// so one photo's exit point is the next one's entry point -- and
// changes what that mechanic drives: larger, asymmetrically placed
// matted prints instead of small centred crops, plus a tracking
// spotlight and a per-chapter static tilt for spatial/photographic
// feel. See projects-index-v2.css for the sizing/matting.

(function () {
  const N = 4;
  const stageWrap = document.querySelector('.wall-stage-wrap');
  const photos = Array.from(document.querySelectorAll('.wall-photo'));
  const spotlight = document.querySelector('.wall-spotlight');
  const labelEl = document.querySelector('.wall-label');
  const labelNum = document.querySelector('.wall-label-num');
  const labelTitle = document.querySelector('.wall-label-title');
  const labelMood = document.querySelector('.wall-label-mood');
  const progressCurrent = document.querySelector('.wall-progress-current');

  if (!stageWrap || photos.length !== N) return;

  // Real titles/numbers, unchanged. Descriptions replaced with a
  // short mood pair per the brief's own example ("01 STREET fleeting
  // / oblique") rather than v1's full sentence -- distilled from the
  // same real copy rather than invented from nothing: Street's
  // description already said "unscripted", Architecture's was about
  // how light moves through structure, Portraits' said "held",
  // Retouching's said "careful, restrained".
  const DATA = [
    { num: '01', title: 'Street', mood: 'fleeting / oblique' },
    { num: '02', title: 'Architecture', mood: 'quiet / structural' },
    { num: '03', title: 'Portraits', mood: 'held / unhurried' },
    { num: '04', title: 'Photo Retouching', mood: 'careful / restrained' }
  ];

  // Entry / home / exit offsets in vw/vh. Homes are off-centre and
  // alternate left/right -- Street left, Architecture right,
  // Portraits left, Retouching right -- the same alternation the
  // production Projects section already uses, instead of v1's every-
  // photo-dead-centre. Entry/exit sweep further than v1's since these
  // frames are much larger; each chapter's exit still equals the
  // next chapter's entry so the four photos read as one continuous
  // path through the space instead of four independent swaps.
  // Street's entry (only) softened in the refinement pass: at (36,22)
  // it was far enough out that, combined with the Closing section's
  // own trailing padding, Street read as barely-there sliver rather
  // than an already-present neighbour during the Statement -> Closing
  // scroll. Pulled closer so more of it is visibly emerging by the
  // time Closing is still on screen. Nothing else in the chain
  // changes -- exit[i] still equals entry[i+1] for every later pair.
  const OFFSETS = [
    { entry: { x: 20, y: 13 },   home: { x: -15, y: -5 }, exit: { x: -40, y: -26 } },
    { entry: { x: -40, y: -26 }, home: { x: 16, y: 3 },   exit: { x: 42, y: 24 } },
    { entry: { x: 42, y: 24 },   home: { x: -13, y: 10 }, exit: { x: -38, y: -22 } },
    { entry: { x: -38, y: -22 }, home: { x: 15, y: -6 },  exit: { x: 6, y: -20 } }
  ];

  // Fixed, non-scroll-driven tilt per chapter (degrees) -- a print
  // sitting very slightly askew rather than a rigid rectangle, one
  // small source of the compositional tension the brief asks for.
  const TILT = [-1.1, 0.9, -0.7, 1.2];

  const smoothstep = u => u * u * (3 - 2 * u);
  const clamp01 = u => Math.max(0, Math.min(1, u));
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Same hold-then-ease presence curve as v1: full presence within
  // HOLD of a photo's own dominant point, eased down to 0 at RANGE.
  const HOLD = 0.15;
  const RANGE = 0.74;
  function presence(d) {
    const ad = Math.abs(d);
    if (ad >= RANGE) return 0;
    if (ad <= HOLD) return 1;
    const t = (ad - HOLD) / (RANGE - HOLD);
    return 1 - smoothstep(t);
  }

  // Carried over from v1's fix: opacity does NOT track presence
  // directly. A photo stays fully solid through nearly all of its
  // own presence window and only fades in the outer FADE fraction of
  // RANGE, so two large overlapping prints read as one quietly
  // occluding another rather than ghosting into each other.
  const FADE = 0.16;
  function opacityFor(d) {
    const ad = Math.abs(d);
    if (ad >= RANGE) return 0;
    const solidTo = RANGE - FADE;
    if (ad <= solidTo) return 1;
    const t = (ad - solidTo) / FADE;
    return 1 - smoothstep(t);
  }

  // Refinement pass: choreography. Reviewed as "too much like a
  // fade/position animation"; asked for APPROACH -> PASS -> SETTLE --
  // the incoming photograph should feel like the viewpoint is moving
  // toward it through the same field, not just easing into place.
  // positionFor already handles the approach/settle (smoothstep glide
  // from entry to home, home to exit). passBump adds the "pass": a
  // small, smooth swelling in scale that peaks mid-transit and returns
  // to exactly zero at rest (d=0, fully home) and at the far edges (no
  // bump left over once a photo has properly arrived or fully left) --
  // read as the viewpoint drawing briefly nearer as it passes through
  // a photograph's depth on the way to settling square in front of it.
  // Deliberately small (see the 0.045 multiplier below) and touches
  // only scale, per "subtle changes... do not add exaggerated
  // perspective or additional visual effects."
  function passBump(t) {
    const at = Math.abs(t);
    if (at <= 0 || at >= 1) return 0;
    const peak = 0.34;
    const rise = smoothstep(clamp01(at / peak));
    const fall = 1 - smoothstep(clamp01((at - peak) / (1 - peak)));
    return rise * fall;
  }

  function positionFor(off, d) {
    const t = clampN(d, -1, 1);
    if (t <= 0) {
      const u = smoothstep(t + 1); // 0 at entry -> 1 at home
      return { x: lerp(off.entry.x, off.home.x, u), y: lerp(off.entry.y, off.home.y, u) };
    }
    const u = smoothstep(t); // 0 at home -> 1 at exit
    return { x: lerp(off.home.x, off.exit.x, u), y: lerp(off.home.y, off.exit.y, u) };
  }

  let wrapTop = 0;
  let scrollable = 0;
  function measure() {
    const rect = stageWrap.getBoundingClientRect();
    wrapTop = rect.top + window.scrollY;
    scrollable = stageWrap.offsetHeight - window.innerHeight;
  }

  let currentActive = -1;
  function render() {
    if (scrollable <= 0) return;
    const raw = clamp01((window.scrollY - wrapTop) / scrollable); // 0..1 across the whole stage
    const progress = raw * (N + 1) - 0.5; // -0.5 .. N+0.5

    photos.forEach((el, i) => {
      const d = progress - i;
      const p = presence(d);
      const pos = positionFor(OFFSETS[i], d);
      // Scale, brightness/saturation and a very light blur all track
      // presence -- a receding print visibly recedes, dims and
      // softens, like something further from the camera, which keeps
      // it legible as "still there" during a handoff without relying
      // on blur as the primary mechanism (it caps out just above 2px).
      const t = clampN(d, -1, 1);
      const scale = (0.44 + 0.56 * p) * (1 + 0.045 * passBump(t));
      const bright = 0.42 + 0.58 * p;
      const sat = 0.55 + 0.45 * p;
      const blur = (1 - p) * 2.2;
      el.style.transform =
        `translate(-50%, -50%) translate(${pos.x}vw, ${pos.y}vh) scale(${scale}) rotate(${TILT[i]}deg)`;
      el.style.opacity = String(opacityFor(d));
      el.style.filter = `brightness(${bright}) saturate(${sat}) blur(${blur}px)`;
      el.style.zIndex = String(Math.round(p * 100));
      el.style.pointerEvents = p > 0.5 ? 'auto' : 'none';
    });

    // Spotlight: interpolate between whichever two chapters' home
    // positions straddle the current progress, so the glow leads and
    // follows the viewpoint through the space rather than sitting
    // static or snapping between chapters.
    const lo = clampN(Math.floor(progress), 0, N - 1);
    const hi = clampN(Math.ceil(progress), 0, N - 1);
    const frac = clamp01(progress - lo);
    const homeLo = OFFSETS[lo].home;
    const homeHi = OFFSETS[hi].home;
    const sx = lerp(homeLo.x, homeHi.x, smoothstep(frac));
    const sy = lerp(homeLo.y, homeHi.y, smoothstep(frac));
    if (spotlight) {
      spotlight.style.background =
        `radial-gradient(46vw 46vh at calc(50% + ${sx}vw) calc(50% + ${sy}vh), rgba(214,196,168,0.10) 0%, rgba(214,196,168,0.04) 38%, transparent 68%)`;
    }

    const activeIndex = clampN(Math.round(progress), 0, N - 1);
    const dActive = progress - activeIndex;
    // Refinement pass: the label previously faded on `presence()` --
    // the soft hold-then-ease curve -- while the corresponding
    // photograph's own alpha is driven by the much steeper
    // `opacityFor()`, which stays fully solid through nearly all of
    // its presence window and only fades right at the edge. That
    // mismatch meant the label had visibly dimmed while its print was
    // still fully crisp on screen, reading as disconnected metadata
    // rather than belonging to it. The label's opacity now reuses the
    // exact same opacityFor() curve the active photograph's own alpha
    // uses, so the two fade together. Position settle (translateY)
    // still runs on the original, gentler presence() curve --
    // unchanged, per "keep the same position".
    const labelPresence = presence(dActive);
    const labelOpacity = opacityFor(dActive);
    if (activeIndex !== currentActive) {
      currentActive = activeIndex;
      const d = DATA[activeIndex];
      labelNum.textContent = d.num;
      labelTitle.textContent = d.title;
      labelMood.textContent = d.mood;
      progressCurrent.textContent = d.num;
    }
    labelEl.style.opacity = String(labelOpacity);
    labelEl.style.transform = `translateY(${(1 - labelPresence) * 10}px)`;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); render(); });

  measure();
  render();

  // Minimal .reveal fade-in for the reproduced Statement/Closing
  // lead-in, matching the live site's own IntersectionObserver
  // pattern but written fresh -- this prototype doesn't load
  // js/script.js.
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach(el => el.classList.add('pre'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pre');
        entry.target.classList.add('in');
      }
    });
  }, { threshold: 0.2 });
  revealEls.forEach(el => io.observe(el));
})();
