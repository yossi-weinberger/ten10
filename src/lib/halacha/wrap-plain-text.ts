export function stripPrintMarkup(text: string): string {
  return text
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
}

export function wrapPlainText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  const appendLongToken = (token: string) => {
    let rest = token;
    while (rest && measure(rest) > maxWidth) {
      let cut = rest.length;
      while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) {
        cut -= 1;
      }
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  };

  for (const word of normalized.split(" ")) {
    const trial = current ? `${current} ${word}` : word;
    if (measure(trial) <= maxWidth) {
      current = trial;
      continue;
    }
    flush();
    if (measure(word) <= maxWidth) {
      current = word;
    } else {
      appendLongToken(word);
    }
  }
  flush();
  return lines;
}
