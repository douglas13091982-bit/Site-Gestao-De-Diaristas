import { initializeApp, type FirebaseApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseConfig } from "./firebase-config.functions";

export const FCM_WORKER_SCOPE = "/firebase-cloud-messaging-push-scope";

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
    { scope: FCM_WORKER_SCOPE },
  );

  if (!swRegistration.active) {
    const maybeWorker = swRegistration.installing ?? swRegistration.waiting;
    if (!maybeWorker) throw new Error("O service worker do Firebase não foi instalado.");
    const worker: ServiceWorker = maybeWorker;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        worker.removeEventListener("statechange", onStateChange);
        reject(new Error("O service worker demorou para ativar."));
      }, 10_000);

      function onStateChange() {
        if (worker.state !== "activated" && worker.state !== "redundant") return;
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", onStateChange);
        if (worker.state === "activated") resolve();
        else reject(new Error("O service worker do Firebase não foi ativado."));
      }

      worker.addEventListener("statechange", onStateChange);
      onStateChange();
    });
  }

  const token = await getToken(ctx.messaging, {
    vapidKey: ctx.config.vapidKey,
    serviceWorkerRegistration: swRegistration,
  });
  return token || null;
}

export async function renewPushToken(): Promise<string | null> {
  const ctx = await initFirebase();
  if (!ctx?.messaging || !(await deleteToken(ctx.messaging))) return null;
  return requestPushToken();
}

/** Ouve mensagens push com o app em primeiro plano (aba aberta). */
export async function onForegroundMessage(cb: (payload: unknown) => void) {
  const ctx = await initFirebase();
  if (!ctx?.messaging) return () => {};
  return onMessage(ctx.messaging, cb);
}
