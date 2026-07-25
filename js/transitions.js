// ============================================================
// Page transitions — GSAP + Taxi.js
// ============================================================
// Loaded from public CDNs (see the <script> tags in each page's
// <body>, right before this file): @unseenco/e, gsap, gsap/Flip,
// @unseenco/taxi. If any of those failed to load — offline, a
// blocker, whatever — this file does nothing and every link on the
// site just stays a normal <a href>, so navigation still works
// exactly as plain page loads. Nothing about the site depends on
// this working. Flip specifically is treated as optional even when
// everything else loaded: if it's missing, the site just always
// falls back to the plain page-rise below instead of the photo
// morph, rather than breaking navigation entirely over one library.
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
//
//  - The signature one: the photograph becomes the doorway. When the
//    thing that was clicked is a Work-index chapter (Street,
//    Architecture, Portraits), the small photograph sitting next to
//    that chapter's name doesn't just sit there while the page
//    changes around it — it grows, in place, directly into that
//    chapter's own monumental hero photograph. Nothing else does a
//    page-turn; the photo you clicked *is* the transition. Built with
//    GSAP's Flip plugin: the small frame's on-screen position/size is
//    captured the instant it's clicked (onLeave — the one lifecycle
//    hook Taxi actually hands the clicked element to), and the big
//    frame on the new page is animated from that captured state into
//    its own natural position (onEnter). Both frames are plain
//    overflow:hidden boxes with a filling <img> — never the <img>
//    itself — so the crop stays correct at every size in between, not
//    just the start and end (see the .cat-hero-photo / .work-list-
//    media-row / .work-list-thumb-mobile comments in style.css).
//
//  - The fallback: for everything else — the nav, the footer, "Back
//    to the Work", Home, About, Contact, browser back/forward — the
//    new page rises up from below the viewport to cover the old one,
//    while the old page drifts gently upward and out of the way
//    behind it. Reverse-engineered from detroit.paris/projects'
//    own shipped bundle. Once the page has risen into place, its
//    heading/intro text fades and slides up on its own — see the
//    .reveal handling in js/script.js.
//
// If a visitor has motion reduction turned on, both styles are
// skipped in favour of a quiet, instant-feeling cross-fade.

(function () {
  if (
    typeof window.taxi === 'undefined' ||
    typeof window.gsap === 'undefined'
  ) {
    return;
  }

  if (typeof window.Flip !== 'undefined') {
    gsap.registerPlugin(Flip);
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

  // Given the clicked element, find the on-screen photograph frame
  // that should morph into the destination's hero photo, if any.
  // Only Work-index chapter links carry data-work, so this is a
  // no-op (returns null) for every other link on the site — exactly
  // the cases that should keep the plain page-rise instead.
  function findMorphSource(trigger) {
    if (!trigger || !trigger.getAttribute) return null;
    const workKey = trigger.getAttribute('data-work');
    if (!workKey) return null;

    // Desktop: the hover-grown photo sits in a sibling column, not
    // inside the clicked link itself, matched by data-work-image.
    const desktopEl = document.querySelector('.work-list-media-row[data-work-image="' + workKey + '"]');
    if (desktopEl && desktopEl.offsetParent !== null) {
      return { id: 'cat-' + workKey, el: desktopEl };
    }
    // Mobile: the static thumbnail sits inside the clicked link.
    const mobileEl = trigger.querySelector && trigger.querySelector('.work-list-thumb-mobile');
    if (mobileEl && mobileEl.offsetParent !== null) {
      return { id: 'cat-' + workKey, el: mobileEl };
    }
    return null;
  }

  let pendingMorphId = null;
  let pendingMorphState = null;

  class SiteTransition extends taxi.Transition {
    onLeave({ trigger, done }) {
      pendingMorphId = null;
      pendingMorphState = null;
      if (typeof Flip !== 'undefined' && trigger && trigger.nodeType === 1) {
        const source = findMorphSource(trigger);
        if (source) {
          pendingMorphId = source.id;
          pendingMorphState = Flip.getState(source.el);
        }
      }
      done();
    }

    onEnter({ to, done }) {
      // Hide this page's reveal-marked content (headings, intro text,
      // image plates — see the .reveal system in js/script.js) the
      // instant it exists in the DOM, before any of it has been shown
      // on screen. Previously this only happened once the transition
      // had *finished* (via NAVIGATE_END -> initPageContent(), further
      // below in this file's flow) — which meant the incoming page's
      // text sat fully visible the entire time it rose/morphed into
      // place, then popped invisible in a single frame the instant the
      // animation completed, before fading back in a moment later. That
      // pop was a visible glitch right as the page settled. Doing it
      // here means the content is already sitting in its hidden,
      // pre-reveal state before it's ever painted, so all that's left
      // to happen once the transition ends is the intended fade-up —
      // nothing left to pop.
      to.querySelectorAll('.reveal').forEach(el => {
        el.classList.add('pre');
        el.classList.remove('in');
      });

      // Taxi's Renderer never actually passes `from` into onEnter
      // (only onLeave gets it) — with removeOldContent:false both the
      // outgoing and incoming [data-taxi-view] elements sit in the
      // wrapper at this point, so the outgoing one is simply "whichever
      // one isn't `to`". Confirmed against Taxi 1.4.0's own source and
      // against how the reference site works around the exact same gap.
      const views = Array.from(this.wrapper.querySelectorAll('[data-taxi-view]'));
      const from = views.find(v => v !== to) || null;

      const reduceMotion = prefersReducedMotion();
      const morphTarget = (pendingMorphId && !reduceMotion && typeof Flip !== 'undefined')
        ? to.querySelector('[data-morph-id="' + pendingMorphId + '"]')
        : null;

      if (!from || reduceMotion) {
        pendingMorphId = null;
        pendingMorphState = null;
        gsap.set(to, { opacity: 0 });
        gsap.to(to, {
          opacity: 1,
          duration: 0.45,
          ease: 'power1.out',
          onComplete: () => {
            window.scrollTo(0, 0);
            if (from && from.parentNode) from.parentNode.removeChild(from);
            done();
          }
        });
        return;
      }

      if (morphTarget && pendingMorphState) {
        // The signature transition: the clicked photograph grows into
        // this page's own hero photo. The old page doesn't rise or
        // drift anywhere dramatic — it just steps out of the way
        // underneath, since the growing photograph is where the eye
        // is meant to be the whole time.
        const flipState = pendingMorphState;
        pendingMorphId = null;
        pendingMorphState = null;

        window.scrollTo(0, 0);

        const fromRect = from.getBoundingClientRect();
        const clipper = document.createElement('div');
        clipper.style.cssText =
          'position:fixed; top:0; left:0; width:100%; height:100vh; overflow:hidden; z-index:1; pointer-events:none;';
        from.parentNode.insertBefore(clipper, from);
        clipper.appendChild(from);
        gsap.set(from, {
          position: 'absolute',
          top: fromRect.top,
          left: fromRect.left,
          width: fromRect.width
        });
        gsap.to(clipper, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.out',
          onComplete: () => {
            if (clipper.parentNode) clipper.parentNode.removeChild(clipper);
          }
        });

        // Lifted into its own stacking context (no layout shift, since
        // no top/left offset is set) so it renders above the fading
        // clipper instead of underneath it.
        gsap.set(to, { position: 'relative', zIndex: 2 });

        Flip.from(flipState, {
          targets: morphTarget,
          duration: 1.1,
          ease: 'power3.inOut',
          absolute: true,
          onComplete: () => {
            gsap.set(to, { clearProps: 'position,zIndex' });
            done();
          }
        });
        return;
      }

      pendingMorphId = null;
      pendingMorphState = null;

      // Clip the outgoing page to a viewport-sized window rather than
      // pinning its full (often much taller — a long homepage can run
      // several thousand pixels) scrollable height directly. A small
      // fixed "clipper" holds the real content at its original
      // on-screen offset, so only one viewport's worth ever needs to
      // be painted/composited while it drifts — this is what was
      // making the transition feel janky, especially leaving longer
      // pages.
      const fromRect = from.getBoundingClientRect();
      const clipper = document.createElement('div');
      clipper.style.cssText =
        'position:fixed; top:0; left:0; width:100%; height:100vh; overflow:hidden; z-index:8; pointer-events:none;';
      from.parentNode.insertBefore(clipper, from);
      clipper.appendChild(from);
      gsap.set(from, {
        position: 'absolute',
        top: fromRect.top,
        left: fromRect.left,
        width: fromRect.width,
        y: 0
      });
      gsap.to(clipper, {
        y: window.innerHeight * -0.2,
        duration: 1.6,
        ease: 'power3.out',
        force3D: true
      });

      // The incoming page starts pinned just below the bottom edge
      // of the viewport, full-screen, then rises up to cover it.
      // Deliberately an "out" ease (starts at full speed, settles
      // gently) rather than the "inOut" this used previously — inOut
      // spends its first ~500ms of the 1.6s barely moving at all
      // before it visibly picks up, since the incoming page starts
      // fully below the viewport and stays there almost motionless
      // during that slow ease-in. That read as the click having done
      // nothing for a beat — "stuck for a second, then it opens" —
      // rather than an intentionally unhurried motion. Starting at
      // full speed means the page is visibly moving the instant the
      // transition begins, while still decelerating smoothly into
      // place at the end rather than stopping abruptly.
      gsap.set(to, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        y: '100%',
        zIndex: 10
      });
      gsap.to(to, {
        y: '0%',
        duration: 1.6,
        ease: 'power3.out',
        onComplete: () => {
          // Snap the real scroll position back to the top BEFORE
          // handing the incoming page back to normal document flow.
          // Doing it the other way round (clearProps first) leaves a
          // window where `to` is laid out normally but the browser is
          // still scrolled to wherever the visitor was on the old
          // page — for a frame or two, whatever section of the new
          // page happens to line up with that old scroll offset
          // flashes on screen before the real scrollTo(0,0) (further
          // down, in NAVIGATE_END) catches up. That stray flash is
          // what was reading as a "glitch" — most noticeably on the
          // Work page, since its category descriptions sit roughly
          // mid-page and were exactly what lined up.
          window.scrollTo(0, 0);
          gsap.set(to, { clearProps: 'position,top,left,width,height,overflow,y,zIndex' });
          if (clipper.parentNode) clipper.parentNode.removeChild(clipper);
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
    // false on purpose: both transition styles need the outgoing page
    // still in the DOM while they animate, so onEnter removes it
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
