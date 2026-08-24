export async function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  // Platform boundary: a static Tauri import survives Vercel externalization
  // as a bare browser specifier. Keep the runtime import lazy and desktop-only.
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
