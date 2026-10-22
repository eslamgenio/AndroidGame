/** Enables offline play and installation. Production builds only: in dev it would cache stale code. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.warn('Offline support is unavailable:', error);
    });
  });
}
