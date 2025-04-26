// export async function isDesktop(): Promise<boolean> {
//   if (typeof window === 'undefined') return false;
//   return Boolean(window.electronAPI);
// }

// export async function isOnline(): Promise<boolean> {
//   if (typeof window === 'undefined') return true;
//   return navigator.onLine;
// }

// export async function getPlatformInfo() {
//   const desktop = await isDesktop();
//   const online = await isOnline();

//   return {
//     platform: desktop ? 'desktop' : 'web',
//     online,
//     storageType: desktop ? 'sqlite' : 'supabase',
//     features: {
//       offlineSupport: desktop,
//       sync: !desktop && online,
//       localBackup: desktop,
//       cloudBackup: !desktop && online
//     }
//   };
// }
