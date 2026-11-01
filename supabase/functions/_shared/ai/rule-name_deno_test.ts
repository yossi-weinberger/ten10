import { ruleNameStands } from "./rule-name.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a rule name matches the word and one prefix, not a longer word", () => {
  assert(ruleNameStands("גן ילדים שושנים", "גן"), "receipt");
  assert(ruleNameStands("שילמתי לגן 900", "גן"), "prefix lamed");
  assert(ruleNameStands("גן 900", "גן"), "bare");
  assert(ruleNameStands("שכר לימוד גן 900 שקל", "גן"), "tuition");
  assert(ruleNameStands("הגן של נועה", "גן"), "prefix he");
  assert(!ruleNameStands("גנב", "גן"), "thief");
  assert(!ruleNameStands("מגן", "גן"), "shield");
  assert(!ruleNameStands("גנן", "גן"), "gardener");
  assert(!ruleNameStands("קניתי גינה", "גן"), "garden");
});
