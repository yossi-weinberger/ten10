import { gatewayTags, hashGatewayUserId } from "./gateway-tags.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("gateway tags are source plus one feature", () => {
  const tags = gatewayTags("eval", "intent");
  assert(tags[0] === "source:eval", "source");
  assert(tags[1] === "intent", "feature");
});

Deno.test("the gateway user hash is sha256 of salt plus user id", async () => {
  const hash = await hashGatewayUserId("salt", "user");
  assert(hash === "8031377c4c15e1611986089444c8ff58c95358ffdc95d692a6d10c7b633e99df", "vector");
});
