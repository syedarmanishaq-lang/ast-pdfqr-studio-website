/* AST PDF & QR Studio — shared behavior
   Theme, tilt-on-hover, reveal-on-scroll, hero parallax, utilities. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  function getTheme() {
    try { return localStorage.getItem('ast-theme') || 'dark'; }
    catch (e) { return 'dark'; }
  }
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('ast-theme', t); } catch (e) {}
  }

  /* ---------- tiny helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function formatBytes(n) {
    if (!isFinite(n) || n < 0) return '0 B';
    if (n === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    var v = n / Math.pow(1024, i);
    return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 800);
  }

  function downloadText(text, filename, mime) {
    download(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename);
  }

  function toast(msg) {
    var wrap = $('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(function () { t.remove(); }, 320);
    }, 2200);
  }

  function copyText(text, doneMsg) {
    function done() { toast(doneMsg || 'Copied to clipboard'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Copy failed — select the text manually'); }
      document.body.removeChild(ta);
    }
  }

  function showError(box, msg) {
    if (typeof box === 'string') box = $(box);
    if (!box) return;
    box.innerHTML = '';
    var d = document.createElement('div');
    d.className = 'alert alert-error';
    d.textContent = msg;
    box.appendChild(d);
  }

  function clearBox(box) {
    if (typeof box === 'string') box = $(box);
    if (box) box.innerHTML = '';
  }

  /* file -> dataURL / arrayBuffer helpers */
  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error('Could not read file')); };
      r.readAsDataURL(file);
    });
  }
  function readAsArrayBuffer(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error('Could not read file')); };
      r.readAsArrayBuffer(file);
    });
  }
  function loadImage(src) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('Could not load image — unsupported format?')); };
      img.src = src;
    });
  }

  /* ---------- tilt on hover (subtle, tasteful) ---------- */
  function initTilt() {
    if (reduceMotion) return;
    $all('[data-tilt]').forEach(function (card) {
      var raf = null;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.style.transform =
            'perspective(800px) rotateX(' + (-py * 6).toFixed(2) + 'deg)' +
            ' rotateY(' + (px * 6).toFixed(2) + 'deg) translateY(-3px)';
        });
      });
      card.addEventListener('mouseleave', function () {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = $all('.reveal');
    if (!els.length) return;
    /* stagger tool cards for a human, editorial rhythm */
    $all('.tool-grid .tool-card').forEach(function (card, i) {
      card.style.transitionDelay = Math.min(i * 45, 540) + 'ms';
      var idx = document.createElement('span');
      idx.className = 't-index';
      idx.textContent = ('0' + (i + 1)).slice(-2);
      idx.setAttribute('aria-hidden', 'true');
      card.insertBefore(idx, card.firstChild);
    });
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- hero 3D parallax (index) ---------- */
  function initHero() {
    var stage = $('#stage');
    if (!stage || reduceMotion) return;
    var inner = stage.querySelector('.stage-inner');
    if (!inner) return;
    var raf = null;
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        inner.style.transform =
          'rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg)';
      });
    });
    stage.addEventListener('mouseleave', function () {
      if (raf) cancelAnimationFrame(raf);
      inner.style.transform = '';
    });
  }

  /* ---------- PWA: service worker ---------- */
  function initSW() {
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        var base = location.pathname.indexOf('/tools/') !== -1 ? '../sw.js' : 'sw.js';
        navigator.serviceWorker.register(base).catch(function () { /* offline optional */ });
      });
    }
  }

  /* ---------- PWA: install modal ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallModal(false);
  });
  window.addEventListener('appinstalled', function () { hideInstallModal(); });

  function installDismissedRecently() {
    try {
      var t = parseInt(localStorage.getItem('astpdfqr_install_dismissed') || '0', 10);
      return (Date.now() - t) < 7 * 24 * 3600 * 1000; /* re-offer after 7 days */
    } catch (e) { return false; }
  }
  function markInstallDismissed() {
    try { localStorage.setItem('astpdfqr_install_dismissed', String(Date.now())); } catch (e) {}
  }
  function showInstallModal(manual) {
    if (document.querySelector('.install-modal')) return;
    if (!manual && installDismissedRecently()) return;
    if (document.body.classList.contains('reader-page')) return;
    var m = document.createElement('div');
    m.className = 'install-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-label', 'Install AST PDF & QR Studio');
    var canPrompt = !!deferredPrompt;
    m.innerHTML =
      '<div class="im-backdrop"></div>' +
      '<div class="im-card">' +
        '<button class="im-close" aria-label="Close">&times;</button>' +
        '<div class="im-icon"><img src="' + (location.pathname.indexOf('/tools/') !== -1 ? '../icon-192.png' : 'icon-192.png') + '" alt="AST PDF & QR Studio"></div>' +
        '<h3>Get the app</h3>' +
        '<div class="im-sub">Install AST PDF &amp; QR Studio for instant, offline access to all tools.</div>' +
        '<ul class="im-bullets">' +
          '<li><span class="im-tick">✓</span>All 26 tools work offline after install</li>' +
          '<li><span class="im-tick">✓</span>One tap from your home screen</li>' +
          '<li><span class="im-tick">✓</span>Your files never leave your device</li>' +
        '</ul>' +
        (canPrompt
          ? '<button class="btn btn-primary im-install">Install app</button>'
          : '<div class="im-manual"><div class="im-manual-title">Install manually — takes 10 seconds:</div>' +
            '<ol class="im-steps">' +
              '<li><b>Android (Chrome):</b> tap the <b>⋮</b> menu → <b>Install app</b> or <b>Add to Home screen</b>.</li>' +
              '<li><b>iPhone (Safari):</b> tap <b>Share</b> → <b>Add to Home Screen</b>.</li>' +
              '<li><b>Desktop (Chrome/Edge):</b> click the install icon in the address bar.</li>' +
            '</ol></div>') +
        '<button class="im-later">Maybe later</button>' +
      '</div>';
    document.body.appendChild(m);
    requestAnimationFrame(function () { requestAnimationFrame(function () { m.classList.add('show'); }); });
    function close(mark) { if (mark) markInstallDismissed(); hideInstallModal(); }
    m.querySelector('.im-close').addEventListener('click', function () { close(true); });
    m.querySelector('.im-backdrop').addEventListener('click', function () { close(true); });
    m.querySelector('.im-later').addEventListener('click', function () { close(true); });
    var go = m.querySelector('.im-install');
    if (go) go.addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; hideInstallModal(); });
      }
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(true); document.removeEventListener('keydown', esc); }
    });
  }
  function hideInstallModal() {
    var m = document.querySelector('.install-modal');
    if (m) { m.classList.remove('show'); setTimeout(function () { m.remove(); }, 300); }
  }
  function initInstallLink() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('#installAppLink');
      if (!a) return;
      e.preventDefault();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; hideInstallModal(); });
      } else {
        showInstallModal(true);
      }
    });
    /* hide the footer link when already installed */
    try {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        $all('#installAppLink').forEach(function (a) { a.style.display = 'none'; });
      }
    } catch (e) {}
  }

  /* ---------- platform: recent tools ---------- */
  var RECENT_KEY = 'astpdfqr_recent', FAV_KEY = 'astpdfqr_favs';
  function storeGet(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function storeSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function toolSlug() {
    var m = /\/tools\/([a-z0-9-]+)\.html/.exec(location.pathname);
    return m ? m[1] : null;
  }
  function trackRecent() {
    var slug = toolSlug();
    if (!slug) return;
    var rec = storeGet(RECENT_KEY, []).filter(function (s) { return s !== slug; });
    rec.unshift(slug);
    storeSet(RECENT_KEY, rec.slice(0, 6));
  }

  /* ---------- platform: favorites ---------- */
  function getFavs() { return storeGet(FAV_KEY, []); }
  function isFav(slug) { return getFavs().indexOf(slug) !== -1; }
  function toggleFav(slug) {
    var favs = getFavs();
    var i = favs.indexOf(slug);
    if (i === -1) { favs.push(slug); toast('Added to favorites'); }
    else { favs.splice(i, 1); toast('Removed from favorites'); }
    storeSet(FAV_KEY, favs);
    return i === -1;
  }
  function initFavStars() {
    $all('.tool-card').forEach(function (card) {
      var href = card.getAttribute('href') || '';
      var m = /tools\/([a-z0-9-]+)\.html/.exec(href);
      if (!m) return;
      var slug = m[1];
      if (card.querySelector('.fav-star')) return;
      var b = document.createElement('button');
      b.className = 'fav-star' + (isFav(slug) ? ' on' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Favorite this tool');
      b.textContent = isFav(slug) ? '★' : '☆';
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var on = toggleFav(slug);
        b.classList.toggle('on', on);
        b.textContent = on ? '★' : '☆';
        renderQuickStrips();
      });
      card.appendChild(b);
    });
  }

  /* ---------- platform: homepage quick strips + category filter ---------- */
  var TOOL_NAMES = {
    'qr-generator': 'QR Generator', 'qr-scanner': 'QR Scanner', 'pdf-to-qr': 'PDF → QR Code',
    'pdf-split': 'PDF Split', 'text-to-speech': 'Text to Speech', 'images-to-pdf': 'Images → PDF',
    'pdf-to-text': 'PDF → Text', 'text-to-pdf': 'Text → PDF', 'pdf-to-images': 'PDF → Images',
    'image-compressor': 'Image Compressor', 'pdf-analyzer': 'PDF Analyzer', 'word-counter': 'Word Counter',
    'base64': 'Base64', 'password-generator': 'Password Generator', 'image-format-converter': 'Image Format Converter',
    'unit-converter': 'Unit Converter', 'barcode-generator': 'Barcode Generator', 'pdf-merger': 'PDF Merger',
    'text-case-converter': 'Text Case Converter', 'pdf-watermark': 'PDF Watermark', 'pdf-rotate': 'PDF Rotate',
    'qr-logo': 'QR Code with Logo', 'pdf-compressor': 'PDF Compressor', 'image-resizer': 'Image Resizer',
    'qr-batch-generator': 'QR Batch Generator', 'color-contrast-checker': 'Contrast Checker'
  };
  function chipLink(slug, star) {
    return '<a class="quick-chip" href="tools/' + slug + '.html">' +
      (star ? '<span class="q-star">★</span>' : '') +
      (TOOL_NAMES[slug] || slug) + '</a>';
  }
  function renderQuickStrips() {
    var host = $('#quick-strips');
    if (!host) return;
    var rec = storeGet(RECENT_KEY, []).filter(function (s) { return TOOL_NAMES[s]; }).slice(0, 6);
    var favs = getFavs().filter(function (s) { return TOOL_NAMES[s]; });
    var html = '';
    if (favs.length) {
      html += '<div class="quick-label">Your favorites</div><div class="quick-strip">' +
        favs.map(function (s) { return chipLink(s, true); }).join('') + '</div>';
    }
    if (rec.length) {
      html += '<div class="quick-label">Recently used</div><div class="quick-strip">' +
        rec.map(function (s) { return chipLink(s, false); }).join('') + '</div>';
    } else if (!favs.length) {
      html += '<p class="quick-empty">Use any tool and it will appear here for quick access — plus star your favorites.</p>';
    }
    host.innerHTML = html;
  }
  function initCatFilter() {
    var bar = $('#cat-filter');
    var grid = document.querySelector('.tool-grid');
    if (!bar || !grid) return;
    var cards = $all('.tool-card', grid);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.cat-chip');
      if (!b) return;
      $all('.cat-chip', bar).forEach(function (c) { c.classList.remove('on'); });
      b.classList.add('on');
      var cat = b.getAttribute('data-cat');
      cards.forEach(function (card) {
        var show = cat === 'all' || (card.getAttribute('data-cat') || '').split(' ').indexOf(cat) !== -1;
        card.classList.toggle('cat-hide', !show);
      });
    });
  }

  /* ---------- page transition: subtle fade between tool pages ---------- */
  function initPageTransition() {
    if (reduceMotion) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href$=".html"]');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      /* let favorite stars and install links behave normally */
      if (a.classList.contains('fav-star') || a.id === 'installAppLink') return;
      e.preventDefault();
      var page = document.querySelector('.page-enter');
      if (page) page.classList.add('page-leave');
      setTimeout(function () { location.href = a.href; }, 200);
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    /* keyboard access for dropzone choose-file buttons */
    $all('.dz-btn').forEach(function (b) {
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var dz = b.closest('.dropzone');
          if (dz) dz.click();
        }
      });
    });
    $all('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    });
    var yr = $('#year');
    if (yr) yr.textContent = new Date().getFullYear();
    initTilt();
    initReveal();
    initHero();
    initSW();
    initInstallLink();
    trackRecent();
    initFavStars();
    renderQuickStrips();
    initCatFilter();
    initPageTransition();
  });

  /* ---------- public API ---------- */
  window.AST = window.AST || {};
  Object.assign(window.AST, {
    $, $all: $all, formatBytes: formatBytes,
    download: download, downloadText: downloadText,
    toast: toast, copyText: copyText,
    showError: showError, clearBox: clearBox,
    readAsDataURL: readAsDataURL, readAsArrayBuffer: readAsArrayBuffer,
    loadImage: loadImage, getTheme: getTheme, setTheme: setTheme
  });
})();
