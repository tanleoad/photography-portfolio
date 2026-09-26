/* ============================================================
   STATEMENT pinned sequence (v1, 2026-09-25). Same isolated-module
   pattern as threshold.js/tanleo.js elsewhere on this page: two gates
   (isDesktopWidth/prefersReducedMotion), the same progress-calculation
   shape, the same rAF-throttled scroll handling, the same
   IntersectionObserver-gated listener attachment (perf-only, not a
   layout gate -- see syncClass()/syncListening() below, unchanged in
   structure from tanleo.js).

   This module exists because TANLEO's own v5 POINT OF VIEW/RECESS/
   BLACK opening beats were pulled out of js/tanleo.js and given their
   own dedicated section, #statement, immediately above #tanleo in the
   DOM -- Tan flagged the site's thesis ("I'm not photographing the
   world as it is. / I'm photographing the way it felt to me.") as
   effectively appearing twice on the page and asked for it to exist in
   exactly one place. Every internal detail of the three beats below --
   timing widths, easing, the per-word/per-line reveal technique, the
   -56px recede -- is carried over from v5's own POINT OF VIEW/RECESS
   unchanged; what's new is that they now drive their own standalone
   pinned section and progress axis (0..1 over THIS section's own
   track) rather than the leading slice of TANLEO's.
   Four beats (BLACK's own band shortened 2026-09-25 -- see the timing
   note below the beat list):
     0.0000-0.1333  POINT OF VIEW line 1 unfolds, word by word
     0.1056-0.2389  POINT OF VIEW line 2 unfolds (staggered, not simultaneous)
     0.2389-0.5778  POINT OF VIEW holds -- the major moment, held long
                    enough to actually be read at its large scale
     0.5778-0.8444  RECESS -- the thesis dissolves as one block: lifts
                    noticeably upward (-56px) while it fades, so the
                    recede itself reads as the thought actually leaving
                    the frame, not a quick fade before a stare at black
                    (the same -56px/wide-band recede v5 already used and
                    Tan explicitly approved -- carried over exactly, not
                    retuned)
     0.8444-1.0000  BLACK -- a genuine hold, nothing visible, "like
                    turning a page" -- short and intentional, never a
                    loading screen or dead air, before this section's
                    pin releases directly into TANLEO's own pin
                    immediately below, which begins at IDENTITY with no
                    beat left there to duplicate this one.
   Timing note, 2026-09-25: the original BLACK band (0.760-1.000 over a
   300vh track's 200vh scrollable range) held for ~48vh of actual
   scroll -- watching it back, Tan called that "longer than intended,"
   not a brief photographic breath. Shortening BLACK alone, without
   also shortening the track, would have changed nothing visually: no
   element has properties driven by anything past RECESS's end, so the
   screen already just sits black for whatever scroll distance remains
   before the pin releases, regardless of where a comment draws BLACK's
   boundary. So the fix is the track height in style.css (300vh ->
   280vh, i.e. 200vh scrollable -> 180vh): POV_L1/POV_L2/HOLD/RECESS's
   boundaries below are the exact same numbers as before, rescaled by
   200/180 so each one still starts and ends at the SAME real scroll
   distance (in vh) as the old 300vh track -- reveal, hold and the
   -56px recess are all untouched in felt pacing, confirmed by
   construction, not just by testing. Only the trailing BLACK band
   is genuinely shorter: 28vh of scrollable track (180vh x
   (1-0.8444)) instead of the old 48vh, and the pin now releases the
   instant BLACK ends -- no leftover unlabelled tail, nothing added.
   No veil element: BLACK is simply the moment nothing yet has an
   opacity, against the section's own solid background -- same
   technique js/tanleo.js already uses for its own BLACK beats.
   Progressive enhancement, exactly mirroring Threshold/TANLEO's own
   gate: the tall track/sticky pin/absolute placement in style.css only
   apply once this file has confirmed >=901px and no reduced-motion
   preference and added .statement-sequenced. Without that class the
   section is a plain static block, using the site's ordinary one-shot
   .reveal mechanic -- nothing here depends on JS to be legible.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('statement');
  var pin = section && section.querySelector('.statement-pin');
  if (!section || !pin) return;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isDesktopWidth() {
    return window.matchMedia('(min-width: 901px)').matches;
  }
  function gateOK() {
    return isDesktopWidth() && !prefersReducedMotion();
  }

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  // Linear 0..1 ramp between two progress values, clamped outside that band.
  function band(p, a, b) { return clamp01((p - a) / (b - a)); }
  // easeOutCubic -- the same settling character as the house
  // cubic-bezier(0.16,1,0.3,1) used by .reveal everywhere else.
  function ease(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

  // Word counts for the two lines (see the --wi indices on each line's
  // .tw spans in index.html) -- each line reveals via its own
  // independent counter so they can unfold staggered rather than
  // simultaneously, same technique v5 used.
  var POV_L1_WORDS = 8; // I'm / not / photographing / the / world / as / it / is.
  var POV_L2_WORDS = 8; // I'm / photographing / the / way / it / felt / to / me.

  function computeVars(p) {
    var povL1Ease = ease(band(p, 0.0000, 0.1333));
    var povL2Ease = ease(band(p, 0.1056, 0.2389));
    var recessEase = ease(band(p, 0.5778, 0.8444));
    var groupOpacity = 1 - recessEase;
    var groupY = -56 * recessEase;

    return {
      povL1Reveal: povL1Ease * POV_L1_WORDS,
      povL2Reveal: povL2Ease * POV_L2_WORDS,
      groupOpacity: groupOpacity,
      groupY: groupY
    };
  }

  function applyVars(v) {
    var s = section.style;
    s.setProperty('--stPovL1Reveal', v.povL1Reveal.toFixed(3));
    s.setProperty('--stPovL2Reveal', v.povL2Reveal.toFixed(3));
    s.setProperty('--stGroupOpacity', v.groupOpacity.toFixed(4));
    s.setProperty('--stGroupY', v.groupY.toFixed(2) + 'px');
  }

  function clearVars() {
    var props = ['--stPovL1Reveal', '--stPovL2Reveal', '--stGroupOpacity', '--stGroupY'];
    for (var i = 0; i < props.length; i++) section.style.removeProperty(props[i]);
  }

  // ---- Progress: raw scroll position mapped across the track's own
  // scrollable range (its height minus the 100vh the pin holds still
  // for), the same shape as threshold.js's/tanleo.js's progressNow(). ----
  var wrapperDocTop = 0;
  var scrollableH = 1;
  function measure() {
    var rect = section.getBoundingClientRect();
    wrapperDocTop = rect.top + window.scrollY;
    scrollableH = Math.max(1, section.offsetHeight - window.innerHeight);
  }
  function progressNow() {
    var raw = (window.scrollY - wrapperDocTop) / scrollableH;
    return clamp01(raw);
  }

  var rafId = null;
  var scrollTicking = false;
  function frame() {
    rafId = null;
    applyVars(computeVars(progressNow()));
  }
  function scheduleFrame() {
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      scrollTicking = false;
      scheduleFrame();
    });
  }
  function onResize() {
    measure();
    scheduleFrame();
  }

  var listening = false;
  function startListening() {
    if (listening) return;
    listening = true;
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    scheduleFrame();
  }
  function stopListening() {
    if (!listening) return;
    listening = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // .statement-sequenced governs LAYOUT (the tall track, the sticky
  // pin, the absolute placement) and is therefore decided purely by
  // gateOK() -- applied immediately on load and kept in sync with the
  // two matchMedia listeners below. It must NOT depend on viewport
  // proximity: toggling it only once the section nears the viewport
  // would change the section's height (and therefore the whole page's
  // scroll geometry) mid-scroll. nearViewport instead gates only
  // whether the scroll/resize listeners are attached -- a perf
  // optimisation (mirroring threshold.js's/tanleo.js's own use of
  // IntersectionObserver), never a layout decision.
  var nearViewport = false;
  function syncClass() {
    if (gateOK()) {
      section.classList.add('statement-sequenced');
    } else {
      section.classList.remove('statement-sequenced');
      clearVars();
    }
  }
  function syncListening() {
    if (gateOK() && nearViewport) {
      startListening();
    } else {
      stopListening();
    }
  }
  function syncAll() {
    syncClass();
    syncListening();
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      nearViewport = entries[i].isIntersecting;
    }
    syncListening();
  }, { rootMargin: '50% 0px 50% 0px' });
  io.observe(section);

  var mqlWidth = window.matchMedia('(min-width: 901px)');
  var mqlMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function onGateChange() { syncAll(); }
  if (mqlWidth.addEventListener) mqlWidth.addEventListener('change', onGateChange);
  if (mqlMotion.addEventListener) mqlMotion.addEventListener('change', onGateChange);

  syncClass();
})();
