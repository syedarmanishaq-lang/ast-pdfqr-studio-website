/* AST PDF & QR Studio — service worker (offline-first). v1 */
var CACHE = 'ast-pdfqr-v1';
var SHELL = [
  './',
  './index.html',
  './privacy-policy.html',
  './css/style.css',
  './js/common.js',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
var TOOL_PAGES = [
  'tools/qr-generator.html',
  'tools/qr-scanner.html',
  'tools/pdf-to-qr.html',
  'tools/pdf-split.html',
  'tools/text-to-speech.html',
  'tools/images-to-pdf.html',
  'tools/pdf-to-text.html',
  'tools/text-to-pdf.html',
  'tools/pdf-to-images.html',
  'tools/image-compressor.html',
  'tools/pdf-analyzer.html',
  'tools/word-counter.html',
  'tools/base64.html',
  'tools/password-generator.html',
  'tools/image-format-converter.html',
  'tools/unit-converter.html',
  'tools/barcode-generator.html',
  'tools/pdf-merger.html',
  'tools/text-case-converter.html',
  'tools/pdf-watermark.html',
  'tools/pdf-rotate.html',
  'tools/qr-logo.html',
  'tools/pdf-compressor.html',
  'tools/image-resizer.html',
  'tools/qr-batch-generator.html',
  'tools/color-contrast-checker.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL.concat(TOOL_PAGES).map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return self.skipWaiting(); }).catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Offline-first: serve from cache, refresh in background. Navigation falls back to index. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* leave CDN/fonts alone */
  e.respondWith(
    caches.match(req, { ignoreSearch: false }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit || caches.match('./index.html'); });
      return hit || net;
    })
  );
});
