// Listener de notificaciones Web Push para ProTraining PWA
// Se importa en el Service Worker generado por VitePWA / Workbox

self.addEventListener('push', function (event) {
  let data = {
    title: 'ProTraining',
    body: 'Tienes una nueva notificación.',
    url: '/pf',
    tag: 'protraining-notification',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch {
      const text = event.data.text();
      if (text) {
        data.body = text;
      }
    }
  }

  // Sanitizar URL destino interna para prevenir open redirects hacia dominios externos
  let safeUrl = '/';
  if (typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')) {
    safeUrl = data.url;
  }

  const options = {
    body: data.body || 'Nuevo aviso de entrenamiento disponible.',
    icon: '/assets/pwa-192x192.png',
    badge: '/assets/pwa-64x64.png',
    tag: data.tag || 'protraining-notification',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: safeUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'ProTraining', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  let targetPath = event.notification.data?.url || '/';
  // Asegurar que la ruta sea interna relativa segura
  if (typeof targetPath !== 'string' || !targetPath.startsWith('/') || targetPath.startsWith('//')) {
    targetPath = '/';
  }

  const resolvedUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          try {
            const clientOrigin = new URL(client.url).origin;
            if (clientOrigin === self.location.origin) {
              if ('navigate' in client) {
                client.navigate(resolvedUrl);
              }
              return client.focus();
            }
          } catch {
            // Continuar con el siguiente cliente si la URL no es válida
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(resolvedUrl);
      }
    }),
  );
});
