/**
 * Data management: import/export and clear-all-data for Desktop (Tauri) and Web (Supabase).
 * Public API re-exported here and via dataManagement.service.ts for backward compatibility.
 */
export type { ImportProgress } from "./types";
export { clearAllData } from "./clear";
export {
  exportDataDesktop,
  importDataDesktop,
} from "./desktop";
export {
  exportDataWeb,
  importDataWeb,
} from "./web";
