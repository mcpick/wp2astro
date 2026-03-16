import { describe, test, expect } from "bun:test";
import { htmlToMarkdown } from "./html-to-markdown.js";

describe("htmlToMarkdown", () => {
  test("paragraphs", () => {
    const result = htmlToMarkdown("<p>Hello world</p>");
    expect(result).toBe("Hello world");
  });

  test("headings", () => {
    const result = htmlToMarkdown("<h2>Title</h2>");
    expect(result).toBe("## Title");
  });

  test("links", () => {
    const result = htmlToMarkdown('<a href="https://example.com">click</a>');
    expect(result).toBe("[click](https://example.com)");
  });

  test("images", () => {
    const result = htmlToMarkdown('<img src="https://example.com/img.jpg" alt="photo">');
    expect(result).toBe("![photo](https://example.com/img.jpg)");
  });

  test("figures with captions", () => {
    const result = htmlToMarkdown(
      '<figure><img src="a.jpg" alt=""><figcaption>My caption</figcaption></figure>',
    );
    expect(result).toContain("![My caption](a.jpg)");
  });

  test("code blocks with lang", () => {
    const result = htmlToMarkdown('<pre><code class="language-js">const x = 1;</code></pre>');
    expect(result).toContain("```js");
    expect(result).toContain("const x = 1;");
    expect(result).toContain("```");
  });

  test("code blocks without lang", () => {
    const result = htmlToMarkdown("<pre><code>plain code</code></pre>");
    expect(result).toContain("```\nplain code\n```");
  });

  test("Gutenberg comments stripped", () => {
    const result = htmlToMarkdown("<!-- wp:paragraph --><p>text</p><!-- /wp:paragraph -->");
    expect(result).not.toContain("wp:");
    expect(result).toContain("text");
  });

  test("iframes converted to links", () => {
    const result = htmlToMarkdown('<iframe src="https://youtube.com/embed/abc"></iframe>');
    expect(result).toContain("[Embedded content](https://youtube.com/embed/abc)");
  });

  test("excessive blank lines cleaned", () => {
    const result = htmlToMarkdown("<p>a</p>\n\n\n\n\n<p>b</p>");
    expect(result).not.toMatch(/\n{3,}/);
  });
});
