export function draftWasEdited(
  current: { description: string; amount: number },
  original: { description: string; amount: number },
): boolean {
  return (
    current.description.trim() !== original.description.trim() ||
    current.amount !== original.amount
  );
}
