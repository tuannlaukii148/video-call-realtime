importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

async function initializeMessaging() {
  const cache = await caches.open("firebase-messaging-config");
  const response = await cache.match("/firebase-messaging-config");
  if (!response) return;

  const config = await response.json();
  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Meeting reminder";
    const options = {
      body: payload.notification?.body || "Your meeting starts soon.",
      data: payload.data,
    };

    self.registration.showNotification(title, options);
  });
}

initializeMessaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const roomCode = event.notification.data?.roomCode;
  const url = roomCode ? `/lobby?code=${encodeURIComponent(roomCode)}` : "/";
  event.waitUntil(clients.openWindow(url));
});
