// =========================================================
// PROTOTYPE — About v1 (held-plate procession)
// =========================================================
// Isolated script for prototype/about-v1.html. Not loaded by the
// live site.
//
// About was already restructured into sequential beats in an
// earlier coherence pass -- presence (portrait) -> statement ->
// practice -> recognition -> closing -- but every beat still uses
// only the plain, generic .reveal fade: a single IntersectionObserver
// that reveals an element the moment it crosses 20% visibility, with
// no relationship to any other element. That's the "connective
// tissue" pattern flagged in claude/coherence-audit-v1.md as generic
// rather than distinctive.
//
// This implements the "held-plate / staged-scroll procession" from
// claude/held-print-interaction-system-v1.md section 7 on top of
// that same real structure -- pacing only, nothing new visually, no
// content/copy/typography/palette changes, nothing gated behind
// hover or dwell. Concretely:
//
//   Plate 1 (portrait + caption) -- unchanged. Reveals immediately on
//   intersect, exactly as it does in production today. No problem
//   was found here: the earlier restructure already gave the
//   portrait its own real presence via .photo-presence, separate
//   from a paragraph in a fixed grid cell.
//
//   Plate 2 (the opening statement) -- also reveals immediately on
//   intersect, same as today. Its reveal time is recorded so Plate 3
//   can be paced relative to it.
//
//   Plate 3 (the practice line) -- held back so it can never appear
//   in the same instant as Plate 2. Verified this is a real gap, not
//   a hypothetical one: Statement and Practice combined are short
//   enough that on many desktop viewport heights both cross the 20%
//   visibility threshold within the same IntersectionObserver
//   callback batch, so a plain .reveal on each would fire them
//   together. This holds Practice back until Statement has had at
//   least STATEMENT_PRACTICE_GAP ms of its own moment first.
//
//   Plate 4 (the seven recognition credits) -- this is the case the
//   design doc calls out most directly ("as a procession, not a
//   grid... arriving one/two at a time rather than scanned all at
//   once"). All seven rows fit inside a single screen on common
//   desktop heights, so a plain per-row .reveal would similarly
//   reveal several or all seven in one batch the instant the list
//   scrolls into view -- functionally still a grid reveal, just with
//   list markup. Rows are released one at a time on a short stagger
//   once the list itself enters view, so the credits genuinely arrive
//   as a sequence a visitor reads down, not a block they scan.
//
// None of this is scroll-gated content: at a normal reading scroll
// speed every plate has already arrived, in document order, well
// before the visitor reaches it -- the design doc's own framing is
// "earned means paced, not hidden," not a puzzle or a reward for
// dwelling. prefers-reduced-motion collapses both holds to 0 so nothing
// paces out over time for a visitor who has asked to avoid that, and a
// safety timeout (same convention the real site already uses for its
// own reveal-in-progress states) guarantees nothing stays hidden if
// IntersectionObserver never fires for some reason.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STATEMENT_PRACTICE_GAP = reduceMotion ? 0 : 450; // ms Practice waits after Statement's own reveal
  const ROW_STAGGER = reduceMotion ? 0 : 90;              // ms between each recognition row
  const SAFETY_MS = 4000;

  const statementEl = document.querySelector('.about-statement');
  const practiceEl = document.querySelector('.about-practice');
  const rowEls = Array.from(document.querySelectorAll('.recognition-row'));
  const recognitionSection = document.querySelector('.recognition');

  // Everything paced by this script starts hidden via .pre, same
  // convention as the real .reveal usage sitewide -- visible by
  // default in markup, hidden only once JS has actually taken over.
  const plainEls = Array.from(document.querySelectorAll('.reveal'))
    .filter(el => el !== statementEl && el !== practiceEl && !rowEls.includes(el));

  function setPre(el) { if (el) el.classList.add('pre'); }
  function revealNow(el) {
    if (!el || el.classList.contains('in')) return;
    el.classList.remove('pre');
    el.classList.add('in');
  }

  plainEls.forEach(setPre);
  setPre(statementEl);
  setPre(practiceEl);
  rowEls.forEach(setPre);

  // ---- Plate 1 (portrait/caption) + eyebrow + closing: plain,
  // immediate reveal on intersect -- unchanged from the site's
  // existing .reveal pattern. ----
  const plainIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        revealNow(entry.target);
        plainIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  plainEls.forEach(el => plainIO.observe(el));

  // ---- Plate 2 (statement): immediate reveal, same as today, but
  // records when it revealed so Plate 3 can hold its own moment. ----
  let statementRevealedAt = null;
  const statementIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && statementRevealedAt === null) {
        statementRevealedAt = performance.now();
        revealNow(entry.target);
        statementIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  if (statementEl) statementIO.observe(statementEl);

  // ---- Plate 3 (practice): held back until Statement has had at
  // least STATEMENT_PRACTICE_GAP ms of its own moment, regardless of
  // how close together the two elements actually crossed the
  // intersection threshold. ----
  const practiceIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.classList.contains('in')) return;
      practiceIO.unobserve(entry.target);
      const elapsed = statementRevealedAt === null ? 0 : performance.now() - statementRevealedAt;
      const wait = Math.max(0, STATEMENT_PRACTICE_GAP - elapsed);
      setTimeout(() => revealNow(entry.target), wait);
    });
  }, { threshold: 0.2 });
  if (practiceEl) practiceIO.observe(practiceEl);

  // ---- Plate 4 (recognition): released as a procession, one row at
  // a time, once the list scrolls into view -- rather than each
  // row's own IntersectionObserver, which (verified) can fire for
  // several or all seven rows in the same callback batch on a
  // typical desktop viewport, since the whole list is short enough
  // to fit on one screen. ----
  if (rowEls.length && recognitionSection) {
    let released = false;
    const recognitionIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || released) return;
        released = true;
        recognitionIO.unobserve(entry.target);
        rowEls.forEach((row, i) => {
          setTimeout(() => revealNow(row), i * ROW_STAGGER);
        });
      });
    }, { threshold: 0.15 });
    recognitionIO.observe(recognitionSection);
  }

  // Safety net -- nothing should stay permanently hidden if
  // IntersectionObserver support is missing or an element is never
  // observed for any reason.
  setTimeout(() => {
    document.querySelectorAll('.pre').forEach(revealNow);
  }, SAFETY_MS);
})();
