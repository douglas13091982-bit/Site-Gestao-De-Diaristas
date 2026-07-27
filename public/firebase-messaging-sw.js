/* Gersepa — Firebase Cloud Messaging service worker (background push). */
/* eslint-disable no-undef */

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

messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || payload.notification?.title || "Gersepa Solutions";
    const image =
      data.image ||
      payload.notification?.image ||
      payload.fcmOptions?.image ||
      undefined;
    const options = {
      body: data.body || payload.notification?.body || "Você tem uma nova notificação.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      image,
      tag: data.tag || "gersepa-push",
      renotify: false,
      data: { url: data.link || payload.fcmOptions?.link || "/notificacoes" },
    };
    self.registration.showNotification(title, options);
});

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