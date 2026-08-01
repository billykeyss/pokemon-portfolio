// Arcade offline cache. Bump CACHE_NAME to force clients onto new assets.
//
// Next.js emits hashed asset filenames that are unknown when this file is
// written, so this caches at runtime (cache-first for same-origin GETs) rather
// than precaching a hardcoded list.
const CACHE_NAME = "arcade-v3";
const CORE = [
  "/game",
  "/bounce",
  "/bounce/bouncedex",
  "/sort",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // allSettled: one missing URL must not abort the whole install.
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Must cover every asset the arcade needs offline. The manifest and icon are
  // precached above, so omitting them here would cache them and never serve
  // them — they'd still 404 with the network down.
  const handled =
    url.pathname.startsWith("/bounce") ||
    url.pathname.startsWith("/_next") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg";
  if (!handled) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
    }),
  );
});
