const CACHE_NAME = 'estuda-ia-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/cadastro.html',
  '/redacao.html',
  '/simulados.html',
  '/cronograma.html',
  '/perfil.html',
  '/assets/css/style.css',
  '/auth.js',
  '/gerenciador_questoes.js'
  // Adicione aqui outros scripts ou imagens que você queira que funcionem offline
];

// 1. Instalação: Cacheia os arquivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [PWA] Cacheando arquivos...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Ativação: Limpa caches antigos se houver atualização
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Interceptação (Fetch): Serve do cache primeiro, depois tenta a rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições para a API (Backend) - essas sempre precisam de internet
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Se achou no cache, retorna. Se não, busca na rede.
      return response || fetch(event.request);
    })
  );
});
