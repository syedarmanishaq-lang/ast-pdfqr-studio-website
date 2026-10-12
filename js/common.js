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

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
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
