import { MODEL, SKYBOX_OPTIONS } from "./utils/config";

const CACHE_NAME = "enspec-vr-offline-v1";

type Status = "working" | "ready" | "unavailable" | "error";

export function initOfflineCache(): void {
  if (!supportsOfflineCache()) {
    updateOfflineBadge("Offline cache unavailable on this URL", "unavailable");
    return;
  }

  updateOfflineBadge("Preparing offline demo...", "working");

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      void prepareOfflineCache();
    }, 1800);
  });
}

function supportsOfflineCache(): boolean {
  const secure =
    window.isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  return secure && "serviceWorker" in navigator && "caches" in window;
}

async function prepareOfflineCache(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register("/offline-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    const urls = collectOfflineUrls();
    await cacheUrls(urls);

    const activeWorker =
      registration.active ||
      navigator.serviceWorker.controller ||
      registration.waiting ||
      registration.installing;

    activeWorker?.postMessage({ type: "PRECACHE_URLS", urls });
    updateOfflineBadge("Offline demo ready", "ready");
  } catch (err) {
    console.warn("Offline cache setup failed:", err);
    updateOfflineBadge("Offline cache needs internet once", "error");
  }
}

function collectOfflineUrls(): string[] {
  const urls = new Set<string>(["/", "/index.html", "/offline-sw.js"]);

  urls.add(`/${MODEL.path}${MODEL.fileName}`.replace(/\/+/g, "/"));

  for (const option of SKYBOX_OPTIONS) {
    if (option.file) urls.add(`/textures/${option.file}`);
    if (option.floorTexture) urls.add(`/textures/${option.floorTexture}`);
  }

  for (const script of Array.from(document.scripts)) {
    addSameOriginUrl(urls, script.src);
  }

  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]"))) {
    addSameOriginUrl(urls, link.href);
  }

  for (const entry of performance.getEntriesByType("resource")) {
    addSameOriginUrl(urls, entry.name);
  }

  return Array.from(urls);
}

function addSameOriginUrl(urls: Set<string>, rawUrl: string): void {
  if (!rawUrl) return;

  try {
    const url = new URL(rawUrl, location.href);
    if (url.origin !== location.origin) return;

    const path = `${url.pathname}${url.search}`;
    if (
      path === "/" ||
      path === "/index.html" ||
      path.startsWith("/assets/") ||
      path.startsWith("/models/") ||
      path.startsWith("/textures/") ||
      path.endsWith(".js") ||
      path.endsWith(".css")
    ) {
      urls.add(path);
    }
  } catch {
    // Ignore invalid browser-generated resource names.
  }
}

async function cacheUrls(urls: string[]): Promise<void> {
  const cache = await caches.open(CACHE_NAME);

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (err) {
      console.warn("Offline cache could not store", url, err);
    }
  }
}

function updateOfflineBadge(message: string, status: Status): void {
  const badge = getOfflineBadge();
  badge.textContent = message;
  badge.dataset.status = status;
}

function getOfflineBadge(): HTMLDivElement {
  const existing = document.getElementById("offlineStatus");
  if (existing instanceof HTMLDivElement) return existing;

  const badge = document.createElement("div");
  badge.id = "offlineStatus";
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-live", "polite");
  badge.style.position = "fixed";
  badge.style.left = "20px";
  badge.style.bottom = "20px";
  badge.style.zIndex = "90";
  badge.style.padding = "9px 13px";
  badge.style.borderRadius = "999px";
  badge.style.border = "1px solid rgba(255,255,255,0.16)";
  badge.style.background = "rgba(12,14,18,0.78)";
  badge.style.color = "rgba(255,255,255,0.88)";
  badge.style.font = "600 12px/1.2 system-ui, -apple-system, sans-serif";
  badge.style.letterSpacing = "0.2px";
  badge.style.backdropFilter = "blur(10px)";
  badge.style.pointerEvents = "none";

  const style = document.createElement("style");
  style.textContent = `
    #offlineStatus[data-status="ready"] {
      background: rgba(32, 96, 68, 0.82) !important;
      border-color: rgba(142, 215, 170, 0.36) !important;
    }
    #offlineStatus[data-status="working"] {
      background: rgba(76, 64, 38, 0.82) !important;
      border-color: rgba(226, 194, 112, 0.36) !important;
    }
    #offlineStatus[data-status="unavailable"],
    #offlineStatus[data-status="error"] {
      background: rgba(96, 38, 38, 0.82) !important;
      border-color: rgba(226, 112, 112, 0.36) !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(badge);
  return badge;
}
