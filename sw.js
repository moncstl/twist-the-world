/* 오프라인 캐시 — 앱(PWA) 설치 대비 최소 셸
   2026-11-27: cache-first → **network-first** 로 바꿈.
   예전 방식은 한 번 캐시되면 새 발행분이 영원히 안 보였다(새 섹션을 올려도 옛 화면이 뜸).
   이제는 항상 네트워크를 먼저 보고, 오프라인일 때만 캐시를 쓴다. */
const CACHE = 'market-radar-v2';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))));
});
