// Listener de notificaciones Web Push para ProTraining PWA
// Se importa en el Service Worker generado por VitePWA / Workbox

self.addEventListener('push', function (event) {
  let data = {
    title: 'ProTraining',
    body: 'Tienes una nueva notificación.',
    url: '/',
    tag: 'protraining-notification',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/pwa-192x192.png',
    badge: '/assets/pwa-64x64.png',
    tag: data.tag || 'protraining-notification',
    renotify: true,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
