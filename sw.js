/* Cache icons only. Never cache HTML or live data — phone sells broke
   when an old index.html was served from the service worker. */
const CACHE = "fomo-terminal-v22";
const PRECACHE = ["./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const VERSION = "v22";

function isHTML(request) {
  if (request.mode === "navigate") return true;
  const u = new URL(request.url);
  const p = u.pathname;
  return p.endsWith("/") || p.endsWith("/index.html") || p.endsWith("index.html") ||
    (request.headers.get("accept") || "").includes("text/html");
}

function isLiveData(requestUrl) {
  const u = new URL(requestUrl);
  const host = u.hostname;
  if (
    host === "raw.githubusercontent.com" ||
    host === "api.github.com" ||
    host === "api.geckoterminal.com" ||
    host === "api.dexscreener.com" ||
    host.includes("ntfy") ||
    host.endsWith("trycloudflare.com") ||
    host.endsWith("loca.lt") ||
    host.endsWith("unpkg.com") ||
    host === "api.mainnet-beta.solana.com" ||
    host.endsWith(".solana.com") ||
    host.endsWith("publicnode.com")
  ) return true;
  if (u.pathname.endsWith("data.json") || u.pathname.endsWith("sw.js")) return true;
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

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting" || (event.data && event.data.type === "skipWaiting")) {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const dest = event.request.destination || "";
  if (dest === "websocket" || (event.request.headers.get("Upgrade") || "").toLowerCase() === "websocket") return;
  const host = new URL(event.request.url).hostname;
  if (host.endsWith("demo.tbmq.io")) return;
  if (isHTML(event.request) || isLiveData(event.request.url)) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(event.request))
  );
});
