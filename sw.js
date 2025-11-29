const CACHE_NAME = 'perola-rara-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/css/main.css',
  './assets/css/orcamentos.css',
  './assets/css/precificacao.css',
  './assets/js/main.js',
  './assets/js/orcamentos.js',
  './assets/js/precificacao.js',
  './assets/js/firebase-config.js',
  './assets/images/logo_perola_rara.png',
  './assets/images/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;700&family=Roboto:wght@300;400;500;700&display=swap'
];

// Instalação: Cache dos arquivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removendo cache antigo', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch: Intercepta requisições e serve do cache se disponível
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrar, senão busca na rede
        return response || fetch(event.request);
      })
  );
});
