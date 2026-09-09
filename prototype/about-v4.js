// =========================================================
// PROTOTYPE — About v4 (photographic monograph)
// =========================================================
// Isolated script for prototype/about-v4.html. Not loaded by the
// live site.
//
// Deliberately the plainest possible version of this: a single
// immediate reveal-on-intersect for each block, the same
// IntersectionObserver convention used everywhere else on the site
// (and by every prior About prototype). One settle per block, no
// sequencing, no held-back timing, no per-item stagger -- the brief
// asks for a composition that still reads as intentional with the
// motion switched off entirely, so nothing here does compositional
// work motion alone should not be doing.

(function () {
  const revealEls = document.querySelectorAll('.reveal');
  revealEls.forEach(el => el.classList.add('pre'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pre');
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  // Safety net -- nothing should stay permanently hidden if
  // IntersectionObserver support is missing for some reason.
  setTimeout(() => {
    document.querySelectorAll('.pre').forEach(el => {
      el.classList.remove('pre');
      el.classList.add('in');
    });
  }, 4000);
})();
