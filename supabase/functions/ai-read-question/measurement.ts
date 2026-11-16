/** One measurement id per data question. The question text is not stored. */

export async function saveQuestionMeasurement(
  call: (args: { p_user_id: string; p_signals: Record<string, number> }) => Promise<{
    data: unknown;
    error: unknown;
  }>,
  userId: string,
  signals: Record<string, number>,
): Promise<string | null> {
  const saved = await call({ p_user_id: userId, p_signals: signals });
  if (saved.error || typeof saved.data !== "string") return null;
  return saved.data;
}
