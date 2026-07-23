/* Gersepa — Firebase Cloud Messaging service worker (background push). */
/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// A config é passada via query string na hora do register (SW não tem env).
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Gersepa Solutions";
    const image =
      payload.notification?.image ||
      payload.data?.image ||
      payload.fcmOptions?.image ||
      undefined;
    const options = {
      body: payload.notification?.body || "Você tem uma nova notificação.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      image,
      tag: payload.data?.tag || "gersepa-push",
      data: { url: payload.data?.link || payload.fcmOptions?.link || "/notificacoes" },
    };
    self.registration.showNotification(title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});