/** A receipt link is accepted only when it is a signed object URL on this project. */
export function isReceiptUrl(url: string, supabaseUrl: string): boolean {
  const base = supabaseUrl.replace(/\/$/, "");
  return base.startsWith("https://")
    && url.startsWith(`${base}/storage/v1/object/sign/intake-artifacts/`);
}
