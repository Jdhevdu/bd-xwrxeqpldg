/* Cache static PWA assets only. Never cache live data or market APIs. */
const CACHE = "fomo-terminal-v6";
const PRECACHE = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

function isLiveData(requestUrl) {
  const u = new URL(requestUrl);
  const host = u.hostname;
  if (
    host === "raw.githubusercontent.com" ||
    host === "api.github.com" ||
    host === "api.geckoterminal.com" ||
    host === "api.dexscreener.com" ||
    host.includes("ntfy")
  ) return true;
  if (u.pathname.endsWith("data.json")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (isLiveData(event.request.url)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
