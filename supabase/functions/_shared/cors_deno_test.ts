import { getCorsHeaders } from "./cors.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("preview origins are allowed in one place", () => {
  const preview = getCorsHeaders("https://ten10-feat-ai.vercel.app");
  assert(preview["Access-Control-Allow-Origin"] === "https://ten10-feat-ai.vercel.app", "preview");
  assert(getCorsHeaders("https://ten10-app.com")["Access-Control-Allow-Origin"] === "https://ten10-app.com", "production");
  assert(getCorsHeaders("https://evil.vercel.app")["Access-Control-Allow-Origin"] === undefined, "other vercel app");
});
