import { describe, test, expect } from "bun:test";
import { contentConfig, cptSlugPage } from "./templates.js";

describe("contentConfig", () => {
  test("no CPTs — same as before", () => {
    const result = contentConfig();
    expect(result).toContain('const posts = defineCollection');
    expect(result).toContain('const pages = defineCollection');
    expect(result).toContain('export const collections = { posts, pages }');
    expect(result).not.toContain('portfolio');
  });

  test("adds CPT collections", () => {
    const result = contentConfig(["portfolio", "testimonials"]);
    expect(result).toContain('./src/content/portfolio');
    expect(result).toContain('./src/content/testimonials');
    expect(result).toContain('portfolio');
    expect(result).toContain('testimonials');
  });

  test("handles hyphenated restBase as valid JS", () => {
    const result = contentConfig(["my-portfolio"]);
    expect(result).toContain('const myPortfolio = defineCollection');
    expect(result).toContain('./src/content/my-portfolio');
    expect(result).toContain('"my-portfolio": myPortfolio');
  });
});

describe("cptSlugPage", () => {
  test("generates correct collection name", () => {
    const result = cptSlugPage("portfolio");
    expect(result).toContain('getCollection("portfolio")');
    expect(result).toContain('render(item)');
    expect(result).toContain('item.data.title');
  });
});
