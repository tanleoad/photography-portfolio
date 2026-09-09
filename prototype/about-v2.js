// =========================================================
// PROTOTYPE — About v2 (editorial portrait)
// =========================================================
// Isolated script for prototype/about-v2.html. Not loaded by the
// live site.
//
// Deliberately minimal. v1's rejection was specific: "the pacing
// mechanism works technically... but it preserves the same
// underlying visual structure and simply staggers its existing
// elements." The fix isn't more sequencing, it's less -- this file
// does exactly one thing: a plain, immediate reveal-on-intersect for
// each of the five composed acts (Presence / Voice / Practice /
// Recognition / Exit), the same convention already used everywhere
// else on the site. No held-back timing, no per-row stagger. The
// "staged, composed" feeling this time comes from about-v2.css's
// layout and typographic hierarchy -- the full-bleed portrait, the
// asymmetric pull-quote, the two-column record read as one ledger --
// not from a scripted sequence.

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
  }, { threshold: 0.2 });
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
