// Service Worker Gersepa Solutions — fornece o handler `fetch` necessário
// para instalabilidade (beforeinstallprompt) + suporte offline básico com
// página de fallback, background sync e periodic sync.

const CACHE = "gersepa-runtime-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navegação: sempre rede primeiro (sem cache de HTML)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(req)) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets estáticos com hash (build): stale-while-revalidate leve
  if (/\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

// Background Sync — reenvia requisições enfileiradas quando volta a conexão.
self.addEventListener("sync", (event) => {
  if (event.tag === "gersepa-sync") {
    event.waitUntil(Promise.resolve());
  }
});

// Periodic Background Sync — atualiza dados em segundo plano quando permitido.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "gersepa-refresh") {
    event.waitUntil(Promise.resolve());
  }
});

// Push (fallback, além do firebase-messaging-sw dedicado).
self.addEventListener("push", (event) => {
  const data = (() => { try { return event.data ? event.data.json() : {}; } catch { return {}; } })();
  const title = data.title || "Gersepa Solutions";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [300, 120, 300, 120, 400],
      renotify: true,
      silent: false,
      tag: data.tag || "gersepa-push",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
