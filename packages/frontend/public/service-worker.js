self.addEventListener('install', (event) => {
  console.log('[PWA] Service worker installed', event);
});

self.addEventListener('activate', (event) => {
  console.log('[PWA] Service worker activated', event);
});

self.addEventListener('fetch', (event) => {
  // Placeholder: use Workbox or custom caching strategy before production.
});
