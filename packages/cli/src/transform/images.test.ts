import { describe, test, expect } from "bun:test";
import { extractImageUrls, rewriteImageUrls } from "./images.js";

describe("extractImageUrls", () => {
  test("markdown images", () => {
    const md = "![alt](https://example.com/a.jpg)\n![](https://example.com/b.png)";
    const urls = extractImageUrls(md);
    expect(urls).toContain("https://example.com/a.jpg");
    expect(urls).toContain("https://example.com/b.png");
  });

  test("HTML images", () => {
    const md = '<img src="https://example.com/c.jpg" alt="x">';
    const urls = extractImageUrls(md);
    expect(urls).toEqual(["https://example.com/c.jpg"]);
  });

  test("mixed markdown and HTML images", () => {
    const md = '![a](https://a.com/1.jpg)\n<img src="https://b.com/2.jpg">';
    const urls = extractImageUrls(md);
    expect(urls).toHaveLength(2);
  });

  test("deduplicates URLs", () => {
    const md = "![a](https://example.com/a.jpg)\n![b](https://example.com/a.jpg)";
    const urls = extractImageUrls(md);
    expect(urls).toHaveLength(1);
  });

  test("filters non-http URLs", () => {
    const md = "![a](data:image/png;base64,abc)\n![b](/local/img.jpg)\n![c](https://example.com/d.jpg)";
    const urls = extractImageUrls(md);
    expect(urls).toEqual(["https://example.com/d.jpg"]);
  });

  test("empty content returns empty array", () => {
    expect(extractImageUrls("")).toEqual([]);
    expect(extractImageUrls("no images here")).toEqual([]);
  });
});

describe("rewriteImageUrls", () => {
  test("replaces all occurrences", () => {
    const md = "![a](https://example.com/a.jpg) and again ![b](https://example.com/a.jpg)";
    const result = rewriteImageUrls(md, [
      { originalUrl: "https://example.com/a.jpg", localPath: "/images/a.jpg", filename: "a.jpg" },
    ]);
    expect(result).toBe("![a](/images/a.jpg) and again ![b](/images/a.jpg)");
  });

  test("handles multiple images", () => {
    const md = "![a](https://a.com/1.jpg) ![b](https://b.com/2.jpg)";
    const result = rewriteImageUrls(md, [
      { originalUrl: "https://a.com/1.jpg", localPath: "/images/h1_1.jpg", filename: "h1_1.jpg" },
      { originalUrl: "https://b.com/2.jpg", localPath: "/images/h2_2.jpg", filename: "h2_2.jpg" },
    ]);
    expect(result).toContain("/images/h1_1.jpg");
    expect(result).toContain("/images/h2_2.jpg");
  });

  test("no images returns unchanged", () => {
    const md = "no images here";
    expect(rewriteImageUrls(md, [])).toBe(md);
  });
});
