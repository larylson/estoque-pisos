// Service worker do app Estoque Santa Marta
// - Página e arquivos do app: busca sempre a versão mais nova na internet; sem internet, abre a última salva.
// - Bibliotecas do Firebase: guardadas para o app abrir mesmo sem internet.
// - Fotos do Cloudinary: guardadas depois da 1ª vez que aparecem.
// - Banco de dados (Firestore) e login: não passam por aqui (o Firebase cuida disso).
const VERSAO = 'estoque-sm-v1';
const CACHE_APP = VERSAO + '-app';
const CACHE_LIBS = 'estoque-sm-libs';
const CACHE_FOTOS = 'estoque-sm-fotos';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './apple-touch-icon.png', './favicon.png', './logo.png', './logo-emblema.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_APP).then(c => Promise.all(ARQUIVOS.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.endsWith('-app') && n !== CACHE_APP).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Arquivos do próprio app: rede primeiro, cópia salva se estiver sem internet
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const resp = await fetch(req, { cache: 'no-store' });
        if (resp && resp.ok) { const c = await caches.open(CACHE_APP); c.put(req, resp.clone()); }
        return resp;
      } catch (err) {
        const salvo = await caches.match(req, { ignoreSearch: true });
        if (salvo) return salvo;
        if (req.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
        throw err;
      }
    })());
    return;
  }

  // Bibliotecas do Firebase (gstatic): usa a salva e atualiza em segundo plano
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE_LIBS);
      const salvo = await c.match(req);
      const rede = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => salvo);
      return salvo || rede;
    })());
    return;
  }

  // Fotos do Cloudinary: guardadas no aparelho
  if (url.hostname === 'res.cloudinary.com') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE_FOTOS);
      const salvo = await c.match(req);
      if (salvo) return salvo;
      const r = await fetch(req);
      if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
      return r;
    })());
  }
});
