import { readTranscript } from "./speech-transcript.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a transcript keeps the spoken wording", () => {
  assert(readTranscript({ text: "  אתמול שילמתי 80 שקל למונית  " }) === "אתמול שילמתי 80 שקל למונית", "hebrew");
  assert(readTranscript({ text: "x" }) === null, "too short");
  assert(readTranscript({}) === null, "missing");
});
