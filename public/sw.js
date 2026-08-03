// Arcade offline cache. Bump CACHE_NAME to force clients onto new assets.
//
// Next.js emits content-hashed asset filenames that are unknown when this file
// is written, so nothing here precaches a build's chunks by name — routes are
// precached, and everything under them is cached as it is fetched.
const CACHE_NAME = "arcade-v9";

// Every route the arcade can land on. Precached together so a player who has
// only ever opened one game can still reach the others with no connection.
const ROUTES = [
  "/game/",
  "/bounce/",
  "/bounce/bouncedex/",
  "/sort/",
  "/traffic/",
  "/shelf/",
  "/arrows/",
  "/knight/",
  "/picross/",
  "/sudoku/",
];

const CORE = [...ROUTES, "/manifest.webmanifest", "/icon.svg", "/asset-manifest.json"];

// Runtime assets live under these. Traffic and Shelf fetch their sprites from
// /game/traffic/ and /game/shelf/ at play time, so those must be intercepted
// too — a route that loads but cannot draw is not offline support.
const ASSET_PREFIXES = ["/_next/", "/game/", "/bounce/"];

const isHashedBuildAsset = (pathname) => pathname.startsWith("/_next/static/");

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Fresh when there is a network, cached when there is not.
 *
 * This is the strategy for HTML specifically. Serving a page cache-first is
 * what produced the failure this replaces: a cached document paired with a
 * newer build's chunks, so React hydrates against markup it did not produce
 * and the page dies on load. The document is the one thing that must not lag
 * behind the assets it references.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // An uncached route with no network. The arcade index is precached and
    // links to everything, so it is a better landing place than a browser
    // error page.
    const fallback = await caches.match("/game/");
    return fallback ?? Response.error();
  }
}

/**
 * Precache one URL, tolerating anything that goes wrong with it.
 *
 * Deliberately fetch-then-put rather than `cache.add`. `add` rejects outright
 * on a redirected response, and these are directory-style routes on a static
 * host — exactly the shape that redirects. One such rejection used to take the
 * whole precache down with it, which is why only the route a player had
 * actually opened was ever available offline.
 *
 * `redirect: "follow"` plus an explicit put stores whatever the route finally
 * resolves to, keyed by the URL asked for, which is what a later navigation
 * looks up.
 */
async function precache(cache, url) {
  try {
    const response = await fetch(url, { redirect: "follow", cache: "reload" });
    if (response.ok) await cache.put(url, response);
  } catch {
    // A route that cannot be reached now is simply not available offline
    // later. It must never stop the rest of the arcade being cached.
  }
}

/**
 * The sprites Traffic, Shelf and BOUNCEDEX fetch while being played.
 *
 * Read from a generated file rather than listed here: there are eighty of them
 * and they change whenever someone draws one, so a hardcoded copy would rot
 * silently — and the failure would first appear as a game that loads but
 * cannot draw itself, with no connection to fix it. scripts/asset-manifest.mjs
 * writes the file and a test fails the suite if it drifts from what is on disk.
 */
async function runtimeAssets() {
  try {
    const response = await fetch("/asset-manifest.json", { cache: "reload" });
    if (!response.ok) return [];
    const { assets } = await response.json();
    return Array.isArray(assets) ? assets : [];
  } catch {
    // No manifest, no sprites precached — the routes still install, and the
    // sprites still cache the first time a game is opened online. A degraded
    // install beats no install.
    return [];
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const assets = await runtimeAssets();
      // Routes first: they are what makes the arcade navigable offline, and
      // they should not wait behind eighty sprites.
      await Promise.all(CORE.map((url) => precache(cache, url)));
      await Promise.all(assets.map((url) => precache(cache, url)));
      await self.skipWaiting();
    })(),
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

  // A page load, however it was reached. Always tried against the network
  // first — see networkFirst for why the document is the one thing that must
  // not be served stale.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Content-hashed build output. The filename changes whenever the bytes do,
  // so a cached copy can never be stale, which makes cache-first both correct
  // and the fastest path available.
  if (isHashedBuildAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg" ||
    ASSET_PREFIXES.some((p) => url.pathname.startsWith(p))
  ) {
    event.respondWith(cacheFirst(request));
  }
});
