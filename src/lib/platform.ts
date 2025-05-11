// import { getVersion } from '@tauri-apps/api/app';
// import { platform } from '@tauri-apps/api/os';

// export interface PlatformInfo {
//   isDesktop: boolean;
//   version: string;
//   platform: 'windows' | 'macos' | 'linux' | 'web';
//   isDev: boolean;
// }

// export async function getPlatformInfo(): Promise<PlatformInfo> {
//   try {
//     // נסה לקבל מידע מטאורי
//     const version = await getVersion();
//     const os = await platform();

//     return {
//       isDesktop: true,
//       version,
//       platform: os as 'windows' | 'macos' | 'linux',
//       isDev: false
//     };
//   } catch (error) {
//     // אם נכשל, כנראה שאנחנו בדפדפן
//     const isDev = process.env.NODE_ENV === 'development';
//     const isDesktopMode = isDev && window.location.search.includes('platform=desktop');

//     return {
//       isDesktop: isDesktopMode,
//       version: isDesktopMode ? '1.0.0-dev' : '1.0.0-web',
//       platform: 'web',
//       isDev
//     };
//   }
// }
