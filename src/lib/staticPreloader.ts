/**
 * The static pre-loader (`#pre-loader` in index.html) sits outside React's root, so React's
 * first render doesn't remove it. It stays on screen until the app has something to show:
 * the router renders nothing while the root route's `beforeLoad` checks the session and the
 * first page's code loads, and without it that moment was a blank white page.
 */
export function removeStaticPreloader(): void {
  document.getElementById("pre-loader")?.remove();
}
