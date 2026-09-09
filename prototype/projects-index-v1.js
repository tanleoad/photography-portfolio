// =========================================================
// PROTOTYPE — Projects Index v1 (continuous photographic field)
// =========================================================
// Isolated script for prototype/projects-index-v1.html. Not loaded
// by the live site. Deliberately written fresh here rather than
// reusing js/script.js -- this prototype has none of the persistent
// nav/menu-overlay/intro-overlay markup that file expects, and
// pulling it in would either error against missing elements or drag
// in unrelated site chrome that has nothing to do with the question
// this prototype exists to answer.
//
// The core idea: each of the four photographs has a continuous
// "presence" driven directly by scroll position -- never an on/off
// swap. A single scroll-derived `progress` value (roughly 0..3, one
// unit per chapter) is compared against each photo's own index to
// get a signed distance `d`. That distance drives three things in
// parallel: opacity/scale (via a hold-then-ease curve, the same
// shape the live site's Projects-proximity system already uses),
// and position (interpolated across the photo's own entry -> home ->
// exit path). Photos are threaded so each one's exit point is the
// next one's entry point, so the motion reads as one path through
// the same space rather than four separate crossfades.

(function () {
  const N = 4;
  const stageWrap = document.querySelector('.proto-stage-wrap');
  const photos = Array.from(document.querySelectorAll('.proto-photo'));
  const labelEl = document.querySelector('.proto-label');
  const labelNum = document.querySelector('.proto-label-num');
  const labelTitle = document.querySelector('.proto-label-title');
  const labelDesc = document.querySelector('.proto-label-desc');
  const progressCurrent = document.querySelector('.proto-progress-current');

  if (!stageWrap || photos.length !== N) return;

  // Real project copy, unchanged from index.html -- nothing invented.
  const DATA = [
    { num: '01', title: 'Street', desc: "Candid frames from the Corniche and the old souks — light, motion, and the city's unscripted rhythm." },
    { num: '02', title: 'Architecture', desc: 'Domes, arches, and quiet interiors, studied for how light moves through them.' },
    { num: '03', title: 'Portraits', desc: 'Faces and gestures, held in the same cinematic color language as the rest of the work.' },
    { num: '04', title: 'Photo Retouching', desc: 'Careful, restrained retouching that stays true to the original frame.' }
  ];

  // Entry / home / exit offsets in vw/vh, relative to dead-centre.
  // Each chapter's exit deliberately matches the next chapter's
  // entry, so the path zig-zags through the same handful of quiet
  // corners instead of every photo taking an identical route. Pushed
  // further out than the frames themselves so a receding photo has
  // genuinely cleared the incoming one's space by the time they'd
  // otherwise overlap -- an earlier pass left them landing on top of
  // each other mid-handoff, reading as a muddy double-exposure rather
  // than two photographs sharing a moment.
  const OFFSETS = [
    { entry: { x: 32, y: 22 },  home: { x: -3, y: 0 },  exit: { x: -34, y: -23 } },
    { entry: { x: -34, y: -23 }, home: { x: 4, y: -1 }, exit: { x: 34, y: 21 } },
    { entry: { x: 34, y: 21 },  home: { x: -3, y: 1 },  exit: { x: -32, y: -21 } },
    { entry: { x: -32, y: -21 }, home: { x: 3, y: 0 },  exit: { x: 0, y: -14 } }
  ];

  const smoothstep = u => u * u * (3 - 2 * u);
  const clamp01 = u => Math.max(0, Math.min(1, u));
  const lerp = (a, b, t) => a + (b - a) * t;

  // A photo is only ever present within RANGE of its own dominant
  // point, held at full presence for HOLD of that, then eased down.
  // Narrower than a full chapter-unit on purpose: at RANGE=1 (the
  // first pass) two adjacent photos were both still near 70% presence
  // at the transition's midpoint, simultaneously large and opaque
  // enough to visibly fight each other. RANGE=0.7 gives a steeper,
  // cleaner falloff -- both sides quieter at once -- while the two
  // curves still overlap enough that nothing ever fully vanishes
  // before its neighbour has appeared.
  const HOLD = 0.16;
  const RANGE = 0.7;
  function presence(d) {
    const ad = Math.abs(d);
    if (ad >= RANGE) return 0;
    if (ad <= HOLD) return 1;
    const t = (ad - HOLD) / (RANGE - HOLD);
    return 1 - smoothstep(t);
  }

  // Opacity deliberately does NOT track presence directly. Presence
  // (above) drives scale/position/brightness -- the smooth "recede
  // into the distance" motion -- but a receding and an incoming photo
  // both sitting at, say, 60% opacity in the same region reads as a
  // muddy double-exposure, not two photographs sharing a moment. Kept
  // fully opaque for nearly all of its own presence window instead,
  // fading only in the outermost FADE fraction of RANGE, so an
  // overlap between two photos reads as one solid print quietly
  // occluding another -- like a small stack of prints -- rather than
  // two ghosts blending into each other.
  const FADE = 0.14;
  function opacityFor(d) {
    const ad = Math.abs(d);
    if (ad >= RANGE) return 0;
    const solidTo = RANGE - FADE;
    if (ad <= solidTo) return 1;
    const t = (ad - solidTo) / FADE;
    return 1 - smoothstep(t);
  }

  function positionFor(off, d) {
    const t = Math.max(-1, Math.min(1, d));
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
    const progress = raw * (N + 1) - 0.5; // -0.5 .. N+0.5 -- half a unit of lead-in/out

    photos.forEach((el, i) => {
      const d = progress - i;
      const p = presence(d);
      const pos = positionFor(OFFSETS[i], d);
      // Scale and a brightness/saturation dip both track presence, so
      // a quiet neighbour doesn't just fade -- it visibly recedes and
      // dims, the way a background element in a real photograph reads
      // as further away, which keeps it legible as "still there" even
      // while two photos briefly share the frame during a handoff.
      const scale = 0.42 + 0.58 * p;
      const bright = 0.4 + 0.6 * p;
      const sat = 0.5 + 0.5 * p;
      el.style.transform = `translate(-50%, -50%) translate(${pos.x}vw, ${pos.y}vh) scale(${scale})`;
      el.style.opacity = String(opacityFor(d));
      el.style.filter = `brightness(${bright}) saturate(${sat})`;
      el.style.zIndex = String(Math.round(p * 100));
      el.style.pointerEvents = p > 0.5 ? 'auto' : 'none';
    });

    const activeIndex = Math.max(0, Math.min(N - 1, Math.round(progress)));
    const labelPresence = presence(progress - activeIndex);
    if (activeIndex !== currentActive) {
      currentActive = activeIndex;
      const d = DATA[activeIndex];
      labelNum.textContent = d.num;
      labelTitle.textContent = d.title;
      labelDesc.textContent = d.desc;
      progressCurrent.textContent = d.num;
    }
    labelEl.style.opacity = String(labelPresence);
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
