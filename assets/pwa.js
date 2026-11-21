/* Shared PWA installation/registration; works under a GitHub Pages subfolder. */
(() => {
  'use strict';
  const isWeb = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!isWeb || !('serviceWorker' in navigator)) return;
  const isEditor = location.pathname.replace(/\/$/,'').endsWith('/editor') || location.pathname.includes('/editor/');
  const swPath = isEditor ? '../sw.js' : './sw.js';
  window.addEventListener('load', () => navigator.serviceWorker.register(swPath).catch(err => console.warn('PWA:', err)));
  let deferredPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault();deferredPrompt=event;});
  window.addEventListener('appinstalled', () => {deferredPrompt=null;if(installBtn) installBtn.textContent='Приложение установлено';});
  if(installBtn) installBtn.addEventListener('click',async () => {
    if(deferredPrompt) {
      const ev=deferredPrompt;deferredPrompt=null;await ev.prompt();
    } else {
      const msg=/iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'iPhone/iPad: откройте «Поделиться» → «На экран Домой» в Safari.'
        : 'В меню браузера выберите «Установить приложение» или «Добавить на главный экран». Для установки откройте опубликованный HTTPS-сайт.';
      alert(msg);
    }
  });
})();
