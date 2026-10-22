/** Present only on builds that set VITE_AI_SHARE_TARGET=true. Production stays without it until launch. */
export const AI_SHARE_TARGET = {
  action: "/share-target",
  method: "POST",
  enctype: "multipart/form-data",
  params: {
    title: "title",
    text: "text",
    url: "url",
    files: [
      {
        name: "file",
        accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      },
    ],
  },
} as const;

export function shareTargetBuildEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** Drops a static share_target, then adds one only when the build flag is on. */
export function manifestForShareTarget<T extends { share_target?: unknown }>(
  manifest: T,
  enabled: boolean,
): Omit<T, "share_target"> & { share_target?: typeof AI_SHARE_TARGET } {
  const { share_target: _dropped, ...rest } = manifest;
  if (!enabled) return rest;
  return { ...rest, share_target: AI_SHARE_TARGET };
}
