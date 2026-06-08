/* ============================================================
   ApexWorks — Shared site behaviour
   Cursor · sticky nav · burger · scroll reveal · accordion ·
   form validation · reusable Three.js bootstrap (visibility-aware).
   Everything is guarded so each page only runs what it has.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- PRECISION CURSOR ---------- */
  (function () {
    var cur = document.getElementById('cur');
    var ring = document.getElementById('cur-r');
    if (!cur || !ring || !finePointer) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    }, { passive: true });
    (function tick() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(tick);
    })();
    document.querySelectorAll('a,button,.card,.member,.tier,.zz-i,.acc-q,.alt-card,input,select,textarea,.bc,.pr,.tc')
      .forEach(function (el) {
        el.addEventListener('mouseenter', function () { document.body.classList.add('hov'); });
        el.addEventListener('mouseleave', function () { document.body.classList.remove('hov'); });
      });
  })();

  /* ---------- STICKY NAV ---------- */
  (function () {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('stuck', scrollY > 60); };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ---------- BURGER / MOBILE MENU ---------- */
  (function () {
    var burger = document.getElementById('nav-burger');
    var menu = document.getElementById('mobile-menu');
    if (!burger || !menu) return;
    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('open');
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      menu.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open'); menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  })();

  /* ---------- SCROLL REVEAL ---------- */
  (function () {
    var els = document.querySelectorAll('.rv,.rv-l');
    if (!els.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('on'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          setTimeout(function () { e.target.classList.add('on'); }, i * 55);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { obs.observe(el); });
  })();

  /* ---------- ACCORDION (FAQ) ---------- */
  (function () {
    var items = document.querySelectorAll('.acc');
    if (!items.length) return;
    items.forEach(function (acc) {
      var btn = acc.querySelector('.acc-q');
      var panel = acc.querySelector('.acc-a');
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var open = acc.getAttribute('data-open') === 'true';
        // close siblings for a clean single-open accordion
        items.forEach(function (other) {
          if (other !== acc) {
            other.setAttribute('data-open', 'false');
            var ob = other.querySelector('.acc-q'); if (ob) ob.setAttribute('aria-expanded', 'false');
            var op = other.querySelector('.acc-a'); if (op) op.style.maxHeight = '';
          }
        });
        acc.setAttribute('data-open', String(!open));
        btn.setAttribute('aria-expanded', String(!open));
        panel.style.maxHeight = open ? '' : panel.scrollHeight + 'px';
      });
    });
  })();

  /* ---------- FORM VALIDATION + STATES ---------- */
  window.ApexForm = function (opts) {
    var form = document.getElementById(opts.formId);
    if (!form) return;
    var btn = document.getElementById(opts.btnId);
    var required = opts.required || [];
    var onSuccess = opts.onSuccess;
    var toast = document.getElementById('toast');
    var tt;

    function showErr(id, show) {
      var inp = document.getElementById(id);
      var err = document.getElementById(id + '-err');
      if (inp) inp.setAttribute('aria-invalid', show ? 'true' : 'false');
      if (err) err.classList.toggle('on', show);
    }
    function valF(id) {
      var inp = document.getElementById(id);
      if (!inp) return true;
      var ok = true;
      if (inp.required && !inp.value.trim()) ok = false;
      if (id === 'email' && inp.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)) ok = false;
      showErr(id, !ok);
      return ok;
    }
    required.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('blur', function () { valF(id); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = required.map(valF).every(Boolean);
      if (!ok) {
        var first = required.find(function (id) {
          var el = document.getElementById(id);
          return el && el.getAttribute('aria-invalid') === 'true';
        });
        if (first) document.getElementById(first).focus();
        return;
      }
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Sending'; }
      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = opts.btnLabel || 'Send'; }
        form.reset();
        required.forEach(function (id) { showErr(id, false); });
        if (typeof onSuccess === 'function') { onSuccess(); return; }
        if (toast) {
          toast.classList.add('show');
          clearTimeout(tt);
          tt = setTimeout(function () { toast.classList.remove('show'); }, 4500);
        }
      }, 900);
    });
  };

  /* ---------- REUSABLE THREE.JS BOOTSTRAP ----------
     Handles scene/camera/renderer/resize, pauses on tab-hidden
     (prevents stuck renders), and renders a single static frame
     under prefers-reduced-motion. `build(api)` returns onFrame(t). */
  window.ApexThree = function (canvasId, build) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !window.THREE) return;
    var host = canvas.parentElement || canvas;
    function size() {
      return { w: host.clientWidth || innerWidth, h: host.clientHeight || innerHeight };
    }
    var dim = size();
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(45, dim.w / dim.h, 0.1, 100);
    cam.position.set(0, 0, 8);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(dim.w, dim.h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var onFrame = build({ scene: scene, camera: cam, renderer: renderer, THREE: THREE }) || function () {};

    addEventListener('resize', function () {
      var d = size();
      cam.aspect = d.w / d.h; cam.updateProjectionMatrix();
      renderer.setSize(d.w, d.h);
    });

    var clock = new THREE.Clock();
    var rafId = null;

    function loop() {
      if (document.hidden) { rafId = null; return; }
      onFrame(clock.getElapsedTime());
      renderer.render(scene, cam);
      rafId = requestAnimationFrame(loop);
    }
    if (prefersReduced) {
      onFrame(0);
      renderer.render(scene, cam);   // one static frame, no loop
    } else {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && !rafId) loop();
      });
      loop();
    }
  };
})();
