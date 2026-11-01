const PREFIXES = new Set(["ו", "ב", "ל", "ה", "ש", "כ"]);

/** The saved name stands as its own word, or with one prefix ו ב ל ה ש כ. Not a piece of a longer word. */
export function ruleNameStands(text: string, name: string): boolean {
  const wanted = name.trim();
  if (wanted.length < 2) return false;
  const tokens = text.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0);
  return tokens.some((token) => {
    if (token === wanted) return true;
    return token.length === wanted.length + 1
      && PREFIXES.has(token[0] ?? "")
      && token.slice(1) === wanted;
  });
}
