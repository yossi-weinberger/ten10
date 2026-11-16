function receiptUrlBlocked(
  savedReceipt: boolean,
  intakeEnabled: boolean,
  userAllowed: boolean,
  serviceKey: string,
  supabaseUrl: string,
): boolean {
  return (!savedReceipt && (!intakeEnabled || !userAllowed)) || !serviceKey || !supabaseUrl;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a user with no plan can still open a saved receipt", () => {
  assert(
    receiptUrlBlocked(true, false, false, "service", "https://example.supabase.co") === false,
    "saved receipt is not blocked without a plan or intake",
  );
});

Deno.test("a draft receipt is blocked when the user has no plan", () => {
  assert(
    receiptUrlBlocked(false, true, false, "service", "https://example.supabase.co") === true,
    "draft receipt requires a plan",
  );
});
