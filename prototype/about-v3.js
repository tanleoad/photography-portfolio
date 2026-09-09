// =========================================================
// PROTOTYPE — About v3 (held portrait, continuous read)
// =========================================================
// Isolated script for prototype/about-v3.html. Not loaded by the
// live site.
//
// Deliberately the plainest possible version of this: a single
// immediate reveal-on-intersect for each element, the same
// IntersectionObserver convention used everywhere else on the site.
// v3's entire idea lives in about-v3.css (the sticky portrait column
// + one continuous text column) -- there is nothing here to
// choreograph. No sequencing, no held-back timing, no per-item
// stagger.

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
