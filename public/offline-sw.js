const CACHE_NAME = "enspec-vr-offline-v2";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/models/panel_optimized_v4.glb",
  "/textures/env_premium_plant_room_4k.jpg",
  "/textures/env_energy_facility_yard_4k.jpg",
  "/textures/env_exhibition_demo_bay_4k.jpg",
  "/textures/floor_premium_plant_room.jpg",
  "/textures/floor_energy_facility_yard.jpg",
  "/textures/floor_exhibition_demo_bay.jpg",
];

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (err) {
        console.warn("[offline] Could not cache", url, err);
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheUrls(PRECACHE_URLS).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "PRECACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(cacheUrls(event.data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", response.clone());
          await cache.put("/index.html", response.clone());
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match("/")) ||
            (await caches.match("/index.html")) ||
            Response.error()
          );
        })
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname === "/offline-sw.js"
  ) {
    event.respondWith(
      fetch(new Request(request, { cache: "reload" }))
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      });
    })
  );
});
