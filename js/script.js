// ============================================================
// Tanleo_ (tanleophotography) — shared behaviour
// ============================================================
//
// Two kinds of setup happen here:
//  - Persistent, site-wide behaviour (nav scroll state, the menu
//    overlay, the homepage intro) runs once, on the very first real
//    page load. These all live outside each page's [data-taxi-view]
//    content, so they're never removed or remounted by a client-side
//    page transition. (A tiny black camera-icon cursor and a brief
//    shutter-flash on meaningful clicks are approved as part of the
//    site's finished interaction language and belong here once built
//    -- not yet implemented; see the click-router comment further
//    down for the current no-op cursor stub.)
//  - Per-page content behaviour (scroll reveals, the homepage hero
//    exit, the hero's auto-cycling story list, the Projects Index
//    proximity system) lives inside window.initPageContent(). It
//    runs once on first load, and again after every Taxi.js
//    transition (see js/transitions.js), since that's the only thing
//    that swaps in fresh page content without a full reload — old
//    listeners are torn down first so they don't pile up as someone
//    clicks around the site.

/* ---- Per-page content: state for teardown between transitions ---- */
let _cheroCycleTimer = null;
let _cheroCycleHandlers = null;
let _heroExitScrollHandler = null;
let _heroExitResizeHandler = null;
let _heroTiltEl = null;
let _heroTiltMoveHandler = null;
let _heroTiltLeaveHandler = null;
let _projectsScrollHandler = null;
let _projectsResizeHandler = null;
let _projectsMql = null;
let _projectsMqlHandler = null;
let _projectsGateResizeHandler = null;
let _portraitsDwellScrollHandler = null;
let _archiveDriftScrollHandler = null;
let _archiveDriftResizeHandler = null;
let _sideNavObserver = null;
let _sideNavClickHandlers = null;
let _revealObserver = null;
let _revealSafetyTimeout = null;
let _introPhotoTimeout = null;
let _introPhotoSafetyTimeout = null;

function teardownPageContent() {
  if (_cheroCycleTimer) { clearInterval(_cheroCycleTimer); _cheroCycleTimer = null; }
  _cheroCycleHandlers = null;

  if (_heroExitScrollHandler) { window.removeEventListener('scroll', _heroExitScrollHandler); _heroExitScrollHandler = null; }
  if (_heroExitResizeHandler) { window.removeEventListener('resize', _heroExitResizeHandler); _heroExitResizeHandler = null; }

  if (_heroTiltEl) {
    if (_heroTiltMoveHandler) _heroTiltEl.removeEventListener('mousemove', _heroTiltMoveHandler);
    if (_heroTiltLeaveHandler) _heroTiltEl.removeEventListener('mouseleave', _heroTiltLeaveHandler);
  }
  _heroTiltEl = null; _heroTiltMoveHandler = null; _heroTiltLeaveHandler = null;

  if (_projectsScrollHandler) { window.removeEventListener('scroll', _projectsScrollHandler); _projectsScrollHandler = null; }
  if (_projectsResizeHandler) { window.removeEventListener('resize', _projectsResizeHandler); _projectsResizeHandler = null; }
  if (_projectsMql && _projectsMqlHandler) { _projectsMql.removeEventListener('change', _projectsMqlHandler); _projectsMql = null; _projectsMqlHandler = null; }
  if (_projectsGateResizeHandler) { window.removeEventListener('resize', _projectsGateResizeHandler); _projectsGateResizeHandler = null; }
  if (_portraitsDwellScrollHandler) { window.removeEventListener('scroll', _portraitsDwellScrollHandler); _portraitsDwellScrollHandler = null; }
  if (_archiveDriftScrollHandler) { window.removeEventListener('scroll', _archiveDriftScrollHandler); _archiveDriftScrollHandler = null; }
  if (_archiveDriftResizeHandler) { window.removeEventListener('resize', _archiveDriftResizeHandler); _archiveDriftResizeHandler = null; }

  if (_sideNavObserver) { _sideNavObserver.disconnect(); _sideNavObserver = null; }
  if (_sideNavClickHandlers) {
    _sideNavClickHandlers.forEach(({ el, handler }) => el.removeEventListener('click', handler));
    _sideNavClickHandlers = null;
  }

  if (_revealObserver) { _revealObserver.disconnect(); _revealObserver = null; }
  if (_revealSafetyTimeout) { clearTimeout(_revealSafetyTimeout); _revealSafetyTimeout = null; }

  if (_introPhotoTimeout) { clearTimeout(_introPhotoTimeout); _introPhotoTimeout = null; }
  if (_introPhotoSafetyTimeout) { clearTimeout(_introPhotoSafetyTimeout); _introPhotoSafetyTimeout = null; }
}

function initPageContent() {
  teardownPageContent();

  /* ---- Hero "Selected Stories" auto-cycle ----
     Titles/images advance on their own every 4.5s. On devices with a
     real pointer, it also pauses while the visitor's mouse is over the
     list (real :hover takes over via CSS). On touch/mobile there's no
     hover to pause on, so it just keeps cycling continuously — this is
     also what drives the full-bleed background photo behind the story
     list on mobile now (see .chero-media .story-media in style.css,
     no longer display:none under 780px), replacing the old static
     inline thumbnail per row with the same big-photo-changes-on-its-
     own effect desktop visitors see. */
  const cheroList = document.querySelector('.chero-list');
  const cheroHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (cheroList) {
    const storyLinks = Array.from(cheroList.querySelectorAll('.story-link'));
    const mediaByClass = {};
    storyLinks.forEach(link => {
      const slug = Array.from(link.classList).find(c => c.startsWith('s-'));
      if (slug) mediaByClass[slug] = document.querySelector('.chero-media .story-media.' + slug);
    });

    let cycleIndex = 0;

    const clearActive = () => {
      storyLinks.forEach(l => l.classList.remove('is-active'));
      Object.values(mediaByClass).forEach(m => m && m.classList.remove('is-active'));
    };

    const setActive = (i) => {
      clearActive();
      const link = storyLinks[i];
      if (!link) return;
      link.classList.add('is-active');
      const slug = Array.from(link.classList).find(c => c.startsWith('s-'));
      if (slug && mediaByClass[slug]) mediaByClass[slug].classList.add('is-active');
    };

    const startCycle = () => {
      setActive(cycleIndex);
      _cheroCycleTimer = setInterval(() => {
        cycleIndex = (cycleIndex + 1) % storyLinks.length;
        setActive(cycleIndex);
      }, 4500);
    };

    const stopCycle = () => {
      clearInterval(_cheroCycleTimer);
      _cheroCycleTimer = null;
      clearActive();
    };

    if (storyLinks.length) {
      startCycle();
      _cheroCycleHandlers = { startCycle, stopCycle };
      if (cheroHoverCapable) {
        cheroList.addEventListener('mouseenter', stopCycle);
        cheroList.addEventListener('mouseleave', startCycle);
      }
    }
  }

  /* ---- Hero: cursor-tilt parallax ----
     As the pointer moves anywhere over the hero — not just hovering a
     title — the whole photograph tilts very slightly toward it, like
     looking through a window as you walk past. This deliberately
     transforms .chero-media as one rigid block (photo + its darkening
     scrim together) rather than tracking which individual story photo
     is currently revealed, so it works automatically no matter which
     one CSS is currently showing via the existing hover-reveal (see
     the .chero:has(...) rules in style.css) — nothing about that
     reveal mechanic itself is touched. Desktop/hover-capable only,
     and off entirely if the visitor has motion reduction on or GSAP
     failed to load. */
  const cheroMedia = document.querySelector('.chero-media');
  const cheroEl = document.querySelector('.chero');
  const heroTiltEnabled = cheroMedia && cheroEl &&
    typeof window.gsap !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroTiltEnabled) {
    const MAX_TILT = 2.4; // degrees — subtle, not a gimmick
    gsap.set(cheroMedia, { transformPerspective: 1000, transformOrigin: 'center center' });
    const setTiltY = gsap.quickTo(cheroMedia, 'rotationY', { duration: 1, ease: 'power3' });
    const setTiltX = gsap.quickTo(cheroMedia, 'rotationX', { duration: 1, ease: 'power3' });

    _heroTiltEl = cheroEl;
    _heroTiltMoveHandler = (e) => {
      const r = cheroEl.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTiltY(px * MAX_TILT * 2);
      setTiltX(-py * MAX_TILT * 2);
    };
    _heroTiltLeaveHandler = () => { setTiltY(0); setTiltX(0); };
    cheroEl.addEventListener('mousemove', _heroTiltMoveHandler);
    cheroEl.addEventListener('mouseleave', _heroTiltLeaveHandler);
  }

  /* ---- Hero exit: scroll-tied zoom + fade ----
     As you scroll from the hero into the statement below it, the hero
     stays pinned in place for a short stretch (CSS position:sticky on
     .chero inside the taller .chero-wrap) while it quietly zooms in
     and fades to black — like a held shot before a cut — instead of
     just scrolling away. Desktop only; skipped on touch/narrow screens
     and when the visitor has motion reduction on, since .chero already
     has a plain static mobile layout. */
  const heroWrap = document.querySelector('.chero-wrap');
  const heroEl = document.querySelector('.chero');
  const heroExitEnabled = heroWrap && heroEl &&
    window.matchMedia('(min-width: 781px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroExitEnabled) {
    let heroTicking = false;
    const updateHeroExit = () => {
      heroTicking = false;
      const pinRange = heroWrap.offsetHeight - window.innerHeight;
      if (pinRange <= 0) { heroEl.style.transform = ''; heroEl.style.opacity = ''; return; }
      const wrapTop = heroWrap.getBoundingClientRect().top + window.scrollY;
      const scrollY = window.scrollY || window.pageYOffset;
      const progress = Math.min(Math.max((scrollY - wrapTop) / pinRange, 0), 1);
      heroEl.style.transform = `scale(${1 + progress * 0.08})`;
      heroEl.style.opacity = String(1 - progress);
    };
    _heroExitScrollHandler = () => {
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(updateHeroExit); }
    };
    _heroExitResizeHandler = updateHeroExit;
    window.addEventListener('scroll', _heroExitScrollHandler, { passive: true });
    window.addEventListener('resize', _heroExitResizeHandler);
    updateHeroExit();
  }

  /* ---- Scroll reveal ----
     Elements are visible by default in CSS. Only after we confirm
     IntersectionObserver works do we opt them into the pre-animation
     (hidden) state, so a JS failure never hides real content.
     2026-09-25: .archive-entry-text was briefly folded into this
     observer so project typography would fade in with its photograph.
     Reverted the same day (Tan, "PROJECTS -- REVIEW OF CURRENT
     RENDER"): typography must never depend on IntersectionObserver
     timing at all -- it should simply render normally, like type on a
     page. .archive-entry-text is deliberately NOT selected here. */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    revealEls.forEach(el => { el.classList.add('pre'); el.classList.remove('in'); });
    _revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          entry.target.classList.remove('pre');
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => _revealObserver.observe(el));

    // Safety net: if something never intersects (edge cases, fast scroll,
    // odd viewport), force it visible after a few seconds regardless.
    _revealSafetyTimeout = setTimeout(() => {
      document.querySelectorAll('.reveal.pre').forEach(el => {
        el.classList.add('in');
        el.classList.remove('pre');
      });
    }, 4000);
  }

  /* ---- Category pages: release the held-still opening photograph ----
     js/transitions.js already decided, before this page was painted,
     whether the big opening photograph should hold still first (see
     the .intro-pending comment on .cat-hero-photo in style.css). If it
     did, this is what ends the pause and lets the photograph fade in.
     A genuine hard/direct load never runs that transitions.js code at
     all, so .intro-pending won't be present here — the photograph is
     simply visible right away on that path, the same trade-off already
     accepted for .reveal above. */
  const introPhoto = document.querySelector('.cat-hero-photo.intro-pending');
  if (introPhoto) {
    _introPhotoTimeout = setTimeout(() => {
      introPhoto.classList.remove('intro-pending');
    }, 2600);
    // Safety net, same idea as the .reveal one above.
    _introPhotoSafetyTimeout = setTimeout(() => {
      introPhoto.classList.remove('intro-pending');
    }, 6000);
  }

  /* ---- Projects archive: exhibition choreography (redesign 2026-09-25) ----
     Every value is a direct function of scroll position, computed in a
     rAF-throttled scroll handler: nothing runs on a timer, nothing plays
     by itself -- stop scrolling and the exhibition stops with you. The
     holds and the spreads are CSS (position: sticky and
     plain layout, see css/style.css "Projects -- a small photographic
     exhibition"); this adds, per entry, measured from the entry's
     untransformed layout:
       ARRIVAL  -- the column (title + photograph together) is eased
                   into its held position: it starts slowly, and comes
                   to rest instead of stopping dead where sticky
                   catches it. On desktop the rise takes a set share of
                   a full-page scroll (css --arrive, 72%; the same for
                   all four): it enters at the page's own speed and
                   eases to rest. (data-ease / data-arrive can override
                   this per entry; no entry currently does.) Meanwhile the plate travels in from
                   its side (data-enter, desktop only) and grows from
                   its first data-scale value to full size; inside the
                   frame the photograph starts a few percent larger and
                   travels slightly against the frame, so the frame
                   seems to open onto it. The title travels with the
                   plate at a little over half its speed and settles
                   into alignment with the plate's edge exactly as the
                   photograph comes to rest.
       HOLD     -- nothing moves.
       HANDOFFS -- the same at every handoff: the held work
                   (data-recede) recedes a touch and gives way sideways
                   as the next rises beside it; the two then rest on
                   one line together. The new work (data-closer) comes
                   forward slightly as the earlier one lifts away, into
                   the space it leaves.
       DEPARTURE-- released, the column lifts off gently (it does not
                   jump to scroll speed; on desktop it eases up to 1.5x
                   the page's speed, css --lift), drifts toward data-exit and
                   recedes to its second data-scale value. The title
                   stays with its photograph throughout.
     Below 1024px: no sideways travel (half the drift on phones).
     Position and scale only -- the photograph's colours are never
     touched (no opacity, filter, blend). Skipped entirely under
     prefers-reduced-motion. */
  const archiveEntries = Array.from(document.querySelectorAll('.archive-entry')).map(entry => {
    const list = (v, d) => ((v || d).split(',').map(Number));
    const [ex, ey] = list(entry.dataset.enter, '0,0');
    const [xx, xy] = list(entry.dataset.exit, '0,0');
    const [s0, sx] = list(entry.dataset.scale, '1,1');
    const [rs, rx] = list(entry.dataset.recede, '1,0');
    return {
      entry,
      inner: entry.querySelector('.archive-entry-inner'),
      plate: entry.querySelector('.archive-entry-photo'),
      text: entry.querySelector('.archive-entry-text'),
      img: entry.querySelector('.archive-entry-photo img'),
      ex, ey, xx, xy, s0, sx, rs, rx,
      closer: parseFloat(entry.dataset.closer) || 1,
      slow: entry.dataset.ease === 'slow',
      arrive: parseFloat(entry.dataset.arrive) || 0,
      T: 0, sticky: false, w: 0, h: 0, ox: 0
    };
  }).filter(e => e.inner && e.plate && e.text);
  const reduceMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (archiveEntries.length && !reduceMotionMql.matches) {
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const clampN = (v, m) => Math.max(-m, Math.min(m, v));
    const smooth = t => t * t * (3 - 2 * t);
    const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
    // Desktop arrival curve over a shortened rise (c < 1): enters at
    // exactly the page's speed, eases to rest with no jolt.
    const arrivalCurve = c => t => c * t + (3 - 2 * c) * t * t + (c - 2) * t * t * t;
    const archiveSection = document.querySelector('.projects-archive');
    let arriveShare = 1, liftK = 0;

    // Static measurements: only change on resize.
    function measureArchive() {
      if (archiveSection) {
        const cs = getComputedStyle(archiveSection);
        arriveShare = parseFloat(cs.getPropertyValue('--arrive')) || 1;
        liftK = parseFloat(cs.getPropertyValue('--lift')) || 0;
      }
      archiveEntries.forEach(e => {
        e.c = arriveShare < 1 ? (e.arrive || arriveShare) : 1;
        e.ease = e.c < 1 ? arrivalCurve(e.c) : (e.slow ? smoother : smooth);
        const cs = getComputedStyle(e.inner);
        e.sticky = cs.position === 'sticky';
        e.T = e.sticky ? parseFloat(cs.top) : window.innerHeight * 0.2;
        e.I = e.inner.offsetHeight;
        e.w = e.plate.offsetWidth;
        e.h = e.plate.offsetHeight;
        e.ox = parseFloat(getComputedStyle(e.plate).transformOrigin) || 0;
        // The most a held plate may grow and still fit whole on screen.
        e.room = (window.innerHeight - e.T - (e.I - e.h) - 12) / Math.max(1, e.h);
      });
    }

    function renderArchiveChoreography() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const kx = vw >= 1024 ? Math.min(1, vw / 1440) : 0;
      const ky = vw <= 780 ? 0.5 : 1;
      const R = vh * 0.5; // distance over which a released column lifts off

      // Read everything first...
      const st = archiveEntries.map(e => {
        const a = e.entry.getBoundingClientRect();
        // The column's layout top (sticky: held at T inside its entry).
        const Y = e.sticky ? Math.min(Math.max(a.top, e.T), a.bottom - e.I) : a.top;
        const d = Math.max(1, e.c * (vh - e.T));                  // arrival distance
        const p = clamp01((e.T + d - a.top) / d);                 // arrival
        const q = Math.max(0, e.T - Y);                           // px since release
        return { a, p, d, E: e.ease(p), q };
      });

      // ...then write.
      archiveEntries.forEach((e, i) => {
        const { a, p, d, E, q } = st[i];
        // Arrival: eased path from the bottom of the screen to T. Until
        // the arrival begins, the column waits just below the screen.
        const arrive = a.top <= e.T ? 0
          : a.top > e.T + d ? Math.max(0, vh - a.top)
          : (vh - (vh - e.T) * E) - a.top;
        // Departure: lifts off from rest, easing up to (1 + liftK) x
        // the page's speed over R.
        const u = clamp01(q / R);
        const depart = q > 0
          ? R * u * (1 - u) * (1 - u) - liftK * (q - R * (u - u * u / 2))
          : 0;
        const t = smooth(clamp01(q / Math.max(1, e.I * 0.8)));

        const next = st[i + 1];
        const rn = (e.rs !== 1 || e.rx) && next ? next.E : 0;
        const prev = st[i - 1];
        const cp = e.closer !== 1 && prev ? smooth(clamp01(prev.q / R)) : 0;

        const s = Math.min(
          (e.s0 + (1 - e.s0) * E)
            * (1 - (1 - e.rs) * rn)
            * (1 + (e.closer - 1) * cp)
            * (1 - (1 - e.sx) * t),
          Math.max(1, e.room));
        const xArrive = kx * e.ex * (1 - E);
        const x = xArrive + kx * (e.rx * rn + e.xx * t);
        const y = arrive + depart + ky * (e.ey * (1 - E) + e.xy * t);

        // The title follows the plate's left edge: at 55% while the
        // photograph arrives, exactly once it has.
        const edge = x + (1 - s) * e.ox;
        const tx = edge * (p < 1 ? 0.55 : 1);

        // The frame opening onto the photograph (arrival only).
        const is = 1 + 0.06 * (1 - E);
        const ix = clampN(-0.3 * xArrive, (is - 1) * e.w / 2);
        const iy = clampN(-0.3 * arrive, (is - 1) * e.h / 2);

        e.plate.style.setProperty('--plate-x', x.toFixed(1) + 'px');
        e.plate.style.setProperty('--plate-y', y.toFixed(1) + 'px');
        e.plate.style.setProperty('--plate-s', s.toFixed(4));
        e.text.style.setProperty('--text-x', tx.toFixed(1) + 'px');
        e.text.style.setProperty('--text-y', y.toFixed(1) + 'px');
        if (e.img) {
          e.img.style.setProperty('--img-x', ix.toFixed(1) + 'px');
          e.img.style.setProperty('--img-y', iy.toFixed(1) + 'px');
          e.img.style.setProperty('--img-s', is.toFixed(4));
        }
      });
    }

    let archiveTicking = false;
    _archiveDriftScrollHandler = () => {
      if (archiveTicking) return;
      archiveTicking = true;
      requestAnimationFrame(() => { renderArchiveChoreography(); archiveTicking = false; });
    };
    _archiveDriftResizeHandler = () => { measureArchive(); renderArchiveChoreography(); };
    window.addEventListener('scroll', _archiveDriftScrollHandler, { passive: true });
    window.addEventListener('resize', _archiveDriftResizeHandler);

    measureArchive();
    renderArchiveChoreography();
  }

  /* ---- Superseded 2026-09-09 by Projects index v2 above ----
     Nothing in index.html carries .project-photo-mat anymore, so
     projectMats.length is always 0 below and this entire block is
     inert (it returns/no-ops without attaching any listeners). Left
     in place rather than removed — outside the scope of the
     2026-09-09 production-integration checkpoint; safe for Tan to
     delete later if she wants the file shorter. */
  /* ---- Projects index: photograph proximity ----
     Each threshold's photo mat carries --proximity (read by
     .project-photo-frame in style.css to drive opacity/translateY/
     scale/saturation/contrast — see that comment for the exact
     values). Coupled handoff model, added 2026-09-07 to replace an
     earlier version where each mat computed presence purely from its
     own distance to viewport-center, independent of its neighbours —
     a live scroll test showed that read as two separate fades
     bottoming out together rather than one photograph yielding to the
     next. This version measures each mat's falloff distance as the
     REAL gap to its actual neighbour on either side (not a fixed
     constant), and within that gap presence follows a hold-then-ease
     curve: full strength for the first ~28% of the distance out from
     settled, then a smooth eased decline. The incoming neighbour runs
     the same curve in reverse, so it's already visibly rising while
     the outgoing one is still near full strength, and the literal
     midpoint between two thresholds lands around ~0.78 rather than
     fading toward a shared dim floor.
     Desktop-only, rAF-throttled and measured via getBoundingClientRect.
     The desktop/mobile check is a live matchMedia listener rather
     than a one-time check at load, so resizing across the 900px
     breakpoint after the page has already loaded correctly hands off
     to (or back from) the .reveal-only mobile fallback instead of
     leaving this effect running on top of the mobile/stacked layout. */
  const projectMats = Array.from(document.querySelectorAll('.project-photo-mat'));
  const closingEl = document.querySelector('.closing');
  if (projectMats.length) {
    const HOLD = 0.28; // fraction of the gap held at full presence before easing begins
    const ease = u => u * u * (3 - 2 * u); // smoothstep
    const presenceFromT = t => (t <= HOLD ? 1 : 1 - ease(Math.min(1, (t - HOLD) / (1 - HOLD))));

    let projectsTicking = false;
    const updateProjectsProximity = () => {
      projectsTicking = false;
      const viewportH = window.innerHeight;
      const viewportCenter = window.scrollY + viewportH / 2;
      const fallbackGap = viewportH * 0.62; // same-feel fallback for the first/last mat's open side

      const centers = projectMats.map(el => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
      });

      projectMats.forEach((el, i) => {
        const gapPrev = i > 0 ? centers[i] - centers[i - 1] : fallbackGap;
        const gapNext = i < projectMats.length - 1 ? centers[i + 1] - centers[i] : fallbackGap;
        const offset = viewportCenter - centers[i];
        const gap = offset >= 0 ? gapNext : gapPrev;
        const t = Math.min(1, Math.abs(offset) / Math.max(1, gap));
        el.style.setProperty('--proximity', presenceFromT(t).toFixed(3));
      });

      // Closing quote: recedes as the visitor scrolls past it toward Street
      // (centers[0]), using the same hold-then-ease curve as every other
      // handoff in this system. It has no "prev" neighbour of its own, so it
      // simply stays at full presence until the viewport center passes its
      // own center, then eases out over the real gap to Street.
      if (closingEl) {
        const closingRect = closingEl.getBoundingClientRect();
        const closingCenter = closingRect.top + window.scrollY + closingRect.height / 2;
        const closingGap = Math.max(1, centers[0] - closingCenter);
        const closingOffset = Math.max(0, viewportCenter - closingCenter);
        const closingT = Math.min(1, closingOffset / closingGap);
        closingEl.style.setProperty('--proximity', presenceFromT(closingT).toFixed(3));
      }
    };

    _projectsScrollHandler = () => {
      if (!projectsTicking) { projectsTicking = true; requestAnimationFrame(updateProjectsProximity); }
    };
    _projectsResizeHandler = updateProjectsProximity;

    let projectsActive = false;
    const activateProjects = () => {
      if (projectsActive) return;
      projectsActive = true;
      window.addEventListener('scroll', _projectsScrollHandler, { passive: true });
      window.addEventListener('resize', _projectsResizeHandler);
      updateProjectsProximity();
    };
    const deactivateProjects = () => {
      if (!projectsActive) return;
      projectsActive = false;
      window.removeEventListener('scroll', _projectsScrollHandler);
      window.removeEventListener('resize', _projectsResizeHandler);
      // Hand off cleanly to the mobile/reduced-motion fallback: clear the
      // inline value so CSS's var(--proximity, 1) default takes over and
      // the .reveal fade already on each .project-threshold is what's
      // driving visibility instead.
      projectMats.forEach(el => el.style.removeProperty('--proximity'));
      closingEl && closingEl.style.removeProperty('--proximity');
      if (portraitsDwellTimer) { clearTimeout(portraitsDwellTimer); portraitsDwellTimer = null; }
      portraitsMeta && portraitsMeta.classList.remove('portraits-attended');
    };

    /* ---- Portraits: attention reward ----
       Coherence pass, 2026-09-07. Portraits is the one chapter meant
       to reward dwelling rather than movement (see
       claude/held-print-interaction-system-v1.md). Adds
       .portraits-attended to the chapter's .project-meta once the
       visitor holds still for a beat with the photograph at full
       presence -- the CSS above only lets the already-visible
       description quietly deepen in response. Nothing is added to or
       removed from the page; a visitor who never dwells sees exactly
       the same content as one who does. Deliberately not folded into
       updateProjectsProximity above: it only needs a plain, cheap
       readback of the value that system already maintains, not a
       hook into its own rAF loop. */
    const portraitsFrame = document.querySelector('.project-threshold--portraits .project-photo-frame');
    const portraitsMeta = document.querySelector('.project-threshold--portraits .project-meta');
    let portraitsDwellTimer = null;
    if (portraitsFrame && portraitsMeta) {
      const PORTRAITS_DWELL_MS = 900;
      const checkPortraitsDwell = () => {
        if (portraitsDwellTimer) { clearTimeout(portraitsDwellTimer); portraitsDwellTimer = null; }
        portraitsMeta.classList.remove('portraits-attended');
        const proximity = parseFloat(getComputedStyle(portraitsFrame).getPropertyValue('--proximity'));
        if (proximity >= 0.999) {
          portraitsDwellTimer = setTimeout(() => {
            portraitsMeta.classList.add('portraits-attended');
          }, PORTRAITS_DWELL_MS);
        }
      };
      let portraitsDwellTicking = false;
      _portraitsDwellScrollHandler = () => {
        if (!projectsActive || portraitsDwellTicking) return;
        portraitsDwellTicking = true;
        requestAnimationFrame(() => { portraitsDwellTicking = false; checkPortraitsDwell(); });
      };
      window.addEventListener('scroll', _portraitsDwellScrollHandler, { passive: true });
    }
    const checkProjectsGate = () => {
      const shouldRun = window.matchMedia('(min-width: 901px)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (shouldRun) activateProjects(); else deactivateProjects();
    };

    // Primary trigger: a plain, unconditionally-attached resize listener,
    // re-checked on every resize regardless of current state. This is the
    // one that's actually relied on — belt-and-suspenders below with a
    // MediaQueryList 'change' listener too, but a live resize test during
    // development showed 'change' alone didn't reliably re-fire when
    // crossing back up through the breakpoint after loading below it, so
    // this plain listener is the mechanism doing the real work.
    _projectsGateResizeHandler = checkProjectsGate;
    window.addEventListener('resize', _projectsGateResizeHandler);

    _projectsMql = window.matchMedia('(min-width: 901px)');
    _projectsMqlHandler = checkProjectsGate;
    _projectsMql.addEventListener('change', _projectsMqlHandler);

    checkProjectsGate();
  }

  /* ---- Persistent side nav: scroll-spy ----
     Added 2026-08-15 alongside the single-continuous-scroll rebuild
     (see claude/continuous-scroll-architecture-proposal.md). Reuses
     the exact same technique as the .reveal system just above —
     IntersectionObserver, opt-in, nothing hidden if it fails to run —
     just aimed at the four section boundaries instead of individual
     elements. rootMargin shrinks the observed viewport to a thin band
     around its vertical center, so a section only counts as "current"
     once it's actually crossed roughly the middle of the screen,
     rather than the instant its top edge appears — avoids flicker
     right at a section boundary. Runs once per page load/transition;
     harmless no-op on any page without a #sideNav (i.e. every page
     except this one). The observer and click handlers are stored in
     module-level state (see teardownPageContent() above) rather than
     left anonymous/local -- #sideNav itself lives outside
     [data-taxi-view] and survives every Taxi transition, so without
     this a second lap through initPageContent() would attach a second
     observer and a second set of click handlers on top of the first,
     with no way to ever remove either. */
  const sideNav = document.getElementById('sideNav');
  if (sideNav) {
    const sideNavLinks = Array.from(sideNav.querySelectorAll('a[href^="#"]'));
    const sideNavSections = sideNavLinks
      .map(a => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);
    const setActiveSideNav = (id) => {
      sideNavLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    };
    if ('IntersectionObserver' in window && sideNavSections.length) {
      _sideNavObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSideNav(entry.target.id);
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      sideNavSections.forEach(sec => _sideNavObserver.observe(sec));
    }
    // Mark the clicked destination active immediately, rather than
    // waiting for the smooth-scroll animation to finish and the
    // observer to catch up — avoids a brief flicker/lag on click.
    _sideNavClickHandlers = sideNavLinks.map(a => {
      const handler = () => setActiveSideNav(a.getAttribute('href').slice(1));
      a.addEventListener('click', handler);
      return { el: a, handler };
    });
    setActiveSideNav('home');
  }
}
window.initPageContent = initPageContent;

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Prefetch every internal page shortly after load ----
     Taxi's own navigateTo() (js/transitions.js) fetches a destination
     page's HTML fresh over the network the moment a link is clicked —
     prefetching is deliberately off there (see that file's comments)
     since it's tied to a link selector Taxi never actually sees. On a
     slow or just-cold connection, that fetch can visibly take a
     second or two, during which nothing happens on screen: the site
     just sits there looking stuck, until the response finally lands
     and the transition suddenly continues.
     Warming the browser's own HTTP cache for every internal page
     during idle time after load means that fetch almost always
     resolves instantly from cache instead, no matter which link ends
     up getting clicked. Runs once, globally, on the real page load —
     the warmed cache stays useful for every Taxi transition
     afterward, not just the first one. */
  (function prefetchInternalPages() {
    // portfolio/about/contact/street/architecture/portraits.html were
    // merged into index.html as in-page sections on 2026-08-15 (see
    // claude/continuous-scroll-architecture-proposal.md) and are now
    // just thin redirect stubs — nothing left worth prefetching there.
    // services.html/workshops.html stay out of this list, same as
    // before: they're still on the older, unmerged template.
    const pages = ['index.html'];
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const run = () => {
      pages.filter(p => p !== current).forEach(p => {
        fetch(p, { credentials: 'same-origin' }).catch(() => {});
      });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 1500);
    }
  })();

  /* ---- Nav scroll state ---- */
  const nav = document.querySelector('.site-nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Home: full-screen menu overlay ---- */
  const menuTrigger = document.getElementById('menuTrigger');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');
  if (menuTrigger && menuOverlay) {
    const menuSlides = menuOverlay.querySelectorAll('.menu-overlay-image-slide');
    let menuSlideIndex = 0;
    let menuSlideTimer = null;

    const startMenuSlideshow = () => {
      if (!menuSlides.length) return;
      menuSlideTimer = setInterval(() => {
        menuSlides[menuSlideIndex].classList.remove('active');
        menuSlideIndex = (menuSlideIndex + 1) % menuSlides.length;
        menuSlides[menuSlideIndex].classList.add('active');
      }, 3200);
    };
    const stopMenuSlideshow = () => {
      clearInterval(menuSlideTimer);
    };

    const openMenu = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      menuOverlay.classList.add('open');
      menuTrigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';
      startMenuSlideshow();
    };
    const closeMenu = () => {
      menuOverlay.classList.remove('open');
      menuTrigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      stopMenuSlideshow();
    };
    // Used specifically when a menu link is about to navigate away.
    // The overlay's normal close is a graceful 0.45s fade — fine when
    // you're staying on the page (the X button, Escape), but the
    // overlay sits at a much higher z-index than everything else so
    // it can cover the page while open, and that fade was still
    // running (and still on top) after the destination page's own
    // transition had already started underneath it — the overlay
    // visibly lingering over the incoming page rising into place. The
    // whole page is about to be replaced anyway, so there's nothing to
    // gain from the graceful fade here; closing instantly clears it
    // before the page transition even begins.
    const closeMenuInstant = () => {
      menuOverlay.classList.add('no-transition');
      closeMenu();
      void menuOverlay.offsetWidth; // force the instant close to apply now
      requestAnimationFrame(() => menuOverlay.classList.remove('no-transition'));
    };
    menuTrigger.addEventListener('click', openMenu);
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    menuOverlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenuInstant));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---- Homepage intro (index.html only, plays only on a true fresh
     load — a client-side page transition back to the homepage never
     re-adds this markup, so it never replays mid-visit) ---- */
  const introOverlay = document.getElementById('introOverlay');
  if (introOverlay) {
    document.body.classList.add('intro-active');
    const introLetters = introOverlay.querySelectorAll('.intro-name span');
    const introLastDelay = (introLetters.length - 1) * 150;
    const introLetterDuration = 700;
    const introHoldTime = 600;
    // How long the whole panel takes to drag itself up and off the top
    // of the screen (see .intro-overlay.intro-hide in css/style.css) —
    // matches that CSS transition's duration so the element isn't
    // removed from the DOM until it's actually finished leaving.
    const introSlideTime = 1300;
    setTimeout(() => {
      introOverlay.classList.add('intro-hide');
      document.body.classList.remove('intro-active');
      setTimeout(() => introOverlay.remove(), introSlideTime);
    }, introLastDelay + introLetterDuration + introHoldTime);
  }

  /* ---- Site-wide: camera cursor + shutter flash ----
     Added 2026-09-08. Runs once, on every page -- persistent and
     site-wide like the click router just below, so it's never torn
     down or rebuilt by a Taxi transition. Two small pieces:
       - .site-cursor: a 16px black camera glyph that replaces the
         native pointer on desktop/fine-pointer devices only (see the
         media query and the html.has-camera-cursor rules in
         css/style.css). Position is set directly from pointermove
         with no CSS transition on it, so it tracks 1:1 with no lag,
         bounce, or eased catch-up. Touch/coarse-pointer devices never
         get the html.has-camera-cursor class, so the native cursor
         (irrelevant there anyway) is untouched.
       - fireShutterFlash(): a single reusable element repositioned
         and re-animated (via the Web Animations API, cancelling any
         flash already in flight first) at the click point, instead of
         creating a new DOM node per click -- rapid clicking re-triggers
         the same flash rather than piling several up. Called from the
         click router below for any click landing on an actual
         interactive control; skipped entirely under
         prefers-reduced-motion. Purely visual and fire-and-forget --
         it never delays or blocks the navigation logic beneath it. */
  (function initCameraCursor() {
    const pointerQuery = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cursorEl = document.createElement('div');
    cursorEl.className = 'site-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="9.5" y="5" width="5" height="2.4" rx="0.6" fill="#0a0908"></rect>' +
        '<rect x="3" y="7.4" width="18" height="11.6" rx="2.2" fill="#0a0908"></rect>' +
        '<circle cx="12" cy="13.2" r="3.1" fill="none" stroke="#f3f0e9" stroke-width="1.3"></circle>' +
      '</svg>';
    document.body.appendChild(cursorEl);

    const flashEl = document.createElement('div');
    flashEl.className = 'site-cursor-flash';
    flashEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flashEl);

    let cursorActive = false;
    let cursorSeen = false; // true once a real pointermove has placed it, so it never flashes in from (0,0)

    const setCursorActive = (active) => {
      cursorActive = active;
      document.documentElement.classList.toggle('has-camera-cursor', active);
      if (!active) {
        cursorEl.style.opacity = '0';
        cursorSeen = false;
      }
    };
    setCursorActive(pointerQuery.matches);
    const onPointerCapabilityChange = () => setCursorActive(pointerQuery.matches);
    if (pointerQuery.addEventListener) pointerQuery.addEventListener('change', onPointerCapabilityChange);
    else if (pointerQuery.addListener) pointerQuery.addListener(onPointerCapabilityChange); // older Safari

    window.addEventListener('pointermove', (e) => {
      if (!cursorActive || e.pointerType !== 'mouse') return;
      cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      if (!cursorSeen) {
        cursorSeen = true;
        cursorEl.style.opacity = '1';
      }
    }, { passive: true });

    // Don't leave the glyph sitting frozen over the browser chrome
    // once the real pointer has left the page.
    document.addEventListener('mouseout', (e) => {
      if (cursorActive && !e.relatedTarget && !e.toElement) {
        cursorEl.style.opacity = '0';
        cursorSeen = false;
      }
    });

    let flashAnim = null;
    function fireShutterFlash(x, y) {
      if (!cursorActive || reducedMotion()) return;
      flashEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (flashAnim) flashAnim.cancel();
      flashAnim = flashEl.animate(
        [
          { opacity: 0, transform: flashEl.style.transform + ' scale(0.55)' },
          { opacity: 0.9, transform: flashEl.style.transform + ' scale(1)', offset: 0.2 },
          { opacity: 0, transform: flashEl.style.transform + ' scale(1.2)' }
        ],
        { duration: 360, easing: 'ease-out' }
      );
    }

    window.siteCursor = { fireShutterFlash };
  })();

  /* ---- Site-wide: click-to-navigate router ----
     Runs once, on every page. Hands internal link clicks off to the
     page-transition system (js/transitions.js) so the destination
     swaps in smoothly instead of a hard reload, and falls back to a
     normal navigation if that router never loaded (CDN blocked,
     offline) — the site works exactly the same either way, just
     without the swap animation. In-page anchors, new-tab clicks,
     modified clicks, and mailto/tel links are left alone. Also fires
     the shutter flash above for any click on an actual interactive
     control, independent of whether that same click also triggers
     in-app navigation below -- one shared listener rather than a
     second document-wide click handler duplicating this one. */
  document.addEventListener('click', (e) => {
    if (e.button === 0) {
      const control = e.target.closest(
        'a, button, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], select, [role="button"]'
      );
      if (control && !control.disabled) {
        window.siteCursor.fireShutterFlash(e.clientX, e.clientY);
      }
    }

    const link = e.target.closest('a[href]');
    if (
      link &&
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
      link.target !== '_blank' &&
      link.getAttribute('href').charAt(0) !== '#' &&
      link.href.indexOf(window.location.origin) === 0
    ) {
      // retouching.html (the Beauty Archive corridor) and street.html
      // (the Street photographic wall, rebuilt 2026-09-10 from the
      // approved prototype) are both fully standalone documents --
      // their own <html>/<head>/<body>, no shared nav or footer, no
      // [data-taxi-view] wrapper, none of the markup the onEnter/
      // onLeave handlers in js/transitions.js expect to find on an
      // incoming page. Routing either through window.siteTaxi.navigateTo()
      // like every other internal link means Taxi fetches it, can't
      // find what it's looking for, and the transition silently goes
      // nowhere -- from the visitor's side, clicking "Photo Retouching"
      // or "Street" simply does nothing. A plain full navigation has
      // always worked for these pages, so both skip Taxi entirely, same
      // as the CDN-blocked/offline fallback below already does for
      // every link when the transition system never loaded at all.
      const isStandaloneCorridor = /\/(retouching|street)\.html(?:[?#]|$)/.test(link.pathname);
      e.preventDefault();
      const dest = link.href;
      if (window.siteTaxi && !isStandaloneCorridor) {
        window.siteTaxi.navigateTo(dest, undefined, link);
      } else {
        window.location.href = dest;
      }
    }
  });

  initPageContent();
});
