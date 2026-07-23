import { createServerFn } from "@tanstack/react-start";

/**
 * Devolve a configuração pública do Firebase Web ao cliente.
 * A apiKey do Firebase Web é uma chave pública por design — identifica
 * o projeto no navegador. A segurança real vem de: domínios autorizados
 * no Firebase Console, regras do Firestore/Storage, e App Check.
 */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new Error("FIREBASE_WEB_API_KEY não configurada");
  }
  return {
    apiKey,
    authDomain: "gersepa-diaristas.firebaseapp.com",
    projectId: "gersepa-diaristas",
    storageBucket: "gersepa-diaristas.firebasestorage.app",
    messagingSenderId: "385971556121",
    appId: "1:385971556121:web:d4455055300570e14dbf88",
    measurementId: "G-FTCD1ZZJZP",
    vapidKey:
      "BCyCxXLd3jOPcRYQglOfFDMkaqRf6wktqgTqRhmu2sfUdyc-QUfzLfNLxXKzE4Kk8zPLmD8jDicaMs-P2vQVaSs",
  };
});