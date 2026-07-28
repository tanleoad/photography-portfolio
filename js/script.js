// ============================================================
// Tania Khan Photography — shared behaviour
// ============================================================
//
// Two kinds of setup happen here:
//  - Persistent, site-wide behaviour (nav scroll state, the camera
//    cursor, the click flash, the menu overlay, the homepage intro)
//    runs once, on the very first real page load. These all live
//    outside each page's [data-taxi-view] content, so they're never
//    removed or remounted by a client-side page transition.
//  - Per-page content behaviour (scroll reveals, the homepage hero
//    exit, the hero's auto-cycling story list, the Work index's
//    hover-reveal photographs) lives inside window.
//    initPageContent(). It runs once on first load, and again after
//    every Taxi.js transition (see js/transitions.js), since that's
//    the only thing that swaps in fresh page content without a full
//    reload — old listeners are torn down first so they don't pile
//    up as someone clicks around the site.

/* ---- Per-page content: state for teardown between transitions ---- */
let _cheroCycleTimer = null;
let _cheroCycleHandlers = null;
let _heroExitScrollHandler = null;
let _heroExitResizeHandler = null;
let _heroTiltEl = null;
let _heroTiltMoveHandler = null;
let _heroTiltLeaveHandler = null;
let _parallaxScrollHandler = null;
let _parallaxResizeHandler = null;
let _revealObserver = null;
let _revealSafetyTimeout = null;
let _workStageKeydownHandler = null;
let _introPhotoTimeout = null;
let _introPhotoSafetyTimeout = null;
let _stageDevelopTimer = null;
let _stageDevelopSafetyTimeout = null;
let _stageRevealTimer = null;
let _stageRevealSafetyTimeout = null;

function teardownPageContent() {
  if (_workStageKeydownHandler) { document.removeEventListener('keydown', _workStageKeydownHandler); _workStageKeydownHandler = null; }
  if (_cheroCycleTimer) { clearInterval(_cheroCycleTimer); _cheroCycleTimer = null; }
  _cheroCycleHandlers = null;

  if (_heroExitScrollHandler) { window.removeEventListener('scroll', _heroExitScrollHandler); _heroExitScrollHandler = null; }
  if (_heroExitResizeHandler) { window.removeEventListener('resize', _heroExitResizeHandler); _heroExitResizeHandler = null; }

  if (_heroTiltEl) {
    if (_heroTiltMoveHandler) _heroTiltEl.removeEventListener('mousemove', _heroTiltMoveHandler);
    if (_heroTiltLeaveHandler) _heroTiltEl.removeEventListener('mouseleave', _heroTiltLeaveHandler);
  }
  _heroTiltEl = null; _heroTiltMoveHandler = null; _heroTiltLeaveHandler = null;

  if (_parallaxScrollHandler) { window.removeEventListener('scroll', _parallaxScrollHandler); _parallaxScrollHandler = null; }
  if (_parallaxResizeHandler) { window.removeEventListener('resize', _parallaxResizeHandler); _parallaxResizeHandler = null; }

  if (_revealObserver) { _revealObserver.disconnect(); _revealObserver = null; }
  if (_revealSafetyTimeout) { clearTimeout(_revealSafetyTimeout); _revealSafetyTimeout = null; }

  if (_introPhotoTimeout) { clearTimeout(_introPhotoTimeout); _introPhotoTimeout = null; }
  if (_introPhotoSafetyTimeout) { clearTimeout(_introPhotoSafetyTimeout); _introPhotoSafetyTimeout = null; }

  if (_stageDevelopTimer) { clearTimeout(_stageDevelopTimer); _stageDevelopTimer = null; }
  if (_stageDevelopSafetyTimeout) { clearTimeout(_stageDevelopSafetyTimeout); _stageDevelopSafetyTimeout = null; }
  if (_stageRevealTimer) { clearTimeout(_stageRevealTimer); _stageRevealTimer = null; }
  if (_stageRevealSafetyTimeout) { clearTimeout(_stageRevealSafetyTimeout); _stageRevealSafetyTimeout = null; }
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
     (hidden) state, so a JS failure never hides real content. */
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

  /* ---- Work page: gentle image parallax ----
     Each editorial photograph drifts slightly against the scroll —
     the same "motion connects sections instead of cutting" idea as
     the homepage hero exit, just applied here to keep every entry on
     the Work page feeling alive rather than static. Desktop only,
     respects reduced-motion, and every image is pre-scaled in CSS so
     the drift never reveals an edge. */
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  const parallaxEnabled = parallaxEls.length &&
    window.matchMedia('(min-width: 901px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (parallaxEnabled) {
    let parallaxTicking = false;
    const updateParallax = () => {
      parallaxTicking = false;
      const viewportH = window.innerHeight;
      parallaxEls.forEach(el => {
        const r = el.getBoundingClientRect();
        const centerOffset = (r.top + r.height / 2) - viewportH / 2;
        const shift = Math.max(-1, Math.min(1, centerOffset / viewportH)) * 26;
        el.style.transform = `scale(1.12) translateY(${shift}px)`;
      });
    };
    _parallaxScrollHandler = () => {
      if (!parallaxTicking) { parallaxTicking = true; requestAnimationFrame(updateParallax); }
    };
    _parallaxResizeHandler = updateParallax;
    window.addEventListener('scroll', _parallaxScrollHandler, { passive: true });
    window.addEventListener('resize', _parallaxResizeHandler);
    updateParallax();
  }

  /* ---- Work page: the editing table ----
     One monumental photograph fills the screen at a time instead of a
     list of rows. A single persistent frame (#stagePhotoFrame) stands
     in for all four chapters in turn — cycling with the arrows or the
     keyboard swaps its image, text and data-work/data-morph-id
     attributes in place rather than navigating anywhere, so
     findMorphSource() in js/transitions.js just reads whichever
     chapter is currently loaded into that frame at the moment someone
     actually clicks it. Four photographic behaviours carry the whole
     system: the image develops in once, chemically, whenever the page
     is freshly arrived at (see .work-stage.developed in style.css); a
     light sweeps across it on hover, the way sunlight moves through a
     room, and settles into a slow breathe if you linger; moving
     between chapters reveals the next photograph through a growing
     aperture iris — it's already sitting there behind the mask, never
     hidden behind black — and a small exposure-meter needle shows
     which of the four you're on. Only real chapters are clickable/hoverable
     — Photo Retouching stays inert exactly the way it was as a
     "coming soon" rhythm row, just by having no href or data-work
     while it's the current chapter. */
  const workStage = document.getElementById('workStage');
  if (workStage) {
    const stageChapters = [
      { key: 'street', num: '01', name: 'Street', desc: 'Observations from cities, people and the moments between them.', img: 'images/louvre-abudhabi.jpg', alt: 'Dappled light beneath the Louvre Abu Dhabi dome' },
      { key: 'architecture', num: '02', name: 'Architecture', desc: 'Where geometry, light and silence meet.', img: 'images/badshahi-mosque.jpg', alt: 'Grand mosque domes and minarets glowing at golden hour' },
      { key: 'portraits', num: '03', name: 'Portraits', desc: 'Stories told through expression, presence and light.', img: 'images/double-exposure-portrait.jpg', alt: 'Double exposure portrait blurred against the Abu Dhabi skyline' },
      { key: 'retouching', num: '04', name: 'Photo Retouching', desc: 'Coming soon.', img: 'images/mystic-night-lamps.jpg', alt: 'Warmly retouched night scene along a palace driveway', soon: true }
    ];

    const stageLink = document.getElementById('stageFrameLink');
    const stagePhotoFrame = document.getElementById('stagePhotoFrame');
    const stagePhoto = document.getElementById('stagePhoto');
    const stagePhotoIncoming = document.getElementById('stagePhotoIncoming');
    const stageNum = document.getElementById('stageNum');
    const stageName = document.getElementById('stageName');
    const stageDesc = document.getElementById('stageDesc');
    const stageCounterCurrent = document.getElementById('stageCounterCurrent');
    const stagePrevBtn = document.getElementById('stagePrevBtn');
    const stageNextBtn = document.getElementById('stageNextBtn');
    const stageSoonTag = document.getElementById('stageSoonTag');
    const stageDots = Array.from(document.querySelectorAll('.stage-dot'));

    // Which chapter to open on: normally Street (index 0), but if the
    // visitor is coming back to this page having already looked at a
    // chapter this session — most commonly by clicking "Back to the
    // Portfolio" on a category page — pick up from there instead of
    // snapping back to the start every time. Without this, someone
    // moving Street -> back -> Architecture -> back -> Portraits keeps
    // landing on Street again on every return, so the "next chapter"
    // arrow/dot they just used now points at a chapter they already
    // saw instead of the next new one — which is exactly what reads as
    // stuck/not-progressing rather than a smooth run through all three.
    // sessionStorage (not localStorage) on purpose: this should only
    // persist for the current visit, not linger forever across future
    // visits to the site.
    let stageCurrent = 0;
    try {
      const savedKey = sessionStorage.getItem('tanleoStageChapter');
      if (savedKey) {
        const savedIndex = stageChapters.findIndex(c => c.key === savedKey);
        if (savedIndex !== -1) stageCurrent = savedIndex;
      }
    } catch (e) { /* sessionStorage unavailable (private mode etc.) — just start at Street */ }
    let stageBusy = false;

    // Text, attributes and the base photo for whichever chapter is
    // now current — shared by the first-arrival render and by the
    // moment a chapter-to-chapter reveal finishes.
    function updateStageMeta(index) {
      const ch = stageChapters[index];
      stagePhoto.src = ch.img;
      stagePhoto.alt = ch.alt;
      stageNum.textContent = ch.num;
      stageName.textContent = ch.name;
      stageDesc.textContent = ch.desc;
      stageCounterCurrent.textContent = ch.num;
      stagePhotoFrame.setAttribute('data-morph-id', 'cat-' + ch.key);
      stageSoonTag.classList.toggle('visible', !!ch.soon);
      stageDots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      try { sessionStorage.setItem('tanleoStageChapter', ch.key); } catch (e) { /* ignore */ }

      if (ch.soon) {
        stageLink.classList.add('is-soon');
        stageLink.removeAttribute('href');
        stageLink.removeAttribute('data-work');
      } else {
        stageLink.classList.remove('is-soon');
        stageLink.setAttribute('href', ch.key + '.html');
        stageLink.setAttribute('data-work', ch.key);
      }
    }

    function renderStageChapter(index) {
      // First arrival at the page only: the photograph holds still,
      // slightly veiled, then settles into full clarity a beat later —
      // the same quiet arrival pattern used for each category page's
      // own opening photograph, rather than a bespoke effect just for
      // this page. Chapter-to-chapter navigation after this never
      // re-triggers it — see goToStageChapter, which keeps the frame
      // settled and uses the crossfade instead.
      updateStageMeta(index);

      workStage.classList.remove('developed');
      clearTimeout(_stageDevelopTimer);
      clearTimeout(_stageDevelopSafetyTimeout);

      // Force a reflow so the resting state actually paints on its own
      // before the settle-in transition starts a beat later, rather
      // than risking both states landing in the same frame and the
      // image just appearing already-settled.
      void workStage.offsetHeight;
      _stageDevelopTimer = setTimeout(() => {
        workStage.classList.add('developed');
      }, 260);

      // Safety net, same idea as the .reveal system and the category-page
      // intro photo further up this file: the photograph must never be
      // able to stay invisible forever just because one timer got delayed
      // or dropped (a backgrounded tab throttling JS timers is the
      // realistic way that happens) — force it visible after a few
      // seconds regardless of what the primary timer did.
      _stageDevelopSafetyTimeout = setTimeout(() => {
        workStage.classList.add('developed');
      }, 4000);
    }

    function goToStageChapter(newIndex) {
      if (stageBusy) return;
      stageBusy = true;
      const next = (newIndex + stageChapters.length) % stageChapters.length;
      const nextCh = stageChapters[next];

      clearTimeout(_stageDevelopTimer);
      clearTimeout(_stageDevelopSafetyTimeout);
      clearTimeout(_stageRevealTimer);
      clearTimeout(_stageRevealSafetyTimeout);

      // The incoming chapter's photo goes into the frame right now,
      // already sitting there behind a closed circular mask — nothing
      // swaps to black first.
      stagePhotoIncoming.src = nextCh.img;
      stagePhotoIncoming.alt = nextCh.alt;
      void workStage.offsetHeight;
      workStage.classList.add('revealing');

      const finishReveal = () => {
        // Whichever timer got here first (the real one, or the safety
        // net below) cancels the other, so this only ever runs once.
        clearTimeout(_stageRevealTimer);
        clearTimeout(_stageRevealSafetyTimeout);

        // The mask has fully grown and covers the frame — swap the
        // base photo underneath and collapse the mask back to zero in
        // the same tick, so nothing visibly changes right now.
        stageCurrent = next;
        updateStageMeta(stageCurrent);
        workStage.classList.add('developed');
        workStage.classList.remove('revealing');
        stagePhotoIncoming.removeAttribute('src');
        stageBusy = false;
      };

      _stageRevealTimer = setTimeout(finishReveal, 1080);
      // Safety net: never leave the frame stuck mid-transition — masked,
      // unclickable, chapter half-swapped — if the primary timer above
      // is ever delayed or dropped. Same reasoning as renderStageChapter.
      _stageRevealSafetyTimeout = setTimeout(finishReveal, 4000);
    }

    stagePrevBtn.addEventListener('click', () => goToStageChapter(stageCurrent - 1));
    stageNextBtn.addEventListener('click', () => goToStageChapter(stageCurrent + 1));

    // Dot indicators: jump straight to any chapter, rather than only
    // stepping one at a time with the arrows/keyboard.
    stageDots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        if (i === stageCurrent) return;
        goToStageChapter(i);
      });
    });

    _workStageKeydownHandler = (e) => {
      if (e.key === 'ArrowRight') goToStageChapter(stageCurrent + 1);
      if (e.key === 'ArrowLeft') goToStageChapter(stageCurrent - 1);
    };
    document.addEventListener('keydown', _workStageKeydownHandler);

    // Swipe to move between chapters (touch only) — the arrows and
    // keyboard already do this; a phone visitor reaches for a swipe
    // instead. Only counts as a swipe once the gesture is clearly
    // horizontal and past a real distance, so an ordinary vertical
    // scroll (to reach the "Have a story worth telling?" section
    // below) is never mistaken for one. When a swipe IS detected, the
    // tap-to-open-this-chapter click that would otherwise fire on the
    // link right after lifting your finger is suppressed, so swiping
    // never accidentally also navigates into the chapter you swiped
    // away from.
    let stageTouchStartX = null;
    let stageTouchStartY = null;
    let stageTouchIsSwipe = false;
    stageLink.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      stageTouchStartX = t.clientX;
      stageTouchStartY = t.clientY;
      stageTouchIsSwipe = false;
    }, { passive: true });
    stageLink.addEventListener('touchmove', (e) => {
      if (stageTouchStartX === null) return;
      const t = e.touches[0];
      const dx = t.clientX - stageTouchStartX;
      const dy = t.clientY - stageTouchStartY;
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) stageTouchIsSwipe = true;
    }, { passive: true });
    stageLink.addEventListener('touchend', (e) => {
      if (stageTouchStartX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - stageTouchStartX;
      stageTouchStartX = null;
      stageTouchStartY = null;
      if (stageTouchIsSwipe && Math.abs(dx) > 40) {
        goToStageChapter(stageCurrent + (dx < 0 ? 1 : -1));
      }
    });
    stageLink.addEventListener('click', (e) => {
      if (stageTouchIsSwipe) {
        e.preventDefault();
        stageTouchIsSwipe = false;
      }
    });

    renderStageChapter(stageCurrent);
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
     second or two, during which nothing happens on screen: the flash
     fires, then the site just sits there looking stuck, until the
     response finally lands and the transition suddenly continues.
     Warming the browser's own HTTP cache for every internal page
     during idle time after load means that fetch almost always
     resolves instantly from cache instead, no matter which link ends
     up getting clicked. Runs once, globally, on the real page load —
     the warmed cache stays useful for every Taxi transition
     afterward, not just the first one. */
  (function prefetchInternalPages() {
    const pages = ['index.html', 'portfolio.html', 'about.html', 'contact.html', 'street.html', 'architecture.html', 'portraits.html'];
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

  /* ---- Mobile nav toggle ---- */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  /* ---- Hero slideshow: slow 4s cross-fade, holds ~4.5s between ---- */
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length) {
    let current = 0;
    slides[0].classList.add('active');
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 4500);
  }

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

  /* ---- Projects: horizontal drag-to-scroll lineup (mouse/trackpad) ----
     Touch and trackpad swipe already scroll the row natively via
     overflow-x + scroll-snap in CSS; this just adds click-and-drag
     for mouse users, the way Apple's product carousels work. */
  const lineupGrid = document.querySelector('.lineup-grid');
  if (lineupGrid) {
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let dragged = false;

    const endDrag = () => {
      isDown = false;
      lineupGrid.classList.remove('dragging');
    };

    lineupGrid.addEventListener('mousedown', (e) => {
      isDown = true;
      dragged = false;
      lineupGrid.classList.add('dragging');
      startX = e.pageX;
      scrollStart = lineupGrid.scrollLeft;
    });
    window.addEventListener('mouseup', endDrag);
    lineupGrid.addEventListener('mouseleave', endDrag);
    lineupGrid.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const delta = e.pageX - startX;
      if (Math.abs(delta) > 5) dragged = true;
      lineupGrid.scrollLeft = scrollStart - delta;
    });
    lineupGrid.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        if (dragged) e.preventDefault();
      });
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

  /* ---- Site-wide: click-to-navigate router ----
     Runs once, on every page. Used to also drive a custom camera-
     shaped cursor and a click-flash burst — removed per the site's
     design philosophy ("every interaction should make a photograph
     feel closer, nothing should explain its own theme"): a cursor
     literally shaped like a camera, and a synthetic flash of light on
     every click, were both charming but literal — decoration *about*
     photography rather than the photograph itself getting closer, and
     the flash in particular was competing for attention with real
     light already inside the photographs (lamps, sun flare, golden
     hour) on every single click, the whole visit through. grow()/
     shrink() are kept as harmless no-ops so the rest of the site's
     code — several sections call them on hover — doesn't need to
     change. What's left here is just the click router: it hands
     internal link clicks off to the page-transition system (js/
     transitions.js) so the destination swaps in smoothly instead of a
     hard reload, and falls back to a normal navigation if that router
     never loaded (CDN blocked, offline) — the site works exactly the
     same either way, just without the swap animation. In-page
     anchors, new-tab clicks, modified clicks, and mailto/tel links are
     left alone. */
  const cursor = { grow: () => {}, shrink: () => {} };
  window.siteCursor = cursor;

  document.addEventListener('click', (e) => {
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
      e.preventDefault();
      const dest = link.href;
      if (window.siteTaxi) {
        window.siteTaxi.navigateTo(dest, undefined, link);
      } else {
        window.location.href = dest;
      }
    }
  });

  /* ---- Homepage: Selected Works drifting gallery (index.html only) ----
     Duplicates the track once (not baked into the HTML) so the drift
     loops seamlessly without doubling the page's image weight. */
  const galleryTrack = document.getElementById('galleryTrack');
  if (galleryTrack) {
    const galleryClone = galleryTrack.cloneNode(true);
    galleryClone.removeAttribute('id');
    Array.from(galleryClone.children).forEach(c => galleryTrack.appendChild(c));

    document.querySelectorAll('.gallery-item').forEach(item => {
      const isLive = item.tagName === 'A';
      item.addEventListener('mouseenter', () => cursor.grow(isLive ? 'Enter' : ''));
      item.addEventListener('mouseleave', cursor.shrink);
    });
  }

  /* ---- Projects page: scroll-driven carousel ----
     Desktop: vertical scroll through a tall wrapper drives horizontal
     movement through the slides, like a pinned "scrollytelling" section.
     Scroll position is the single source of truth — arrows/clicks just
     scroll the window to the right spot, and the scroll handler does
     the rest.
     Mobile: scroll-hijacking is disorienting on touch, so instead the
     carousel behaves like a normal contained carousel (click/arrow
     driven, no page-scroll hijack). */
  const carouselTrack = document.getElementById('carouselTrack');
  const scrollWrapper = document.getElementById('carouselScrollWrapper');
  const carouselPin = document.getElementById('carouselPin');

  if (carouselTrack && scrollWrapper && carouselPin) {
    const carouselSlides = Array.from(carouselTrack.querySelectorAll('.carousel-slide'));
    const carouselViewport = document.querySelector('.carousel-viewport');
    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    const carouselCounter = document.getElementById('carouselCounter');
    const isDesktop = () => window.matchMedia('(min-width: 701px)').matches;
    let carouselActive = 0;
    let mode = null; // 'scroll' | 'click'

    const slideCenterX = (i) => {
      const vw = carouselViewport.clientWidth;
      const slide = carouselSlides[i];
      const step = carouselSlides.length > 1 ? (carouselSlides[1].offsetLeft - carouselSlides[0].offsetLeft) : 0;
      const slideNaturalLeft = i * step;
      return (vw - slide.offsetWidth) / 2 - slideNaturalLeft;
    };

    const setActiveClasses = (idx) => {
      carouselSlides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      if (carouselPrev) carouselPrev.disabled = idx === 0;
      if (carouselNext) carouselNext.disabled = idx === carouselSlides.length - 1;
      if (carouselCounter) {
        carouselCounter.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(carouselSlides.length).padStart(2, '0');
      }
    };

    /* ---------------- Desktop: scroll-driven mode ---------------- */
    let wrapperTopAbs = 0;
    let scrollableDistance = 0;

    const measureScrollGeometry = () => {
      const rect = scrollWrapper.getBoundingClientRect();
      wrapperTopAbs = rect.top + window.scrollY;
      scrollableDistance = scrollWrapper.offsetHeight - window.innerHeight;
    };

    const progressToScrollY = (progress) => wrapperTopAbs + progress * scrollableDistance;

    const onScrollUpdate = () => {
      if (scrollableDistance <= 0) return;
      const scrolled = window.scrollY - wrapperTopAbs;
      let progress = scrolled / scrollableDistance;
      progress = Math.max(0, Math.min(1, progress));

      const idx = Math.round(progress * (carouselSlides.length - 1));
      if (idx !== carouselActive) {
        carouselActive = idx;
        setActiveClasses(idx);
      }

      const startX = slideCenterX(0);
      const endX = slideCenterX(carouselSlides.length - 1);
      const targetX = startX + progress * (endX - startX);
      carouselTrack.style.transform = `translateX(${targetX}px)`;
    };

    const goToIndexScroll = (idx) => {
      idx = Math.max(0, Math.min(carouselSlides.length - 1, idx));
      const progress = carouselSlides.length > 1 ? idx / (carouselSlides.length - 1) : 0;
      window.scrollTo({ top: progressToScrollY(progress), behavior: 'smooth' });
    };

    /* ---------------- Mobile: click/arrow mode (no scroll hijack) ---------------- */
    const clickLayout = () => {
      const targetX = slideCenterX(carouselActive);
      carouselTrack.style.transform = `translateX(${targetX}px)`;
    };
    const goToIndexClick = (idx) => {
      carouselActive = Math.max(0, Math.min(carouselSlides.length - 1, idx));
      setActiveClasses(carouselActive);
      requestAnimationFrame(clickLayout);
    };

    /* ---------------- Mode setup ---------------- */
    const enableScrollMode = () => {
      mode = 'scroll';
      scrollWrapper.style.height = `${(carouselSlides.length + 1) * 100}vh`;
      carouselTrack.style.transition = 'none';
      measureScrollGeometry();
      onScrollUpdate();
    };

    const enableClickMode = () => {
      mode = 'click';
      scrollWrapper.style.height = 'auto';
      carouselTrack.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1)';
      goToIndexClick(carouselActive);
    };

    const applyModeForViewport = () => {
      if (isDesktop() && mode !== 'scroll') {
        enableScrollMode();
      } else if (!isDesktop() && mode !== 'click') {
        enableClickMode();
      } else if (isDesktop()) {
        measureScrollGeometry();
        onScrollUpdate();
      }
    };

    applyModeForViewport();
    setActiveClasses(carouselActive);

    window.addEventListener('scroll', () => {
      if (mode === 'scroll') requestAnimationFrame(onScrollUpdate);
    }, { passive: true });

    window.addEventListener('resize', () => {
      applyModeForViewport();
    });

    carouselSlides.forEach((s, i) => {
      const photo = s.querySelector('.carousel-photo');
      if (!photo) return;
      photo.addEventListener('click', (e) => {
        if (i === carouselActive) return;
        e.preventDefault();
        if (mode === 'scroll') goToIndexScroll(i);
        else goToIndexClick(i);
      });
    });

    if (carouselPrev) carouselPrev.addEventListener('click', () => {
      if (carouselActive <= 0) return;
      if (mode === 'scroll') goToIndexScroll(carouselActive - 1);
      else goToIndexClick(carouselActive - 1);
    });
    if (carouselNext) carouselNext.addEventListener('click', () => {
      if (carouselActive >= carouselSlides.length - 1) return;
      if (mode === 'scroll') goToIndexScroll(carouselActive + 1);
      else goToIndexClick(carouselActive + 1);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && carouselActive < carouselSlides.length - 1) {
        if (mode === 'scroll') goToIndexScroll(carouselActive + 1); else goToIndexClick(carouselActive + 1);
      }
      if (e.key === 'ArrowLeft' && carouselActive > 0) {
        if (mode === 'scroll') goToIndexScroll(carouselActive - 1); else goToIndexClick(carouselActive - 1);
      }
    });

    /* ---- Camera cursor + photo tilt (desktop hover only) ----
       The camera cursor itself is the shared site-wide one set up
       above; this just tells it when to grow over carousel controls
       and photos, and adds the gentle tilt-toward-pointer on photos. */
    document.querySelectorAll('.carousel-explore, .carousel-arrow').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.grow(''));
      el.addEventListener('mouseleave', cursor.shrink);
    });

    // Photos: grow the cursor into a "View" label, and gently tilt
    // the image toward the pointer — a livelier hover than a flat
    // zoom, while still calm enough for a photography portfolio.
    carouselSlides.forEach((slide) => {
      const photo = slide.querySelector('.carousel-photo');
      const img = photo && photo.querySelector('img');
      if (!photo || !img) return;

      photo.addEventListener('mouseenter', () => cursor.grow('View'));
      photo.addEventListener('mouseleave', () => {
        cursor.shrink();
        img.style.transform = '';
      });
      photo.addEventListener('mousemove', (e) => {
        const r = photo.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const activeScale = slide.classList.contains('is-active') ? 1.04 : 1.0;
        img.style.transform = `scale(${activeScale}) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
      });
    });
  }

  initPageContent();
});
