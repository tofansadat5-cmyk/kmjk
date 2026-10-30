/* دفتر حساب سلطان — آفلاین‌سازی برنامه (PWA) */
const CACHE_NAME = 'khatasultan-offline-v1';
const CORE_FILES = ['./', './index.html', './sultan-ledger.html'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const path of CORE_FILES) {
      try { await cache.add(new Request(new URL(path, self.registration.scope), {cache:'reload'})); }
      catch (_) { /* ممکن است یکی از نام‌های فایل روی هاست موجود نباشد */ }
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('khatasultan-offline-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // فایل‌های اصلی برنامه و صفحه‌ها: اول شبکه، در نبود اینترنت از نسخهٔ ذخیره‌شده استفاده کن.
  if (url.origin === self.location.origin && (req.mode === 'navigate' || /\.(html|css|js|png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(req);
        if (response && response.ok) cache.put(req, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        const saved = await cache.match(req) || await cache.match(new URL('./index.html', self.registration.scope).href) || await cache.match(new URL('./sultan-ledger.html', self.registration.scope).href) || await cache.match(new URL('./', self.registration.scope).href);
        return saved || new Response('برای نخستین بار برنامه را با اینترنت باز کنید تا ذخیره شود.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  // کتابخانه‌های Firebase در اولین استفاده ذخیره می‌شوند؛ ورود/همگام‌سازی ابری همچنان اینترنت می‌خواهد.
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(req);
      if (saved) return saved;
      try {
        const response = await fetch(req);
        if (response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone()).catch(() => {});
        return response;
      } catch (_) {
        return saved || new Response('', {status:503});
      }
    })());
  }
});
