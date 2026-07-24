// ============================================================
// Page transitions — GSAP + Taxi.js
// ============================================================
// Loaded from public CDNs (see the <script> tags in each page's
// <body>, right before this file): @unseenco/e, gsap, @unseenco/taxi.
// If any of those failed to load — offline, a blocker, whatever —
// this file does nothing and every link on the site just stays a
// normal <a href>, so navigation still works exactly as plain page
// loads. Nothing about the site depends on this working.
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
// The transition itself: the new page rises up from below the
// viewport to cover the old one — like a blind being pulled up —
// while the old page drifts gently upward and out of the way behind
// it. This is a direct, literal recreation of the reference site
// Tanleo pointed us to (detroit.paris/projects): reverse-engineered
// from their own shipped bundle, same mechanic (position:fixed pin,
// GSAP tween from y:100% to y:0% with an expo.inOut ease), not a
// loose reinterpretation of it. Once the page has risen into place,
// its heading/intro text fades and slides up into view on its own —
// see the .reveal handling in js/script.js, which every page's hero
// now opts into — giving the "shoots upward, then the text shows
// up" sequence exactly as asked for.
//
// If a visitor has motion reduction turned on, we skip the rise
// entirely and fall back to a quiet cross-fade instead.

(function () {
  if (
    typeof window.taxi === 'undefined' ||
    typeof window.gsap === 'undefined'
  ) {
    return;
  }

  // Known page titles, since a client-side transition never loads a
  // new <title> tag on its own — keyed by filename.
  const PAGE_TITLES = {
    'index.html': 'Tanleo_ — Street, Portrait & Architectural Photography, Abu Dhabi',
    'projects.html': 'Projects — Tanleo_',
    'about.html': 'About — Tanleo_',
    'contact.html': 'Contact — Tanleo_',
    'street.html': 'Street — Tanleo_',
    'architecture.html': 'Architecture — Tanleo_',
    'portraits.html': 'Portraits — Tanleo_'
  };

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class SiteTransition extends taxi.Transition {
    // All the visible motion happens in onEnter, where we have both
    // the outgoing (`from`) and incoming (`to`) page at once — onLeave
    // itself does nothing and returns immediately.
    onLeave({ done }) {
      done();
    }

    onEnter({ to, done }) {
      // Taxi's Renderer never actually passes `from` into onEnter
      // (only onLeave gets it) — with removeOldContent:false both the
      // outgoing and incoming [data-taxi-view] elements sit in the
      // wrapper at this point, so the outgoing one is simply "whichever
      // one isn't `to`". Confirmed against Taxi 1.4.0's own source and
      // against how the reference site works around the exact same gap.
      const views = Array.from(this.wrapper.querySelectorAll('[data-taxi-view]'));
      const from = views.find(v => v !== to) || null;

      if (!from || prefersReducedMotion()) {
        gsap.set(to, { opacity: 0 });
        gsap.to(to, {
          opacity: 1,
          duration: 0.45,
          ease: 'power1.out',
          onComplete: () => {
            if (from && from.parentNode) from.parentNode.removeChild(from);
            done();
          }
        });
        return;
      }

      // Pin the outgoing page exactly where it currently sits on
      // screen, then let it drift upward and out of the way.
      const fromRect = from.getBoundingClientRect();
      gsap.set(from, {
        position: 'fixed',
        top: fromRect.top,
        left: fromRect.left,
        width: fromRect.width,
        height: fromRect.height,
        y: 0,
        zIndex: 8
      });
      gsap.to(from, {
        y: window.innerHeight * -0.2,
        duration: 1.6,
        ease: 'expo.inOut',
        force3D: true
      });

      // The incoming page starts pinned just below the bottom edge
      // of the viewport, full-screen, then rises up to cover it.
      gsap.set(to, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        y: '100%',
        zIndex: 10
      });
      gsap.to(to, {
        y: '0%',
        duration: 1.6,
        ease: 'expo.inOut',
        onComplete: () => {
          gsap.set(to, { clearProps: 'position,top,left,width,height,y,zIndex' });
          if (from.parentNode) from.parentNode.removeChild(from);
          done();
        }
      });
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
    // false on purpose: the rise/drift above needs the outgoing page
    // still in the DOM while it animates, so onEnter removes it
    // itself once the incoming page has fully settled into place.
    removeOldContent: false,
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
