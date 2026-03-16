import { describe, test, expect } from "bun:test";
import {
  extractFontsFromHTML,
  parseGoogleFontsUrl,
  extractFontFaces,
  extractFontFamilyDeclarations,
  toFontsourcePackage,
} from "./extract-fonts.js";

describe("parseGoogleFontsUrl", () => {
  test("CSS2 API single family", () => {
    const url = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap";
    expect(parseGoogleFontsUrl(url)).toEqual(["Roboto"]);
  });

  test("CSS2 API multiple families", () => {
    const url = "https://fonts.googleapis.com/css2?family=Roboto:wght@400&family=Open+Sans:wght@300&display=swap";
    expect(parseGoogleFontsUrl(url)).toEqual(["Roboto", "Open Sans"]);
  });

  test("legacy API pipe-separated", () => {
    const url = "https://fonts.googleapis.com/css?family=Roboto:400,700|Lato:300";
    expect(parseGoogleFontsUrl(url)).toEqual(["Roboto", "Lato"]);
  });

  test("handles encoded plus signs", () => {
    const url = "https://fonts.googleapis.com/css2?family=Open+Sans&display=swap";
    expect(parseGoogleFontsUrl(url)).toEqual(["Open Sans"]);
  });
});

describe("extractFontFaces", () => {
  test("extracts family and URL from @font-face", () => {
    const css = `@font-face { font-family: 'CustomFont'; src: url('/fonts/custom.woff2') format('woff2'); }`;
    const fonts = extractFontFaces(css);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].family).toBe("CustomFont");
    expect(fonts[0].url).toBe("/fonts/custom.woff2");
  });

  test("extracts multiple font faces", () => {
    const css = `
      @font-face { font-family: "FontA"; src: url(a.woff2); }
      @font-face { font-family: "FontB"; src: url(b.woff2); }
    `;
    const fonts = extractFontFaces(css);
    expect(fonts).toHaveLength(2);
  });
});

describe("extractFontFamilyDeclarations", () => {
  test("extracts body font-family", () => {
    const css = `body { font-family: 'Roboto', sans-serif; }`;
    const families = extractFontFamilyDeclarations(css);
    expect(families).toContain("Roboto");
    expect(families).toContain("sans-serif");
  });

  test("extracts heading font-family", () => {
    const css = `h1 { font-family: "Playfair Display", serif; }`;
    const families = extractFontFamilyDeclarations(css);
    expect(families).toContain("Playfair Display");
  });
});

describe("extractFontsFromHTML", () => {
  test("extracts Google Fonts from link tag", () => {
    const html = `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"></head><body></body></html>`;
    const fonts = extractFontsFromHTML(html);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].family).toBe("Inter");
    expect(fonts[0].fontsource).toBe("@fontsource/inter");
  });

  test("extracts @font-face from style block", () => {
    const html = `<html><head><style>@font-face { font-family: 'MyFont'; src: url(/f.woff2); }</style></head><body></body></html>`;
    const fonts = extractFontsFromHTML(html);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].family).toBe("MyFont");
  });

  test("deduplicates across sources", () => {
    const html = `<html><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto&display=swap">
      <style>@font-face { font-family: 'Roboto'; src: url(r.woff2); }</style>
    </head><body></body></html>`;
    const fonts = extractFontsFromHTML(html);
    expect(fonts).toHaveLength(1);
  });

  test("skips generic font families from declarations", () => {
    const html = `<html><head><style>body { font-family: sans-serif; }</style></head><body></body></html>`;
    const fonts = extractFontsFromHTML(html);
    expect(fonts).toHaveLength(0);
  });
});

describe("toFontsourcePackage", () => {
  test("converts family to fontsource package name", () => {
    expect(toFontsourcePackage("Inter")).toBe("@fontsource/inter");
    expect(toFontsourcePackage("Open Sans")).toBe("@fontsource/open-sans");
    expect(toFontsourcePackage("Playfair Display")).toBe("@fontsource/playfair-display");
  });

  test("returns undefined for empty string", () => {
    expect(toFontsourcePackage("")).toBeUndefined();
  });
});

describe("extractFontsFromHTML edge cases", () => {
  test("returns empty for HTML with no fonts", () => {
    const html = `<html><head></head><body>Hello</body></html>`;
    expect(extractFontsFromHTML(html)).toHaveLength(0);
  });

  test("filters BlinkMacSystemFont as generic", () => {
    const html = `<html><head><style>body { font-family: BlinkMacSystemFont, sans-serif; }</style></head><body></body></html>`;
    expect(extractFontsFromHTML(html)).toHaveLength(0);
  });
});
