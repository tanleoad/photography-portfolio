// ============================================================
// Tania Khan Photography — shared behaviour
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

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

  /* ---- Hero "Selected Stories" auto-cycle ----
     Titles/images advance on their own every 4.5s. Pauses while the
     visitor's mouse is over the list (real :hover takes over via CSS),
     and only runs on devices with a real pointer — touch/mobile skips
     this since those screens show every image inline already. */
  const cheroList = document.querySelector('.chero-list');
  if (cheroList && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const storyLinks = Array.from(cheroList.querySelectorAll('.story-link'));
    const mediaByClass = {};
    storyLinks.forEach(link => {
      const slug = Array.from(link.classList).find(c => c.startsWith('s-'));
      if (slug) mediaByClass[slug] = document.querySelector('.chero-media .story-media.' + slug);
    });

    let cycleIndex = 0;
    let cycleTimer = null;

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
      cycleTimer = setInterval(() => {
        cycleIndex = (cycleIndex + 1) % storyLinks.length;
        setActive(cycleIndex);
      }, 4500);
    };

    const stopCycle = () => {
      clearInterval(cycleTimer);
      clearActive();
    };

    if (storyLinks.length) {
      startCycle();
      cheroList.addEventListener('mouseenter', stopCycle);
      cheroList.addEventListener('mouseleave', startCycle);
    }
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
    menuTrigger.addEventListener('click', openMenu);
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    menuOverlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
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
    window.addEventListener('scroll', () => {
      if (!heroTicking) { heroTicking = true; requestAnimationFrame(updateHeroExit); }
    }, { passive: true });
    window.addEventListener('resize', updateHeroExit);
    updateHeroExit();
  }

  /* ---- Scroll reveal ----
     Elements are visible by default in CSS. Only after we confirm
     IntersectionObserver works do we opt them into the pre-animation
     (hidden) state, so a JS failure never hides real content. */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    revealEls.forEach(el => el.classList.add('pre'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          entry.target.classList.remove('pre');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));

    // Safety net: if something never intersects (edge cases, fast scroll,
    // odd viewport), force it visible after a few seconds regardless.
    setTimeout(() => {
      document.querySelectorAll('.reveal.pre').forEach(el => {
        el.classList.add('in');
        el.classList.remove('pre');
      });
    }, 4000);
  }

  /* ---- Homepage intro (index.html only, plays every time the page loads) ---- */
  const introOverlay = document.getElementById('introOverlay');
  if (introOverlay) {
    document.body.classList.add('intro-active');
    const introLetters = introOverlay.querySelectorAll('.intro-name span');
    const introLastDelay = (introLetters.length - 1) * 150;
    const introLetterDuration = 700;
    const introHoldTime = 600;
    const introFadeTime = 1300;
    setTimeout(() => {
      introOverlay.classList.add('intro-hide');
      document.body.classList.remove('intro-active');
      setTimeout(() => introOverlay.remove(), introFadeTime);
    }, introLastDelay + introLetterDuration + introHoldTime);
  }

  /* ---- Site-wide: tiny camera cursor + click flash ----
     Runs on every page. On hover-capable, fine-pointer devices (desktop)
     it swaps the native pointer for a small camera icon that grows and
     turns gold over anything clickable — sections below call
     cursor.grow(label)/cursor.shrink() for their own interactive
     elements. Text fields keep their real caret cursor. The click
     flash is separate from the cursor itself and fires on every click
     anywhere on the page, including touch, since it's just a burst at
     the click point. */
  const cursor = (() => {
    let grow = () => {};
    let shrink = () => {};

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.body.classList.add('has-custom-cursor');

      const cam = document.createElement('div');
      cam.className = 'cursor-cam';
      cam.innerHTML =
        '<span class="cursor-cam-icon">' +
          '<svg viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">' +
            '<defs><mask id="camRingMask">' +
              '<rect x="0" y="0" width="32" height="24" fill="#fff"/>' +
              '<circle cx="16" cy="14" r="4.1" fill="#000"/>' +
            '</mask></defs>' +
            '<path d="M11 1.6h10a2.2 2.2 0 0 1 2.2 2.2v2.3H8.8V3.8A2.2 2.2 0 0 1 11 1.6Z" fill="currentColor"/>' +
            '<rect x="2" y="6" width="28" height="16.4" rx="4" fill="currentColor"/>' +
            '<circle cx="16" cy="14" r="6.3" fill="#fff" mask="url(#camRingMask)"/>' +
          '</svg>' +
        '</span>' +
        '<span class="cursor-cam-label"></span>';
      document.body.appendChild(cam);
      const camLabel = cam.querySelector('.cursor-cam-label');

      let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
      (function tickCursor() {
        cx += (mx - cx) * 0.2;
        cy += (my - cy) * 0.2;
        cam.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(tickCursor);
      })();

      // A camera icon over a text field is confusing — hide it and
      // let the real text caret show instead.
      document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', () => cam.classList.add('is-hidden'));
        el.addEventListener('mouseleave', () => cam.classList.remove('is-hidden'));
      });

      grow = (label) => { cam.classList.add('is-grown'); camLabel.textContent = label || ''; };
      shrink = () => cam.classList.remove('is-grown');

      // Tiny shutter-press squeeze on the icon itself when you click.
      document.addEventListener('mousedown', () => cam.classList.add('is-clicked'));
      document.addEventListener('mouseup', () => cam.classList.remove('is-clicked'));
    }

    const flashVeil = document.createElement('div');
    flashVeil.className = 'flash-veil';
    document.body.appendChild(flashVeil);

    document.addEventListener('click', (e) => {
      const flash = document.createElement('div');
      flash.className = 'cursor-flash';
      flash.style.left = e.clientX + 'px';
      flash.style.top = e.clientY + 'px';
      document.body.appendChild(flash);
      requestAnimationFrame(() => flash.classList.add('is-active'));
      setTimeout(() => flash.remove(), 600);

      // Whole-screen brightness pop so the flash reads clearly
      // against both light and dark photos.
      flashVeil.classList.remove('is-active');
      void flashVeil.offsetWidth; // restart the animation on rapid clicks
      flashVeil.classList.add('is-active');

      // A click that jumps straight to another page swaps the whole
      // page out before the flash has a chance to be seen. Hold real,
      // same-page navigations back just long enough for the flash to
      // register, then continue on to the link as normal. In-page
      // anchors (#work, the carousel's own hash links), new-tab
      // clicks, modified clicks, and mailto/tel links are left alone.
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
        setTimeout(() => { window.location.href = dest; }, 200);
      }
    });

    return { grow, shrink };
  })();

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

});
