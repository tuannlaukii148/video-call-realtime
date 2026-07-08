import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { notificationService } from "@/services/notificationService";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.projectId
    && firebaseConfig.messagingSenderId
    && firebaseConfig.appId
);

let messagingPromise: Promise<Messaging | null> | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!hasFirebaseConfig) return null;
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null;
      const app = initializeApp(firebaseConfig);
      return getMessaging(app);
    });
  }
  return messagingPromise;
}

export async function registerCurrentBrowserForMeetingReminders() {
  const messaging = await getFirebaseMessaging();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!messaging || !vapidKey || !("Notification" in window)) {
    return { success: false, reason: "unsupported_or_not_configured" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, reason: "permission_denied" };
  }

  const cache = await caches.open("firebase-messaging-config");
  await cache.put(
    "/firebase-messaging-config",
    new Response(JSON.stringify(firebaseConfig), {
      headers: { "content-type": "application/json" },
    })
  );

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return { success: false, reason: "token_unavailable" };
  }

  await notificationService.registerFcmToken(token, "web");
  return { success: true, token };
}
