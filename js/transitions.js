// ============================================================
// Page transitions — GSAP + Flip + Taxi.js
// ============================================================
// Loaded from public CDNs (see the <script> tags in each page's
// <body>, right before this file): @unseenco/e, gsap, gsap/Flip,
// @unseenco/taxi. If any of those failed to load — offline, a
// blocker, whatever — this file does nothing and every link on the
// site just stays a normal <a href>, so navigation still works
// exactly as plain page loads. Nothing about the site depends on
// this working.
//
// When it does load, it sets up window.siteTaxi: a router that
// intercepts clicks on internal links, quietly fetches the
// destination page in the background, and swaps in only its
// [data-taxi-view] content — no full reload, so the persistent nav,
// menu overlay and camera cursor never remount. We do NOT let Taxi
// listen for clicks itself (see `links` below) — the existing
// camera-flash click handler in script.js already owns every
// qualifying click, and after its 200ms flash delay it now hands
// the click off to window.siteTaxi.navigateTo() instead of doing a
// hard `location.href` reload.
//
// Two transition styles, chosen automatically per click:
//  - Default: a quiet cross-fade between views.
//  - Flip: when the clicked element contains a [data-flip-id] and
//    the destination page has an element with that same
//    data-flip-id, that element visually morphs from its position/
//    size on the old page into its position/size on the new one —
//    e.g. a Work index category name becoming that category's big
//    page title — using GSAP's Flip plugin. This is the same
//    technique (GSAP Flip + a page-transition router) confirmed by
//    inspecting the reference site Tanleo pointed us to.

(function () {
  if (
    typeof window.taxi === 'undefined' ||
    typeof window.gsap === 'undefined' ||
    typeof window.Flip === 'undefined'
  ) {
    return;
  }

  gsap.registerPlugin(Flip);

  // Known page titles, since a client-side transition never loads a
  // new <title> tag on its own — keyed by filename.
  const PAGE_TITLES = {
    'index.html': 'Tanleo_ — Street, Portrait & Architectural Photography, Abu Dhabi',
    'projects.html': 'Projects — Tanleo_',
    'about.html': 'About — Tanleo_',
    'contact.html': 'Contact — Tanleo_',
    'street.html': 'Street — Tanleo_'
  };

  let pendingFlipState = null;
  let pendingFlipId = null;

  class SiteTransition extends taxi.Transition {
    onLeave({ from, trigger, done }) {
      pendingFlipState = null;
      pendingFlipId = null;

      if (trigger && trigger.nodeType === 1 && typeof trigger.querySelector === 'function') {
        const flipEl = trigger.hasAttribute && trigger.hasAttribute('data-flip-id')
          ? trigger
          : trigger.querySelector('[data-flip-id]');
        if (flipEl) {
          pendingFlipId = flipEl.getAttribute('data-flip-id');
          pendingFlipState = Flip.getState(flipEl);
        }
      }

      gsap.to(from, {
        opacity: 0,
        duration: 0.4,
        ease: 'power1.out',
        onComplete: done
      });
    }

    onEnter({ to, done }) {
      const flipTarget = pendingFlipId ? to.querySelector(`[data-flip-id="${pendingFlipId}"]`) : null;

      gsap.set(to, { opacity: 0 });

      if (pendingFlipState && flipTarget) {
        Flip.from(pendingFlipState, {
          targets: flipTarget,
          duration: 0.85,
          ease: 'power3.inOut',
          absolute: true
        });
        gsap.to(to, { opacity: 1, duration: 0.5, delay: 0.1, ease: 'power1.out', onComplete: done });
      } else {
        gsap.to(to, { opacity: 1, duration: 0.45, ease: 'power1.out', onComplete: done });
      }

      pendingFlipState = null;
      pendingFlipId = null;
    }
  }

  const core = new taxi.Core({
    // Taxi's own automatic click-handling is scoped to this selector.
    // It never matches a real link, which keeps Taxi's click listener
    // permanently inert — every navigation instead goes exclusively
    // through the existing camera-flash click handler in script.js,
    // which calls core.navigateTo() itself. This avoids the two
    // systems ever fighting over the same click.
    links: 'a[data-taxi-auto-link]',
    transitions: { default: SiteTransition },
    removeOldContent: true,
    enablePrefetch: false
  });

  window.siteTaxi = core;

  core.on('NAVIGATE_END', () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (PAGE_TITLES[path]) document.title = PAGE_TITLES[path];

    document.querySelectorAll('.menu-overlay-nav a').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === path);
    });

    window.scrollTo(0, 0);
    if (typeof window.initPageContent === 'function') window.initPageContent();
  });
})();
