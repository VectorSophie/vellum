const CACHE_NAME = 'tetohira-v1';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './css/common.css',
  './js/common.js',
  './js/lib.js',
  './js/app.js',
  './img/a_guide.gif',
  './img/icon.png',
  './data/bgm.mp3',
  './data/s/hiragana.json',
  './data/s/se.json',
  './manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
