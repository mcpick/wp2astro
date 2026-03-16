import { describe, test, expect } from "bun:test";
import { extractColorsFromCSS, extractColorsFromHTML, deduplicateColors } from "./extract-colors.js";

describe("extractColorsFromCSS", () => {
  test("extracts WP preset color vars", () => {
    const css = `:root { --wp--preset--color--primary: #ff5733; --wp--preset--color--secondary: #333333; }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(2);
    expect(colors[0]).toEqual({ name: "primary", value: "#ff5733" });
    expect(colors[1]).toEqual({ name: "secondary", value: "#333333" });
  });

  test("extracts generic CSS custom properties with color values", () => {
    const css = `:root { --accent-color: #00aaff; --font-size: 16px; }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
    expect(colors[0].value).toBe("#00aaff");
  });

  test("extracts rgb color values", () => {
    const css = `:root { --bg: rgb(255, 0, 0); }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
    expect(colors[0].value).toBe("rgb(255, 0, 0)");
  });

  test("extracts body background-color and color", () => {
    const css = `body { background-color: #ffffff; color: #222222; }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(2);
    expect(colors.find(c => c.name === "background")?.value).toBe("#ffffff");
    expect(colors.find(c => c.name === "text")?.value).toBe("#222222");
  });

  test("skips var() references in body declarations", () => {
    const css = `body { background-color: var(--bg); }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(0);
  });

  test("deduplicates same hex values", () => {
    const css = `:root { --a: #fff; --b: #FFF; }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
  });

  test("handles 3-digit hex", () => {
    const css = `:root { --short: #abc; }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
    expect(colors[0].value).toBe("#abc");
  });
});

describe("extractColorsFromHTML", () => {
  test("extracts from inline style blocks", () => {
    const html = `<html><head><style>:root { --wp--preset--color--primary: #ff0000; }</style></head><body></body></html>`;
    const colors = extractColorsFromHTML(html);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toEqual({ name: "primary", value: "#ff0000" });
  });

  test("extracts from multiple style blocks", () => {
    const html = `<html><head>
      <style>:root { --a: #111; }</style>
      <style>:root { --b: #222; }</style>
    </head><body></body></html>`;
    const colors = extractColorsFromHTML(html);
    expect(colors).toHaveLength(2);
  });
});

describe("extractColorsFromCSS edge cases", () => {
  test("extracts many consecutive hex vars without dropping any", () => {
    const css = `:root {
      --a: #111111;
      --b: #222222;
      --c: #333333;
      --d: #444444;
      --e: #555555;
    }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(5);
  });

  test("extracts hsl color values", () => {
    const css = `:root { --brand: hsl(200, 50%, 60%); }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
    expect(colors[0].value).toBe("hsl(200, 50%, 60%)");
  });

  test("extracts rgba color values", () => {
    const css = `:root { --overlay: rgba(0, 0, 0, 0.5); }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
    expect(colors[0].value).toBe("rgba(0, 0, 0, 0.5)");
  });

  test("extracts modern space-separated rgb", () => {
    const css = `:root { --bg: rgb(255 0 0); }`;
    const colors = extractColorsFromCSS(css);
    expect(colors).toHaveLength(1);
  });

  test("returns empty for empty CSS", () => {
    expect(extractColorsFromCSS("")).toHaveLength(0);
  });

  test("returns empty for CSS with no colors", () => {
    expect(extractColorsFromCSS("body { margin: 0; padding: 10px; }")).toHaveLength(0);
  });
});

describe("extractColorsFromHTML edge cases", () => {
  test("returns empty for HTML with no style blocks", () => {
    const html = `<html><head></head><body><p>Hello</p></body></html>`;
    expect(extractColorsFromHTML(html)).toHaveLength(0);
  });
});

describe("deduplicateColors", () => {
  test("removes duplicate values", () => {
    const colors = [
      { name: "primary", value: "#ff0000" },
      { name: "accent", value: "#ff0000" },
      { name: "bg", value: "#ffffff" },
    ];
    const result = deduplicateColors(colors);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("primary");
  });
});
