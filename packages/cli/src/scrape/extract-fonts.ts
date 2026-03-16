import { parse } from "node-html-parser";

interface FontEntry {
  family: string;
  url?: string;
  fontsource?: string;
}

const FONTSOURCE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function extractFontsFromHTML(html: string): FontEntry[] {
  const root = parse(html);
  const fonts: FontEntry[] = [];
  const seen = new Set<string>();

  // Google Fonts <link> tags
  for (const link of root.querySelectorAll("link")) {
    const href = link.getAttribute("href") ?? "";
    if (!href.includes("fonts.googleapis.com") && !href.includes("fonts.gstatic.com")) continue;

    const families = parseGoogleFontsUrl(href);
    for (const family of families) {
      const key = family.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fonts.push({
        family,
        url: href,
        fontsource: toFontsourcePackage(family),
      });
    }
  }

  // @font-face in <style> blocks
  for (const style of root.querySelectorAll("style")) {
    const css = style.textContent;
    for (const font of extractFontFaces(css)) {
      const key = font.family.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      fonts.push(font);
    }
  }

  // font-family on body/headings
  const bodyFonts = extractFontFamilyDeclarations(root.querySelectorAll("style").map(s => s.textContent).join("\n"));
  for (const family of bodyFonts) {
    const key = family.toLowerCase();
    if (seen.has(key)) continue;
    if (isGenericFamily(family)) continue;
    seen.add(key);
    fonts.push({
      family,
      fontsource: toFontsourcePackage(family),
    });
  }

  return fonts;
}

export function parseGoogleFontsUrl(url: string): string[] {
  const families: string[] = [];

  // Detect API version: css2 uses multiple family= params, legacy uses pipe-separated
  const isCss2 = url.includes("/css2?") || url.includes("/css2&");

  if (isCss2) {
    // CSS2 API: family=Font+Name:wght@400;700
    const css2Re = /family=([^&:]+)/g;
    for (const match of url.matchAll(css2Re)) {
      const name = decodeURIComponent(match[1]).replace(/\+/g, " ");
      if (name && !families.includes(name)) families.push(name);
    }
  } else {
    // Legacy API: family=Font+Name:400,700|Other+Font:300
    const legacyMatch = url.match(/family=([^&]+)/);
    if (legacyMatch) {
      const raw = decodeURIComponent(legacyMatch[1]);
      for (const part of raw.split("|")) {
        const name = part.split(":")[0].replace(/\+/g, " ").trim();
        if (name && !families.includes(name)) families.push(name);
      }
    }
  }

  return families;
}

export function extractFontFaces(css: string): FontEntry[] {
  const fonts: FontEntry[] = [];
  const faceRe = /@font-face\s*\{([^}]+)\}/g;

  for (const match of css.matchAll(faceRe)) {
    const block = match[1];
    const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)/);
    const srcMatch = block.match(/src\s*:\s*([^;]+)/);

    if (familyMatch) {
      const family = familyMatch[1].trim();
      const urlMatch = srcMatch?.[1]?.match(/url\(['"]?([^'")]+)/);
      fonts.push({
        family,
        url: urlMatch?.[1],
        fontsource: toFontsourcePackage(family),
      });
    }
  }

  return fonts;
}

export function extractFontFamilyDeclarations(css: string): string[] {
  const families: string[] = [];
  // Match font-family on body, html, h1-h6
  const blockRe = /(?:body|html|h[1-6])\s*(?:,\s*(?:body|html|h[1-6])\s*)*\{([^}]+)\}/g;
  for (const block of css.matchAll(blockRe)) {
    const familyMatch = block[1].match(/font-family\s*:\s*([^;]+)/);
    if (familyMatch) {
      const parts = familyMatch[1].split(",").map(s => s.trim().replace(/^['"]|['"]$/g, ""));
      for (const part of parts) {
        if (part && !families.includes(part)) families.push(part);
      }
    }
  }
  return families;
}

export function toFontsourcePackage(family: string): string | undefined {
  const slug = family.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug || !FONTSOURCE_SLUG_RE.test(slug)) return undefined;
  return `@fontsource/${slug}`;
}

function isGenericFamily(family: string): boolean {
  const generics = new Set([
    "serif", "sans-serif", "monospace", "cursive", "fantasy",
    "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
    "emoji", "math", "fangsong",
    "-apple-system", "blinkmacsystemfont", "segoe ui",
  ]);
  return generics.has(family.toLowerCase());
}
