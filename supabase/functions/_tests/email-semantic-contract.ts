export interface SemanticEmailContract {
  orderedText: string[];
  links: Array<{ text: string; href: string }>;
}

const BLOCK_BOUNDARY_PATTERN =
  /<\/?(?:address|article|aside|blockquote|div|footer|h[1-6]|header|li|main|p|section|td|th|tr)\b[^>]*>/gi;
const TEXT_BOUNDARY = "\u0000";
const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntity(entity: string): string {
  if (entity === "#39" || entity === "apos") return "'";
  if (entity.startsWith("#x")) {
    return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
  }
  if (entity.startsWith("#")) {
    return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
  }

  return HTML_ENTITY_MAP[entity] ?? `&${entity};`;
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (_match, entity) =>
    decodeHtmlEntity(entity.toLowerCase()),
  );
}

function stripNonVisibleSections(value: string): string {
  return value
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

function htmlToTextLines(value: string): string[] {
  return stripNonVisibleSections(value)
    .replace(/<br\b[^>]*>/gi, TEXT_BOUNDARY)
    .replace(BLOCK_BOUNDARY_PATTERN, TEXT_BOUNDARY)
    .replace(/<[^>]+>/g, "")
    .split(TEXT_BOUNDARY)
    .map(normalizeVisibleText)
    .filter(Boolean);
}

export function normalizeVisibleText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

export function extractSemanticContract(html: string): SemanticEmailContract {
  const visibleHtml = stripNonVisibleSections(html);
  const links = Array.from(
    visibleHtml.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi),
    (match) => ({
      href: decodeHtmlEntities(match[2]),
      text: htmlToTextLines(match[3]).join(" "),
    }),
  );

  return {
    orderedText: htmlToTextLines(visibleHtml),
    links,
  };
}
