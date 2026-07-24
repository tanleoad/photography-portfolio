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

    /* ---- Custom cursor + photo tilt (desktop hover only) ----
       Only on hover-capable, fine-pointer devices — touch/mobile never
       gets a cursor to replace, so this stays out of their way
       entirely (matching the pattern already used for the homepage
       "Selected Stories" hover cycle above). */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.body.classList.add('has-custom-cursor');

      const cursorDot = document.createElement('div');
      cursorDot.className = 'cursor-dot';
      cursorDot.innerHTML = '<span class="cursor-dot-label"></span>';
      document.body.appendChild(cursorDot);
      const cursorLabel = cursorDot.querySelector('.cursor-dot-label');

      let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
      (function tickCursor() {
        cx += (mx - cx) * 0.2;
        cy += (my - cy) * 0.2;
        cursorDot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(tickCursor);
      })();

      const growCursor = (label) => {
        cursorDot.classList.add('is-grown');
        cursorLabel.textContent = label || '';
      };
      const shrinkCursor = () => cursorDot.classList.remove('is-grown');

      document.querySelectorAll('.carousel-explore, .carousel-arrow').forEach(el => {
        el.addEventListener('mouseenter', () => growCursor(''));
        el.addEventListener('mouseleave', shrinkCursor);
      });

      // Photos: grow the cursor into a "View" label, and gently tilt
      // the image toward the pointer — a livelier hover than a flat
      // zoom, while still calm enough for a photography portfolio.
      carouselSlides.forEach((slide) => {
        const photo = slide.querySelector('.carousel-photo');
        const img = photo && photo.querySelector('img');
        if (!photo || !img) return;

        photo.addEventListener('mouseenter', () => growCursor('View'));
        photo.addEventListener('mouseleave', () => {
          shrinkCursor();
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
  }

});
