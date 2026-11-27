/* Расписсание — GitHub Pages PWA. No third-party network requests are intercepted. */
const CACHE_NAME = 'raspissanie-15-themes-fonts-mobile-v24';
const CORE = [
  './', './index.html', './editor/', './editor/index.html',
  './editor/app.js', './editor/style.css', './assets/pwa.js', './assets/i18n.js', './assets/themes.css', './assets/themes.js',
  './manifest.webmanifest', './assets/raspissanie-mark.svg',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png', './assets/icons/apple-touch-icon.png',
  './data/teachers.json', './data/subjects.json', './data/i18n.json', './data/room-patterns.json', './data/weeks/manifest.json'
];
const BASE = new URL(self.registration.scope);
const scoped = rel => new URL(rel, BASE).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE.map(scoped));
    // Cache currently published weeks so the archive is available without network.
    try {
      const response = await fetch(scoped('./data/weeks/manifest.json'), {cache:'no-store'});
      const weeks = await response.json();
      if(Array.isArray(weeks)) await Promise.allSettled(weeks.map(w => {
        if(!/^data\/weeks\/\d{4}-\d{2}-\d{2}\.json$/.test(w.file || '')) return Promise.resolve();
        return cache.add(scoped('./'+w.file));
      }));
    } catch (_) { /* Online updates still work if a week cannot be preloaded. */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('raspissanie-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method !== 'GET') return;
  const url=new URL(request.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith((async () => {
    try {
      // Network-first: users see updated JSON and HTML, with cached fallback offline.
      const response=await fetch(request);
      if(response.ok) {
        const cache=await caches.open(CACHE_NAME);
        event.waitUntil(cache.put(request,response.clone()));
      }
      return response;
    } catch (_) {
      const cached=await caches.match(request);
      if(cached) return cached;
      if(request.mode === 'navigate') {
        const fallback=request.url.includes('/editor/')?'./editor/index.html':'./index.html';
        const page=await caches.match(scoped(fallback));
        if(page) return page;
      }
      return Response.error();
    }
  })());
});
