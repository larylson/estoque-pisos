// Service worker de "despedida" do endereço antigo (larylson.github.io/estoque-pisos).
// Celulares que tinham o app instalado aqui recebem este arquivo: ele se desliga e manda para o endereço novo.
// (Não apaga caches: o app novo, no mesmo site, usa os mesmos.)
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    await self.registration.unregister();
    const janelas = await self.clients.matchAll({ type: 'window' });
    janelas.forEach(function (c) {
      try { c.navigate(c.url.replace('/estoque-pisos/', '/santamarta/')); } catch (err) {}
    });
  })());
});
