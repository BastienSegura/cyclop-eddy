import type { ParsedConceptLine } from "./types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseEdgeList(raw: string): ParsedConceptLine[] {
  const lines = raw.split(/\r?\n/);
  const parsed: ParsedConceptLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(":")) {
      continue;
    }

    const [prefixRaw, childRaw] = trimmed.split(":", 2);
    const pathPrefix = normalizeWhitespace(prefixRaw ?? "");
    const childLabel = normalizeWhitespace(childRaw ?? "");

    if (!pathPrefix || !childLabel) {
      continue;
    }

    parsed.push({ pathPrefix, childLabel });
  }

  return parsed;
}
