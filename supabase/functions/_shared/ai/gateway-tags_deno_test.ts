import { gatewayProviderOptions } from "./gateway-tags.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("app calls send no tags and no user", () => {
  const options = gatewayProviderOptions({ source: "app" });
  assert(options.zeroDataRetention === true, "zero data retention");
  assert(!("tags" in options), "no tags");
  assert(!("user" in options), "no user");
});

Deno.test("eval calls send only source:eval", () => {
  const options = gatewayProviderOptions({ source: "eval" });
  assert(options.tags?.length === 1 && options.tags[0] === "source:eval", "one tag");
});

Deno.test("a provider allowlist is passed through", () => {
  const options = gatewayProviderOptions({ source: "app", only: ["anthropic"] });
  assert(options.only?.length === 1 && options.only[0] === "anthropic", "only");
  assert(!("tags" in options), "still no tags");
});
