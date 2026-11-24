/* Gersepa — Firebase Cloud Messaging service worker (background push). */
/* eslint-disable no-undef */

self.addEventListener("notificationclick", (event) => {
  if (!event.notification.data?.url) return;
  event.notification.close();
  event.waitUntil((async () => {
    let url = new URL("/notificacoes", self.location.origin);
    try {
      const target = new URL(event.notification.data.url, self.location.origin);
      if (target.origin === self.location.origin || target.protocol === "https:") url = target;
    } catch {
      // Use the notification center for malformed links.
    }
    if (url.origin !== self.location.origin) return self.clients.openWindow(url.href);
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url === url.href);
    if (existing) return existing.focus();
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      const navigated = await client.navigate(url.href).catch(() => null);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});

importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// Config Firebase Web (valores PÚBLICOS por design). Fixamos no SW porque
// query strings não são garantidas ao re-executar o SW em background (TWA/Chrome).
const firebaseConfig = {
  apiKey: "AIzaSyD6zZib4Iplr3cZMGECzgtsjGoGSiZOAfU",
  authDomain: "gersepa-diaristas.firebaseapp.com",
  projectId: "gersepa-diaristas",
  storageBucket: "gersepa-diaristas.firebasestorage.app",
  messagingSenderId: "385971556121",
  appId: "1:385971556121:web:d4455055300570e14dbf88",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "Gersepa Solutions";
  const image =
    data.image ||
    payload.notification?.image ||
    payload.fcmOptions?.image ||
    undefined;
  const options = {
    body: data.body || payload.notification?.body || "Você tem uma nova notificação.",
    badge: "/icons/badge-96-v3.png",
    // Android renders the optional icon and image as a right-side thumbnail.
    ...(/Android/i.test(self.navigator.userAgent) ? {} : { icon: "/icons/icon-192.png", image }),
    ...(data.tag ? { tag: data.tag, renotify: true } : {}),
    silent: false,
    requireInteraction: true,
    vibrate: [300, 120, 300, 120, 400],
    data: { url: data.link || payload.fcmOptions?.link || "/notificacoes" },
  };
  await self.registration.showNotification(title, options);
});
