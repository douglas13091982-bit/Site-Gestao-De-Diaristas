import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseConfig } from "./firebase-config.functions";

type FirebaseConfig = Awaited<ReturnType<typeof getFirebaseConfig>>;

let appPromise: Promise<{ app: FirebaseApp; messaging: Messaging | null; config: FirebaseConfig } | null> | null = null;

/** Inicializa o Firebase apenas no navegador, uma única vez. */
export function initFirebase() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!appPromise) {
    appPromise = (async () => {
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      const config = await getFirebaseConfig();
      const app = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId,
      });
      const messaging = getMessaging(app);
      return { app, messaging, config };
    })().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

/**
 * Pede permissão ao usuário e retorna o token FCM.
 * Registra o service worker do Firebase no escopo dedicado.
 */
export async function requestPushToken(): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const ctx = await initFirebase();
  if (!ctx?.messaging) return null;
  const swRegistration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/firebase-cloud-messaging-push-scope" },
  );

  const token = await getToken(ctx.messaging, {
    vapidKey: ctx.config.vapidKey,
    serviceWorkerRegistration: swRegistration,
  });
  return token || null;
}

/** Ouve mensagens push com o app em primeiro plano (aba aberta). */
export async function onForegroundMessage(cb: (payload: unknown) => void) {
  const ctx = await initFirebase();
  if (!ctx?.messaging) return () => {};
  return onMessage(ctx.messaging, cb);
}
