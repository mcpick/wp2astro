/**
 * Minimal YAML serializer for frontmatter. Handles strings, numbers, booleans,
 * dates, arrays of strings, and null/undefined (omitted).
 */
export function serializeFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${yamlString(String(item))}`);
      }
    } else if (value instanceof Date) {
      lines.push(`${key}: ${value.toISOString()}`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlString(String(value))}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

function yamlString(s: string): string {
  // If string contains special chars, quote it
  if (
    s === "" ||
    s.includes(":") ||
    s.includes("#") ||
    s.includes('"') ||
    s.includes("'") ||
    s.includes("\n") ||
    s.startsWith(" ") ||
    s.startsWith("[") ||
    s.startsWith("{") ||
    /^(true|false|null|yes|no|\d+)$/i.test(s)
  ) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return s;
}
