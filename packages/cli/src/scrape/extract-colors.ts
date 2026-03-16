import { parse } from "node-html-parser";

const WP_COLOR_NAMES: Record<string, string> = {
  primary: "primary",
  secondary: "secondary",
  accent: "accent",
  background: "background",
  foreground: "foreground",
  base: "background",
  contrast: "foreground",
  "tertiary": "accent",
  "vivid-cyan-blue": "accent",
  "luminous-vivid-amber": "warning",
  "luminous-vivid-orange": "warning",
  "vivid-red": "danger",
  "vivid-green-cyan": "success",
};

const HEX_RE = /#(?:[0-9a-f]{3,4}){1,2}\b/i;
const RGB_RE = /rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+(?:[\s,/]+[\d.]+)?\s*\)/i;
const HSL_RE = /hsla?\(\s*[\d.]+[\s,]+[\d.]+%?[\s,]+[\d.]+%?(?:[\s,/]+[\d.]+)?\s*\)/i;

interface ColorEntry {
  name: string;
  value: string;
}

export function extractColorsFromCSS(css: string): ColorEntry[] {
  const colors: ColorEntry[] = [];
  const seen = new Set<string>();

  // Extract CSS custom properties with color values
  const varRe = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+)/g;
  for (const match of css.matchAll(varRe)) {
    const varName = match[1];
    const value = match[2].trim();
    if (!looksLikeColor(value)) continue;
    const name = resolveColorName(varName);
    const normalized = normalizeColor(value);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      colors.push({ name, value: normalized });
    }
  }

  // Extract direct color declarations on body/:root
  const blockRe = /(?::root|body)\s*\{([^}]+)\}/g;
  for (const block of css.matchAll(blockRe)) {
    const declRe = /(background-color|color)\s*:\s*([^;]+)/g;
    for (const decl of block[1].matchAll(declRe)) {
      const prop = decl[1];
      const value = decl[2].trim();
      if (value.startsWith("var(")) continue;
      const normalized = normalizeColor(value);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        const name = prop === "background-color" ? "background" : "text";
        colors.push({ name, value: normalized });
      }
    }
  }

  return colors;
}

export function extractColorsFromHTML(html: string): ColorEntry[] {
  const root = parse(html);
  const allCSS: string[] = [];

  // Inline <style> blocks
  for (const style of root.querySelectorAll("style")) {
    allCSS.push(style.textContent);
  }

  return extractColorsFromCSS(allCSS.join("\n"));
}

export async function fetchStylesheetColors(
  html: string,
  baseUrl: string,
): Promise<ColorEntry[]> {
  const root = parse(html);
  const links = root.querySelectorAll('link[rel="stylesheet"]');
  const colors: ColorEntry[] = [];
  let fetched = 0;

  for (const link of links) {
    if (fetched >= 3) break;
    const href = link.getAttribute("href");
    if (!href) continue;

    const url = href.startsWith("http") ? href : new URL(href, baseUrl).href;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > 500_000) continue;

      const css = await res.text();
      if (css.length > 500_000) continue;

      colors.push(...extractColorsFromCSS(css));
      fetched++;
    } catch {
      continue;
    }
  }

  return colors;
}

export function deduplicateColors(colors: ColorEntry[]): ColorEntry[] {
  const seen = new Set<string>();
  const result: ColorEntry[] = [];
  for (const c of colors) {
    if (!seen.has(c.value)) {
      seen.add(c.value);
      result.push(c);
    }
  }
  return result;
}

function resolveColorName(varName: string): string {
  // WP preset pattern: --wp--preset--color--{name}
  const wpMatch = varName.match(/--wp--preset--color--(.+)/);
  if (wpMatch) {
    const slug = wpMatch[1];
    return WP_COLOR_NAMES[slug] ?? slug.replace(/-/g, " ");
  }

  // Generic: try to match known names
  const lower = varName.toLowerCase();
  for (const [key, name] of Object.entries(WP_COLOR_NAMES)) {
    if (lower.includes(key)) return name;
  }

  return varName.replace(/^-+/, "").replace(/-/g, " ");
}

function looksLikeColor(value: string): boolean {
  return HEX_RE.test(value) || RGB_RE.test(value) || HSL_RE.test(value);
}

function normalizeColor(value: string): string | null {
  const hex = value.match(HEX_RE);
  if (hex) return hex[0].toLowerCase();

  const rgb = value.match(RGB_RE);
  if (rgb) return rgb[0];

  const hsl = value.match(HSL_RE);
  if (hsl) return hsl[0];

  return null;
}
