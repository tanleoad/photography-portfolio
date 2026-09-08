/* ============================================================
   The Photographic Threshold
   Added 2026-09-07. An isolated WebGL module — no dependency on,
   or coupling to, script.js, transitions.js, or retouching.html.
   Sits between the Closing section and the Projects Index, driven
   entirely by normal document scroll (no wheel-hijacking).

   Concept, locked: a single photograph (the same image used for the
   real Street threshold immediately below) exists on one flat
   physical plate — a photographic surface with genuine thin bevel
   thickness, no curvature, no rotation. As the visitor scrolls, the
   camera alone travels through real 3D space toward the plate, with
   a very subtle lateral/vertical drift alongside the main approach
   so perspective genuinely changes. The photograph is visible from
   the very first frame — distant, dark, subdued, but recognisably a
   photograph, never a blank canvas or a silhouette — and resolves to
   full clarity and colour as the camera arrives. At the end of the
   approach the plate is sized and positioned to land exactly where
   the real Street photograph already sits in the page, measured at
   runtime from the live DOM (not an invented rectangle), so the
   canvas can fade out into the real Street threshold underneath with
   no visible jump in size, position, or brightness.

   Technical reference only: the flat-plate-with-bevel geometry and
   the idea of distance-based fog/proximity are used the way Beauty
   Archive (retouching.html) already proves them out. Nothing here
   imports, modifies, or depends on that file's code in any way, and
   retouching.html is never touched.

   Gated the same way the Projects proximity system already is
   (js/script.js): desktop widths only, and never when the visitor
   has asked for reduced motion. Below that gate this module does
   nothing at all -- no context, no listeners, no work -- and the
   section's CSS collapses to zero height, so Closing hands off
   straight to Street exactly as it did before this file existed.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('threshold');
  var canvas = document.getElementById('thresholdCanvas');
  var streetAnchor = document.getElementById('street');
  if (!section || !canvas || !streetAnchor) return;

  // The exact natural pixel size of the photograph used on this
  // plate (images/corniche-beach-skyline.jpg) -- the same file the
  // real Street threshold displays uncropped at its natural aspect
  // (see css/style.css, .project-photo{ width:100%; height:auto }).
  // Used to derive the plate's own aspect ratio and, critically, to
  // compute the real Street photograph's rendered height from CSS
  // alone (see measureStreetTarget) without waiting on that image to
  // finish loading.
  var IMAGE_NATURAL_W = 1600;
  var IMAGE_NATURAL_H = 2400;
  var IMAGE_ASPECT = IMAGE_NATURAL_W / IMAGE_NATURAL_H; // 0.6667

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isDesktopWidth() {
    return window.matchMedia('(min-width: 901px)').matches;
  }
  function gateOK() {
    return isDesktopWidth() && !prefersReducedMotion();
  }

  // ---- Cheap, immediate capability probe (coherence pass, 2026-09-08) ----
  // setupGL() below is deliberately lazy -- it only runs once the section
  // nears the viewport (see the IntersectionObserver further down), so a
  // visit never pays for context/shader/texture setup it might not need.
  // But that laziness meant a visitor WITHOUT WebGL didn't find out until
  // they had already scrolled to within one viewport of the section: the
  // observer fired, setupGL() failed, teardownToFallback() ran, and the
  // section collapsed to display:none while the visitor was mid-scroll --
  // yanking the page up by the section's full reserved 220vh the instant
  // they approached it, rather than a clean handoff. Verified live during
  // the 2026-09-08 coherence pass: this is exactly the "text section ->
  // blank gap -> portfolio section" jump this section is supposed to
  // avoid, not the WebGL rendering itself, in every browser this has been
  // tested in this whole engagement.
  // A plain capability check costs nothing -- no shaders, no textures,
  // just asking for a context, immediately discarded -- so it can safely
  // run at parse time instead of waiting on scroll. WebGL-capable visitors
  // are completely unaffected: this probe context is thrown away and
  // setupGL() below still creates the real one lazily, exactly as before.
  // Only probes when the section would otherwise be visible at all
  // (gateOK()) -- mobile/reduced-motion visitors already get display:none
  // from CSS and never need this to run.
  var thresholdWebglUnavailable = false;
  if (gateOK()) {
    var probeCanvas = document.createElement('canvas');
    var probeGl = probeCanvas.getContext('webgl') || probeCanvas.getContext('experimental-webgl');
    if (!probeGl) {
      thresholdWebglUnavailable = true;
      section.style.display = 'none';
    }
  }

  // ---- lazily-created state; nothing below is touched until gateOK()
  // and the section is actually near the viewport ----
  var gl = null;
  var prog = null;
  var aPos, aUV, uProj, uView, uModel, uReveal, uShade, uBg;
  var vbo = null;          // single interleaved-less buffer: pos + uv, front then bevel
  var FRONT_COUNT = 6;     // 2 triangles
  var BEVEL_COUNT = 24;    // 4 edges x 2 triangles
  var texture = null;
  var textureReady = false;
  var initialized = false;
  var rafId = null;
  var io = null;
  var mqlWidth = null, mqlMotion = null;

  var VW = 0, VH = 0;

  // Plate world size, derived from the real photograph's aspect
  // ratio so it is never distorted or cropped (locked requirement).
  var PLATE_H = 2.4;
  var PLATE_W = PLATE_H * IMAGE_ASPECT;
  var THICK = 0.05; // genuine, if thin, physical edge thickness

  var FOV_Y = 45 * Math.PI / 180;
  var NEAR = 0.1, FAR = 100;

  // Background colour, taken directly from --bg (#0a0908) in
  // css/style.css so the canvas clears to exactly the page's own
  // background -- no visible box edge, no colour mismatch.
  var BG = [0.0392, 0.0353, 0.0314];

  // ---- camera state: computed once (and on resize) from the real
  // Street photograph's position, per the locked handoff requirement
  // ("use the actual existing Street threshold geometry/dimensions
  // as the reference... rather than inventing an unrelated
  // rectangle"). Only translation ever changes -- the camera never
  // rotates, and the plate never moves or rotates; the sense of
  // approach and of a slight perspective shift comes entirely from
  // where the camera is. ----
  var camEnd = { x: 0, y: 0, z: 4.5 };   // solved from the DOM at runtime
  var camStart = { x: 0, y: 0, z: 20 };  // derived from camEnd on measure

  var wrapperDocTop = 0, scrollableH = 1;

  function smoothstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  // ---- matrix helpers (column-major, vertex' = M * vertex). Written
  // fresh for this module -- ordinary perspective/translate math, not
  // copied from anywhere. ----
  function matMul(a, b) {
    var out = new Array(16);
    for (var col = 0; col < 4; col++) {
      for (var row = 0; row < 4; row++) {
        var sum = 0;
        for (var k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = sum;
      }
    }
    return out;
  }
  function translate(tx, ty, tz) {
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, tx,ty,tz,1];
  }
  function perspective(fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2);
    var nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ];
  }

  // ---- geometry: one flat quad facing +Z, plus a thin true-depth
  // bevel on all four edges -- the same restrained "plate" shape
  // Beauty Archive already proves works, rebuilt independently here.
  // Front and bevel are packed into a single buffer for one draw
  // call each rather than one per edge. ----
  function buildPlateGeometry(w, h) {
    var hw = w / 2, hh = h / 2;
    var pos = [];
    var uv = [];
    function pushTri(p0, p1, p2, uv0, uv1, uv2) {
      pos.push(p0[0],p0[1],p0[2], p1[0],p1[1],p1[2], p2[0],p2[1],p2[2]);
      uv.push(uv0[0],uv0[1], uv1[0],uv1[1], uv2[0],uv2[1]);
    }
    // front face (2 tris) -- image right-side-up, uncropped
    var tl=[-hw,hh,0], tr=[hw,hh,0], bl=[-hw,-hh,0], br=[hw,-hh,0];
    pushTri(bl,br,tl, [0,1],[1,1],[0,0]);
    pushTri(tl,br,tr, [0,0],[1,1],[1,0]);
    // bevel: four edges, each a thin quad running back to -THICK.
    // UVs reuse the nearest front-face corners -- a sliver of edge
    // colour, exactly the approach Beauty Archive's own bevel uses,
    // not a separate texture.
    var tlB=[-hw,hh,-THICK], trB=[hw,hh,-THICK], blB=[-hw,-hh,-THICK], brB=[hw,-hh,-THICK];
    function edge(p0,p1,p2,p3,u0,u1,u2,u3) {
      pushTri(p0,p1,p2, u0,u1,u2);
      pushTri(p2,p1,p3, u2,u1,u3);
    }
    edge(tl,tr,tlB,trB, [0,0],[1,0],[0,0],[1,0]); // top
    edge(bl,br,blB,brB, [0,1],[1,1],[0,1],[1,1]); // bottom
    edge(tl,bl,tlB,blB, [0,0],[0,1],[0,0],[0,1]); // left
    edge(tr,br,trB,brB, [1,0],[1,1],[1,0],[1,1]); // right
    return { pos: pos, uv: uv };
  }

  var VS_SRC = [
    'attribute vec3 aPos;',
    'attribute vec2 aUV;',
    'varying vec2 vUV;',
    'uniform mat4 uProj;',
    'uniform mat4 uView;',
    'uniform mat4 uModel;',
    'void main(){',
    '  vUV = aUV;',
    '  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  // uReveal: 0 = distant/dark/subdued (still a real, recognisable
  // photograph -- never blank, never a silhouette), 1 = fully
  // resolved, full colour, matching the plain <img> it hands off to.
  // uShade: front face at full strength, bevel edges slightly
  // darker so the thickness reads as a real physical edge rather
  // than a flat outline.
  var FS_SRC = [
    'precision mediump float;',
    'varying vec2 vUV;',
    'uniform sampler2D uTex;',
    'uniform float uReveal;',
    'uniform float uShade;',
    'uniform vec3 uBg;',
    'void main(){',
    '  vec4 c = texture2D(uTex, vUV);',
    '  float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));',
    '  vec3 muted = mix(c.rgb, vec3(gray), 0.72);',
    '  vec3 distant = mix(muted * 0.4, uBg, 0.28);',
    '  vec3 resolved = c.rgb;',
    '  vec3 col = mix(distant, resolved, uReveal) * uShade;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log);
    }
    return s;
  }

  function loadTexture(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resolve(tex);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  // ---- measure the real Street photograph's rendered rectangle
  // from CSS alone, deliberately not from the <img> element's own
  // box: that image is loading="lazy" and, with no explicit
  // width/height attribute, its box collapses to zero height until
  // it actually loads (the same lazy-load measurement pitfall found
  // during Phase 5 verification). The mat's width comes from a fixed
  // CSS clamp() independent of image load state, and this photo's
  // natural aspect ratio is already known (IMAGE_ASPECT), so the
  // target rect is derived without waiting on anything to load. ----
  function measureStreetTarget() {
    var matEl = streetAnchor.querySelector('.project-photo-mat');
    var frameEl = streetAnchor.querySelector('.project-photo-frame');
    if (!matEl || !frameEl) return null;
    var matRect = matEl.getBoundingClientRect();
    if (matRect.width <= 0) return null;
    var frameStyle = getComputedStyle(frameEl);
    var padLeft = parseFloat(frameStyle.paddingLeft) || 0;
    var padTop = parseFloat(frameStyle.paddingTop) || 0;
    var imgWidth = Math.max(1, matRect.width - padLeft * 2);
    var imgHeight = imgWidth / IMAGE_ASPECT;
    return {
      left: matRect.left + padLeft,
      docTop: matRect.top + window.scrollY + padTop,
      width: imgWidth,
      height: imgHeight
    };
  }

  // ---- solve the camera position that makes the plate project to
  // exactly the given viewport-space rectangle, at the given
  // viewport size. Because the plate is built at the photograph's
  // own aspect ratio and the target rect is the same photograph
  // rendered elsewhere, their aspect ratios already agree, so a
  // single distance solves both width and height at once. ----
  function solveCameraForRect(rectLeft, rectTop, rectW, rectH, vw, vh) {
    var pxPerWorldUnit = vh / (2 * Math.tan(FOV_Y / 2)); // at distance = 1
    var dist = (PLATE_H * pxPerWorldUnit) / rectH;
    var targetCenterX = rectLeft + rectW / 2;
    var targetCenterY = rectTop + rectH / 2;
    var offsetXpx = targetCenterX - vw / 2;
    var offsetYpx = targetCenterY - vh / 2;
    var scaleAtDist = pxPerWorldUnit / dist;
    var camX = -(offsetXpx / scaleAtDist);
    var camY = (offsetYpx / scaleAtDist);
    return { x: camX, y: camY, z: dist };
  }

  function recomputeCameraTargets() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    updateScrollGeometry(); // must be current before currentEndScrollY() below
    var target = measureStreetTarget();
    if (target) {
      camEnd = solveCameraForRect(target.left, target.docTop - currentEndScrollY(), target.width, target.height, VW, VH);
    }
    // A substantial approach, per the locked requirement that the
    // camera travel enough for depth to genuinely register -- plus a
    // small, deliberately different lateral/vertical offset so there
    // is continuous, very subtle drift across the whole approach
    // rather than a purely straight-line dolly.
    camStart = {
      x: camEnd.x + 0.38,
      y: camEnd.y + 0.16,
      z: camEnd.z + 15
    };
  }

  function currentEndScrollY() {
    return wrapperDocTop + scrollableH;
  }

  function updateScrollGeometry() {
    var rect = section.getBoundingClientRect();
    wrapperDocTop = rect.top + window.scrollY;
    scrollableH = Math.max(1, section.offsetHeight - window.innerHeight);
  }

  function progressNow() {
    updateScrollGeometry();
    var raw = (window.scrollY - wrapperDocTop) / scrollableH;
    return Math.max(0, Math.min(1, raw));
  }

  // ---- GL setup, run once, the first time the section actually
  // comes near the viewport (see the IntersectionObserver below) ----
  function setupGL() {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false }) ||
         canvas.getContext('experimental-webgl');
    if (!gl) {
      // No WebGL available in this browser/session. This section is
      // purely atmospheric, not unique content, so fail silently and
      // let Closing hand off straight to Street exactly as it does
      // on mobile/reduced-motion -- never show an error or an empty
      // black box on the homepage.
      teardownToFallback();
      return false;
    }
    var vs = compile(gl.VERTEX_SHADER, VS_SRC);
    var fs = compile(gl.FRAGMENT_SHADER, FS_SRC);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      teardownToFallback();
      return false;
    }
    gl.useProgram(prog);
    aPos = gl.getAttribLocation(prog, 'aPos');
    aUV = gl.getAttribLocation(prog, 'aUV');
    uProj = gl.getUniformLocation(prog, 'uProj');
    uView = gl.getUniformLocation(prog, 'uView');
    uModel = gl.getUniformLocation(prog, 'uModel');
    uReveal = gl.getUniformLocation(prog, 'uReveal');
    uShade = gl.getUniformLocation(prog, 'uShade');
    uBg = gl.getUniformLocation(prog, 'uBg');

    var geo = buildPlateGeometry(PLATE_W, PLATE_H);
    var posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.pos), gl.STATIC_DRAW);
    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.uv), gl.STATIC_DRAW);
    vbo = { posBuf: posBuf, uvBuf: uvBuf };

    gl.clearColor(BG[0], BG[1], BG[2], 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    loadTexture('images/corniche-beach-skyline.jpg').then(function (tex) {
      texture = tex;
      textureReady = true;
    }).catch(function () {
      teardownToFallback();
    });

    resizeCanvas();
    recomputeCameraTargets();
    return true;
  }

  function resizeCanvas() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(easedT) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var cx = camStart.x + (camEnd.x - camStart.x) * easedT;
    var cy = camStart.y + (camEnd.y - camStart.y) * easedT;
    var cz = camStart.z + (camEnd.z - camStart.z) * easedT;

    var proj = perspective(FOV_Y, vw / vh, NEAR, FAR);
    var view = translate(-cx, -cy, -cz);
    var model = translate(0, 0, 0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Nothing to draw until the photograph itself has loaded -- an
    // untextured plate would briefly render as a flat black rectangle,
    // which is exactly the "effect noticed before the photograph"
    // failure this build is trying to avoid. A same-origin local image
    // loads in well under a frame or two in practice, and the section
    // only starts doing any work once the visitor is already scrolling
    // toward it, so this just clears to the page's own background
    // until the texture is ready.
    if (!textureReady) return;

    gl.useProgram(prog);
    gl.uniformMatrix4fv(uProj, false, proj);
    gl.uniformMatrix4fv(uView, false, view);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniform1f(uReveal, easedT);
    gl.uniform3f(uBg, BG[0], BG[1], BG[2]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.posBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.uvBuf);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.uniform1f(uShade, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, FRONT_COUNT);
    gl.uniform1f(uShade, 0.6);
    gl.drawArrays(gl.TRIANGLES, FRONT_COUNT, BEVEL_COUNT);
  }

  // ---- the one continuous driver: raw scroll progress -> eased
  // camera interpolation + reveal + the final hand-off fade. No
  // separate effects pegged to arbitrary scroll milestones -- every
  // visual quantity here is a function of this single value. ----
  function frame() {
    rafId = null;
    if (!gateOK() || !gl) return;

    var raw = progressNow();
    var eased = smoothstep(raw);
    render(eased);

    // Fade the canvas out over the final stretch of the approach so
    // it is already fully transparent by the moment the pin
    // releases -- the real Street threshold underneath is what the
    // visitor actually sees complete the arrival, not a hard cut.
    var fadeT = smoothstep(Math.max(0, Math.min(1, (raw - 0.85) / 0.15)));
    canvas.style.opacity = String(1 - fadeT);

    lastRawProgress = raw;
    scheduleFrame();
  }

  function scheduleFrame() {
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }

  var scrollTicking = false;
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(function () { scrollTicking = false; scheduleFrame(); });
    }
  }
  function onResize() {
    resizeCanvas();
    recomputeCameraTargets();
    scheduleFrame();
  }

  function init() {
    if (initialized) return;
    if (!setupGL()) return;
    initialized = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    scheduleFrame();
  }

  // Lightweight pause: stop driving frames and drop the scroll
  // listener, but keep the compiled program/texture/buffers cached
  // so crossing back to a desktop width doesn't recompile or
  // reload anything. Used both when scrolled well away from the
  // section and when the responsive/reduced-motion gate closes.
  function pause() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
  }

  function resume() {
    if (!initialized || !gateOK()) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    scheduleFrame();
  }

  // Used only if WebGL genuinely isn't available in this browser, or
  // the shader program fails to build (context/program creation
  // failed, or the photograph itself fails to load). Collapses the
  // section exactly the way the CSS already does for mobile and
  // prefers-reduced-motion, so a visitor in this state gets the same
  // "Closing hands off straight to Street" experience rather than a
  // dead, unchanging dark rectangle sitting in the scroll for no
  // reason.
  function teardownToFallback() {
    pause();
    initialized = false;
    gl = null;
    section.style.display = 'none';
  }

  // ---- lazy activation: only do any of the above once the visitor
  // has actually scrolled near the section, and only ever tear the
  // live listeners down/up again across the same desktop+motion-ok
  // gate the Projects proximity system already uses. ----
  io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        if (!gateOK()) continue;
        if (initialized) resume(); else init();
      } else if (initialized) {
        pause();
      }
    }
  }, { rootMargin: '100% 0px 100% 0px' });

  // Skip observing entirely if the probe above already collapsed the
  // section -- there's nothing left for a scroll-proximity trigger to do.
  if (gateOK() && !thresholdWebglUnavailable) io.observe(section);

  function sectionNearViewport() {
    var r = section.getBoundingClientRect();
    var margin = window.innerHeight;
    return r.bottom > -margin && r.top < window.innerHeight + margin;
  }

  mqlWidth = window.matchMedia('(min-width: 901px)');
  mqlMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function onGateChange() {
    if (gateOK()) {
      io.observe(section); // no-op if already observed
      // Cover the edge case of crossing into the gate (e.g. resizing
      // from a mobile to a desktop width) while already scrolled to
      // where the section sits -- IntersectionObserver won't
      // necessarily re-fire just because the gate changed.
      if (sectionNearViewport()) { if (initialized) resume(); else init(); }
    } else {
      pause();
    }
  }
  if (mqlWidth.addEventListener) mqlWidth.addEventListener('change', onGateChange);
  if (mqlMotion.addEventListener) mqlMotion.addEventListener('change', onGateChange);
})();
