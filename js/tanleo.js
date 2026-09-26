/* ============================================================
   TANLEO pinned sequence (v11, 2026-09-26). Same isolated-module pattern
   as v3-v10 and as statement.js elsewhere on this page: two gates
   (isDesktopWidth/prefersReducedMotion), the same progress-calculation
   shape, the same rAF-throttled scroll handling, the same
   IntersectionObserver-gated listener attachment (perf-only, not a
   layout gate -- see syncClass()/syncListening() below, unchanged in
   structure from v3-v10).

   v11 replaces v10's PRACTICE choreography outright -- a concept change,
   not a tuning pass. v10 gave each word its own arrive-then-photograph
   chapter, in sequence. Tan watched it rendered and rejected the
   underlying idea, not just the execution: "reads as three independent
   website animations... word + image, word + image, word + image." She
   asked for a concept proposal before any more code, approved it with
   four refinements, and this is that approved concept, built as
   specified:

   PRACTICE is now ONE FIXED COMPOSITION -- a spine -- not three
   sequential word+image beats. The hairline rule and all three words
   install themselves together, once, early in the beat, at a dimmed but
   clearly-present baseline (0.5 opacity -- Tan's explicit correction:
   hierarchy comes from focus, not from inactive words nearly
   disappearing). Nothing about the spine's position or the rule's
   quiet, constant opacity changes again after that. What moves is
   FOCUS: Photography's word brightens (opacity + the smallest possible
   scale settle, 0.985->1.0, no overshoot -- "restrained... physical and
   editorial, not UI-animated," her direct correction to the first pass
   at this), and while it's focused, its own photograph -- sized by its
   OWN aspect ratio, not a shared plate width, and positioned in the
   open field to the right of the spine rather than in the literal
   vertical band of its word (her explicit "avoid a literal word <->
   image grid relationship") -- rises, holds, and recedes. Before it has
   fully receded, Retouching's focus is already rising (the overlap that
   makes this read as one continuous unspooling rather than three
   discrete events) -- Photography's word then eases back to the dimmed
   baseline, not to zero, and stays there as a completed step. The same
   pattern repeats into Colour, except Colour's word does NOT dim back
   down once focused, and its photograph does NOT recede on its own --
   it is the culmination, and both stay exactly as they are until the
   whole composition (both dimmed words, Colour's word, the rule,
   Colour's photograph) dissolves together in one shared closing
   gesture, immediately followed by a short black breath, then the pin
   releases into #projects. IDENTITY through VOICE's own recede
   (0.0000-0.7075) are untouched; everything from PRACTICE's spine
   onward is new this round -- see computeVars() below for the exact
   bands. The WebGL Threshold module removal from the v9 round is
   unchanged (still gone -- see index.html/style.css's own removal
   comments). Total budget from PRACTICE's spine to the pin's release is
   unchanged from v8-v10 (still 408vh track height, see style.css) -- a
   further reallocation of the same space, not a lengthening.
   Below the gate (narrower than 901px, or reduced motion requested)
   this file does nothing at all -- no listeners, no work -- and the
   section's own CSS falls back to a plain static stack, exactly as
   v3-v10 and Statement itself already do under the same gate.

   v11.2 (2026-09-26, same day): the spine/focus choreography above is
   fully LOCKED and untouched by this round -- "the typography stays
   exactly as it is now." Tan asked for one further, narrower change,
   to the photograph mechanism only, and this is the second attempt at
   it (an intermediate aperture/clip-path mask version was tried and
   replaced outright, not layered on top): "we're trying too hard to
   invent a clever interaction... let the image be the event." Each
   photograph now simply flashes into opacity (a quick, soft rise),
   holds, and dissolves back to black slightly more slowly than it
   arrived -- no mask, no movement, nothing -> photograph -> nothing.
   See the "Photograph flash" comment just above computeVars() for the
   exact bands, and style.css for the (now much larger, composition-
   driven rather than uniform) sizing.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('tanleo');
  var pin = section && section.querySelector('.tanleo-pin');
  if (!section || !pin) return;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isDesktopWidth() {
    return window.matchMedia('(min-width: 901px)').matches;
  }
  function gateOK() {
    return isDesktopWidth() && !prefersReducedMotion();
  }

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  // Linear 0..1 ramp between two progress values, clamped outside that band.
  function band(p, a, b) { return clamp01((p - a) / (b - a)); }
  // easeOutCubic -- the same settling character as the house
  // cubic-bezier(0.16,1,0.3,1) used by .reveal everywhere else.
  function ease(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

  // ---- Beats (scroll progress 0..1 across the pinned track) ----
  // v11 (2026-09-26) touches PRACTICE's first word onward (0.7075+);
  // IDENTITY through VOICE's own recede (0.0000-0.7075) are untouched.
  // Track height is unchanged too (still 408vh, see style.css) -- this
  // is a further reallocation of the existing tail, not a lengthening
  // of it.
  //   0.0000-0.0625  IDENTITY arrives (mark + role, tracking contraction)
  //   0.0625-0.1041  IDENTITY settles smaller/quieter to make room below it
  //   0.1041-0.2084  PORTRAIT rises + settles beneath identity, one column,
  //                  arriving a fraction larger than its final size (peaks
  //                  at 102%, not a noticeable zoom -- see portraitScale)
  //   0.2084-0.2431  PORTRAIT SETTLE -- position/opacity have already
  //                  resolved by 0.2084, so this last sliver is purely the
  //                  102% -> 100% scale contraction, on its own, after
  //                  everything else has landed -- meant to read as a
  //                  photographic print settling onto a table, not an
  //                  image still animating
  //   0.2431-0.3125  EXHIBITION CAPTION arrives the instant the portrait
  //                  settles -- no static dead gap before it
  //   0.3125-0.3959  the whole plate (identity+portrait+caption) holds --
  //                  deliberate dwell on the fully-formed photograph
  //   0.3959-0.4653  the whole plate recedes together, as one unit
  //   0.4653-0.5209  BLACK -- a connective pause (untouched -- this is
  //                  the PLATE -> VOICE seam, not the VOICE -> PRACTICE
  //                  one this round's brief asked to tighten)
  //   0.5209-0.5765  FIRST-PERSON VOICE line 1 arrives
  //   0.5556-0.6112  FIRST-PERSON VOICE line 2 arrives (stagger)
  //   0.6112-0.6528  VOICE holds
  //   0.6528-0.7015  VOICE recedes -- ends exactly here, same as v7
  //   0.7015-0.7075  brief breath -- shortened from v7's 0.0138 (~5.6vh)
  //                  to 0.0060 (~2.4vh) so PRACTICE begins entering while
  //                  VOICE's own recede has just settled, not after a
  //                  second, separate pause. Still not zero -- black
  //                  stays part of the site's language, just less of it.
  // PRACTICE is now ONE FIXED COMPOSITION -- a spine -- that FOCUS
  // travels through, not three sequential word+image beats. This
  // choreography is LOCKED (approved by Tan, then explicitly re-locked
  // in full when she asked for only the photograph reveal mechanism to
  // change) -- do not alter these bands without her direct request.
  //   0.7075-0.7300  SPINE ESTABLISH -- the hairline rule draws (linear,
  //                  "a steady drawn line") to a deliberately low,
  //                  constant opacity (0.3 -- see facetRuleOpacity,
  //                  never brightens/pulses again after this) while all
  //                  three words fade in TOGETHER, as one gesture, to a
  //                  dimmed-but-clearly-present baseline (0.5 opacity --
  //                  never near-invisible). Nothing arrives one at a
  //                  time here; the whole spine installs itself at once.
  //   0.7300-0.8020  CHAPTER: PHOTOGRAPHY IN FOCUS
  //     0.7300-0.7460  word "Photography" brightens 0.5->1.0 (opacity +
  //                    the smallest scale settle, 0.985->1.0, no
  //                    overshoot -- see facetWord0Scale)
  //     0.7460-0.7520  its photograph FLASHES in -- quick, soft rise
  //                    (see "Photograph flash" below)
  //     0.7520-0.7680  flash holds, just long enough to be seen
  //     0.7680-0.7960  flash dissolves back to black -- slower than the
  //                    rise (the photograph itself never moves; only
  //                    opacity animates, see style.css)
  //     0.7860-0.8020  word "Photography" eases back to the dimmed
  //                    baseline (starts before the flash has fully
  //                    dissolved -- the overlap that keeps this feeling
  //                    continuous rather than three discrete events) --
  //                    NOT to zero: it stays present, a completed step
  //   0.7900-0.8620  CHAPTER: RETOUCHING IN FOCUS (word0's own focus-down
  //                  above already overlaps into this chapter's start)
  //     0.7900-0.8060  word "Retouching" brightens 0.5->1.0
  //     0.8060-0.8120  its photograph flashes in
  //     0.8120-0.8280  flash holds
  //     0.8280-0.8560  flash dissolves back to black
  //     0.8460-0.8620  word "Retouching" eases back to the dimmed
  //                    baseline
  //   0.8500-0.8840+  CHAPTER: COLOUR IN FOCUS -- the culmination
  //     0.8500-0.8660  word "Colour" brightens 0.5->1.0 (overlaps
  //                    Retouching's own focus-down above)
  //     0.8660-0.8720  its photograph flashes in (same quick rise as
  //                    the other two)
  //     0.8720 onward  flash HOLDS -- by far the longest hold of the
  //                    three, "the longest visual hold" as the
  //                    culmination. Colour's word does not dim back
  //                    down and its photograph does not dissolve on its
  //                    own; both simply stay exactly as they are until
  //                    the shared dissolve below. "It appears, you get
  //                    to look at it, then it dissolves, and
  //                    immediately after, Selected Work begins" -- so
  //                    there is no independent close for this one, only
  //                    the shared dissolve.
  //   0.9500-0.9800  FINAL COLLECTIVE DISSOLVE -- the whole composition
  //                  (both dimmed words, COLOUR's focused word, the
  //                  rule, and Colour's still-held photograph) fades to
  //                  black together, once, as one gesture (facetGroupY
  //                  drifts the words+rule -12px, same character as
  //                  v5-v10's recede; facetImgFinalOpacity fades all
  //                  three images uniformly -- Photography/Retouching
  //                  have already dissolved by now so this only visibly
  //                  affects Colour's still-held photograph).
  //   0.9800-1.0000  BLACK THRESHOLD -- nothing animating, a short plain
  //                  black hold before the pin releases directly into
  //                  #projects, the real Selected Work section. No
  //                  intermediate hero, no About link, no closing
  //                  caption, no "SELECTED WORK"/"EXPLORE" transition
  //                  title -- the first actual Selected Work photograph
  //                  is the very next visual event.
  //
  // Photograph flash (v11.2, replacing v11.1's aperture/clip-path mask,
  // which itself replaced every earlier round's opacity+translate
  // plate/apparition treatment): "we're trying too hard to invent a
  // clever interaction... let the image be the event." No mask, no
  // movement, no mechanism -- nothing -> photograph -> nothing. Each of
  // the three facetImgNReveal values below (0..1) drives plain opacity
  // on the .tanleo-facet-image container in style.css, nothing else --
  // the <img> itself never has opacity, scale or translate applied to
  // it at any point. Every rise band is short (a quick, soft flash --
  // "almost like a photographic exposure," not an instant CSS pop);
  // every close band is longer than its own rise (a slightly slower
  // dissolve out than the flash in). Photography and Retouching flash,
  // hold briefly, and dissolve fully within their own chapter; Colour
  // flashes and simply holds -- by far the longest hold of the three --
  // fading only via the shared facetImgFinalOpacity together with the
  // rest of the final collective dissolve above, rather than dissolving
  // on its own. Composition (each image's own scale and position, sized
  // close to "roughly 55-70% of the viewport") is what now varies
  // photograph to photograph, not three different animation
  // directions -- see style.css for the actual values.
  function computeVars(p) {
    var identityArrive = ease(band(p, 0.0000, 0.0625));
    var identitySettle = ease(band(p, 0.0625, 0.1041));
    // Split into an arrival (position/opacity/scale-up-to-overshoot) and
    // a separate, later settle (scale only) -- see portraitScale below
    // and the beat-map comment above.
    var portraitRise = ease(band(p, 0.1041, 0.2084));
    var portraitSettle = ease(band(p, 0.2084, 0.2431));
    var captionArrive = ease(band(p, 0.2431, 0.3125));
    var plateRecede = ease(band(p, 0.3959, 0.4653));

    var identityDim = 1 - 0.22 * identitySettle; // settles quieter, never hidden
    var identityScale = 1 - 0.12 * identitySettle;
    var identityTracking = 1 - identityArrive; // 1 = wide/untracked start, 0 = resting
    var identityY = 14 * (1 - identityArrive);
    var identityOpacity = identityArrive * identityDim * (1 - plateRecede);

    var portraitOpacity = portraitRise * (1 - plateRecede);
    // 0.92 -> 1.02 across the rise (arrives "a fraction larger than its
    // final size"), then 1.02 -> 1.00 across the separate settle below,
    // once position and opacity have already resolved -- a photographic
    // print settling onto a table, not an image still visibly animating.
    // Not a noticeable zoom: the overshoot above 100% is only 2%.
    var portraitScale = 0.92 + 0.10 * portraitRise - 0.02 * portraitSettle;
    var portraitY = 24 * (1 - portraitRise);

    var captionOpacity = captionArrive * (1 - plateRecede);

    var plateY = -18 * plateRecede; // the whole plate lifts slightly as it recedes

    var voiceLine0 = ease(band(p, 0.5209, 0.5765));
    var voiceLine1 = ease(band(p, 0.5556, 0.6112));
    var voiceRecede = ease(band(p, 0.6528, 0.7015));
    var voiceLine0Opacity = voiceLine0 * (1 - voiceRecede);
    var voiceLine0Y = 16 * (1 - voiceLine0);
    var voiceLine1Opacity = voiceLine1 * (1 - voiceRecede);
    var voiceLine1Y = 16 * (1 - voiceLine1);

    // SPINE ESTABLISH: rule draws (linear) to a quiet, constant opacity;
    // all three words fade in TOGETHER to a dimmed 0.5 baseline. Neither
    // brightens/pulses again outside of a word's own focus chapter.
    var spineEstablish = ease(band(p, 0.7075, 0.7300));
    var ruleDraw = band(p, 0.7075, 0.7300); // linear -- a steady drawn line, not an eased one
    var finalDissolve = ease(band(p, 0.9500, 0.9800));

    // FOCUS, per word: rise (0.5->1.0) then, for Photography/Retouching
    // only, down (1.0->0.5, starting before the previous chapter's
    // reveal has fully closed -- see the beat-map comment above for why
    // that overlap matters). Colour has no "down" -- it is the
    // culmination and stays focused through to the shared dissolve.
    var focus0Rise = ease(band(p, 0.7300, 0.7460));
    var focus0Down = ease(band(p, 0.7860, 0.8020));
    var focus0 = focus0Rise * (1 - focus0Down);

    var focus1Rise = ease(band(p, 0.7900, 0.8060));
    var focus1Down = ease(band(p, 0.8460, 0.8620));
    var focus1 = focus1Rise * (1 - focus1Down);

    var focus2 = ease(band(p, 0.8500, 0.8660)); // no down

    // Opacity = dimmed baseline (0.5, once the spine has established)
    // plus up to another 0.5 of focus boost, then everything fades
    // together at the very end. Scale is the "restrained settle" --
    // 0.985 unfocused, 1.0 focused, monotonic, never overshooting past
    // 1.0 -- opacity and weight carry the hierarchy, not a bounce.
    var facetWord0Opacity = (0.5 * spineEstablish + focus0 * 0.5) * (1 - finalDissolve);
    var facetWord0Scale = 0.985 + 0.015 * focus0;
    var facetWord1Opacity = (0.5 * spineEstablish + focus1 * 0.5) * (1 - finalDissolve);
    var facetWord1Scale = 0.985 + 0.015 * focus1;
    var facetWord2Opacity = (0.5 * spineEstablish + focus2 * 0.5) * (1 - finalDissolve);
    var facetWord2Scale = 0.985 + 0.015 * focus2;

    var facetRuleScale = ruleDraw;
    var facetRuleOpacity = 0.3 * spineEstablish * (1 - finalDissolve);
    var facetGroupY = -12 * finalDissolve;

    // PHOTOGRAPH REVEAL (aperture/mask): the photograph itself never
    // moves -- these three values (0..1, concealed to fully revealed)
    // drive a clip-path in style.css, nothing else. Photography and
    // Retouching open, hold, and close within their own chapter, using
    // the same rise*(1-recede) idiom used elsewhere on this page.
    // Colour opens and simply holds -- no recede band -- since it
    // dissolves with the rest of the composition instead of closing on
    // its own (see facetImgFinalOpacity below).
    var facetImg0RevealRise = ease(band(p, 0.7460, 0.7520));
    var facetImg0RevealClose = ease(band(p, 0.7680, 0.7960));
    var facetImg0Reveal = facetImg0RevealRise * (1 - facetImg0RevealClose);

    var facetImg1RevealRise = ease(band(p, 0.8060, 0.8120));
    var facetImg1RevealClose = ease(band(p, 0.8280, 0.8560));
    var facetImg1Reveal = facetImg1RevealRise * (1 - facetImg1RevealClose);

    var facetImg2Reveal = ease(band(p, 0.8660, 0.8720)); // quick flash in, then holds open

    // Shared final fade for all three images, driven only by the same
    // finalDissolve as the words/rule -- Photography and Retouching are
    // already fully closed (invisible) by 0.9500 so this only visibly
    // affects Colour's still-open photograph.
    var facetImgFinalOpacity = 1 - finalDissolve;

    return {
      identityOpacity: identityOpacity,
      identityTracking: identityTracking,
      identityY: identityY,
      identityScale: identityScale,

      portraitOpacity: portraitOpacity,
      portraitScale: portraitScale,
      portraitY: portraitY,

      captionOpacity: captionOpacity,
      plateY: plateY,

      voiceLine0Opacity: voiceLine0Opacity,
      voiceLine0Y: voiceLine0Y,
      voiceLine1Opacity: voiceLine1Opacity,
      voiceLine1Y: voiceLine1Y,

      facetWord0Opacity: facetWord0Opacity,
      facetWord0Scale: facetWord0Scale,
      facetWord1Opacity: facetWord1Opacity,
      facetWord1Scale: facetWord1Scale,
      facetWord2Opacity: facetWord2Opacity,
      facetWord2Scale: facetWord2Scale,
      facetRuleScale: facetRuleScale,
      facetRuleOpacity: facetRuleOpacity,
      facetGroupY: facetGroupY,

      facetImg0Reveal: facetImg0Reveal,
      facetImg1Reveal: facetImg1Reveal,
      facetImg2Reveal: facetImg2Reveal,
      facetImgFinalOpacity: facetImgFinalOpacity
    };
  }

  function applyVars(v) {
    var s = section.style;
    s.setProperty('--tlIdentityOpacity', v.identityOpacity.toFixed(4));
    s.setProperty('--tlIdentityTracking', v.identityTracking.toFixed(4));
    s.setProperty('--tlIdentityY', v.identityY.toFixed(2) + 'px');
    s.setProperty('--tlIdentityScale', v.identityScale.toFixed(4));

    s.setProperty('--tlPortraitOpacity', v.portraitOpacity.toFixed(4));
    s.setProperty('--tlPortraitScale', v.portraitScale.toFixed(4));
    s.setProperty('--tlPortraitY', v.portraitY.toFixed(2) + 'px');

    s.setProperty('--tlCaptionOpacity', v.captionOpacity.toFixed(4));
    s.setProperty('--tlPlateY', v.plateY.toFixed(2) + 'px');

    s.setProperty('--tlVoiceLine0Opacity', v.voiceLine0Opacity.toFixed(4));
    s.setProperty('--tlVoiceLine0Y', v.voiceLine0Y.toFixed(2) + 'px');
    s.setProperty('--tlVoiceLine1Opacity', v.voiceLine1Opacity.toFixed(4));
    s.setProperty('--tlVoiceLine1Y', v.voiceLine1Y.toFixed(2) + 'px');

    s.setProperty('--tlFacetWord0Opacity', v.facetWord0Opacity.toFixed(4));
    s.setProperty('--tlFacetWord0Scale', v.facetWord0Scale.toFixed(4));
    s.setProperty('--tlFacetWord1Opacity', v.facetWord1Opacity.toFixed(4));
    s.setProperty('--tlFacetWord1Scale', v.facetWord1Scale.toFixed(4));
    s.setProperty('--tlFacetWord2Opacity', v.facetWord2Opacity.toFixed(4));
    s.setProperty('--tlFacetWord2Scale', v.facetWord2Scale.toFixed(4));
    s.setProperty('--tlFacetRuleScale', v.facetRuleScale.toFixed(4));
    s.setProperty('--tlFacetRuleOpacity', v.facetRuleOpacity.toFixed(4));
    s.setProperty('--tlFacetGroupY', v.facetGroupY.toFixed(2) + 'px');

    s.setProperty('--tlFacetImg0Reveal', v.facetImg0Reveal.toFixed(4));
    s.setProperty('--tlFacetImg1Reveal', v.facetImg1Reveal.toFixed(4));
    s.setProperty('--tlFacetImg2Reveal', v.facetImg2Reveal.toFixed(4));
    s.setProperty('--tlFacetImgFinalOpacity', v.facetImgFinalOpacity.toFixed(4));
  }

  function clearVars() {
    var props = ['--tlIdentityOpacity', '--tlIdentityTracking', '--tlIdentityY', '--tlIdentityScale',
      '--tlPortraitOpacity', '--tlPortraitScale', '--tlPortraitY',
      '--tlCaptionOpacity', '--tlPlateY',
      '--tlVoiceLine0Opacity', '--tlVoiceLine0Y', '--tlVoiceLine1Opacity', '--tlVoiceLine1Y',
      '--tlFacetWord0Opacity', '--tlFacetWord0Scale',
      '--tlFacetWord1Opacity', '--tlFacetWord1Scale',
      '--tlFacetWord2Opacity', '--tlFacetWord2Scale',
      '--tlFacetRuleScale', '--tlFacetRuleOpacity', '--tlFacetGroupY',
      '--tlFacetImg0Reveal', '--tlFacetImg1Reveal', '--tlFacetImg2Reveal',
      '--tlFacetImgFinalOpacity'];
    for (var i = 0; i < props.length; i++) section.style.removeProperty(props[i]);
  }

  // ---- Progress: raw scroll position mapped across the track's own
  // scrollable range (its height minus the 100vh the pin holds still
  // for), the same shape as threshold.js's progressNow(). ----
  var wrapperDocTop = 0;
  var scrollableH = 1;
  function measure() {
    var rect = section.getBoundingClientRect();
    wrapperDocTop = rect.top + window.scrollY;
    scrollableH = Math.max(1, section.offsetHeight - window.innerHeight);
  }
  function progressNow() {
    var raw = (window.scrollY - wrapperDocTop) / scrollableH;
    return clamp01(raw);
  }

  var rafId = null;
  var scrollTicking = false;
  function frame() {
    rafId = null;
    applyVars(computeVars(progressNow()));
  }
  function scheduleFrame() {
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      scrollTicking = false;
      scheduleFrame();
    });
  }
  function onResize() {
    measure();
    scheduleFrame();
  }

  var listening = false;
  function startListening() {
    if (listening) return;
    listening = true;
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    scheduleFrame();
  }
  function stopListening() {
    if (!listening) return;
    listening = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // .tanleo-sequenced governs LAYOUT (the tall track, the sticky pin,
  // the absolute placement) and is therefore decided purely by gateOK()
  // -- applied immediately on load and kept in sync with the two
  // matchMedia listeners below. It must NOT depend on viewport
  // proximity: toggling it only once the section nears the viewport
  // would change the section's height (and therefore the whole page's
  // scroll geometry) mid-scroll. nearViewport instead gates only
  // whether the scroll/resize listeners are attached -- a perf
  // optimisation (mirroring threshold.js's own use of
  // IntersectionObserver), never a layout decision.
  var nearViewport = false;
  function syncClass() {
    if (gateOK()) {
      section.classList.add('tanleo-sequenced');
    } else {
      section.classList.remove('tanleo-sequenced');
      clearVars();
    }
  }
  function syncListening() {
    if (gateOK() && nearViewport) {
      startListening();
    } else {
      stopListening();
    }
  }
  function syncAll() {
    syncClass();
    syncListening();
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      nearViewport = entries[i].isIntersecting;
    }
    syncListening();
  }, { rootMargin: '50% 0px 50% 0px' });
  io.observe(section);

  var mqlWidth = window.matchMedia('(min-width: 901px)');
  var mqlMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function onGateChange() { syncAll(); }
  if (mqlWidth.addEventListener) mqlWidth.addEventListener('change', onGateChange);
  if (mqlMotion.addEventListener) mqlMotion.addEventListener('change', onGateChange);

  syncClass();
})();
