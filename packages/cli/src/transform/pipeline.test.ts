import { describe, test, expect } from "bun:test";
import { transformPosts } from "./pipeline.js";
import type { WPPost, WPMedia, ConvertError } from "../types.js";

function makePost(overrides: Partial<WPPost> = {}): WPPost {
  return {
    id: 1,
    slug: "test-post",
    title: "Test Post",
    content: "<p>Hello world</p>",
    excerpt: "<p>A short excerpt</p>",
    date: "2024-01-15",
    modified: "2024-01-15",
    status: "publish",
    type: "post",
    link: "https://example.com/test-post/",
    categories: [{ id: 1, name: "Tech", slug: "tech" }],
    tags: [{ id: 1, name: "javascript", slug: "javascript" }],
    comments: [],
    featuredImage: undefined,
    ...overrides,
  };
}

describe("transformPosts", () => {
  test("single post end-to-end", () => {
    const urlMap = new Map<string, string>();
    const errors: ConvertError[] = [];
    const { content } = transformPosts([makePost()], urlMap, errors);

    expect(content).toHaveLength(1);
    expect(content[0].slug).toBe("test-post");
    expect(content[0].type).toBe("post");
    expect(content[0].markdown).toContain("Hello world");
    expect(errors).toHaveLength(0);
  });

  test("frontmatter fields", () => {
    const { content } = transformPosts([makePost()], new Map(), []);
    const fm = content[0].frontmatter;

    expect(fm.title).toBe("Test Post");
    expect(fm.date).toBe("2024-01-15");
    expect(fm.slug).toBe("test-post");
  });

  test("excerpt HTML stripped", () => {
    const { content } = transformPosts(
      [makePost({ excerpt: "<p>Some <strong>bold</strong> text</p>" })],
      new Map(),
      [],
    );
    expect(content[0].frontmatter.description).toBe("Some bold text");
  });

  test("featured image included", () => {
    const post = makePost({
      featuredImage: { id: 1, url: "https://example.com/hero.jpg", alt: "Hero", width: 800, height: 600, mimeType: "image/jpeg" },
    });
    const { content } = transformPosts([post], new Map(), []);
    expect(content[0].frontmatter.heroImage).toBe("https://example.com/hero.jpg");
    expect(content[0].frontmatter.heroImageAlt).toBe("Hero");
  });

  test("categories and tags", () => {
    const { content } = transformPosts([makePost()], new Map(), []);
    expect(content[0].frontmatter.categories).toEqual(["Tech"]);
    expect(content[0].frontmatter.tags).toEqual(["javascript"]);
  });

  test("lastModified set when different from date", () => {
    const post = makePost({ date: "2024-01-15", modified: "2024-02-01" });
    const { content } = transformPosts([post], new Map(), []);
    expect(content[0].frontmatter.lastModified).toBe("2024-02-01");
  });

  test("lastModified omitted when same as date", () => {
    const { content } = transformPosts([makePost()], new Map(), []);
    expect(content[0].frontmatter.lastModified).toBeUndefined();
  });

  test("error collection on bad post", () => {
    const errors: ConvertError[] = [];
    // Force an error by passing a post with content that will throw
    const badPost = makePost({ content: null as any });
    const { content } = transformPosts([badPost], new Map(), errors);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].phase).toBe("transform");
    expect(errors[0].item).toBe("test-post");
  });

  test("string error handled gracefully", () => {
    const errors: ConvertError[] = [];
    // A post with content that causes processShortcodes to receive non-string
    const badPost = makePost({ content: undefined as any });
    transformPosts([badPost], new Map(), errors);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toBeDefined();
    expect(errors[0].message).not.toBe("undefined");
  });

  test("empty array", () => {
    const { content, imageUrls } = transformPosts([], new Map(), []);
    expect(content).toEqual([]);
    expect(imageUrls).toEqual([]);
  });

  test("collects image URLs", () => {
    const post = makePost({ content: '<p><img src="https://example.com/photo.jpg"></p>' });
    const { imageUrls } = transformPosts([post], new Map(), []);
    expect(imageUrls).toContain("https://example.com/photo.jpg");
  });

  test("deduplicates image URLs", () => {
    const post1 = makePost({ slug: "p1", content: '<p><img src="https://example.com/photo.jpg"></p>' });
    const post2 = makePost({ slug: "p2", content: '<p><img src="https://example.com/photo.jpg"></p>' });
    const { imageUrls } = transformPosts([post1, post2], new Map(), []);
    expect(imageUrls).toHaveLength(1);
  });

  test("featured image URL included in imageUrls", () => {
    const post = makePost({
      content: "<p>No images in content</p>",
      featuredImage: { id: 1, url: "https://example.com/hero.jpg", alt: "Hero", width: 800, height: 600, mimeType: "image/jpeg" },
    });
    const { imageUrls } = transformPosts([post], new Map(), []);
    expect(imageUrls).toContain("https://example.com/hero.jpg");
  });

  test("gallery markers resolved to img tags with mediaMap", () => {
    const post = makePost({ content: '<p>before</p><!-- wp-gallery:10,20 --><p>after</p>' });
    const mediaMap = new Map<number, WPMedia>([
      [10, { id: 10, url: "https://example.com/a.jpg", alt: "A", width: 800, height: 600, mimeType: "image/jpeg" }],
      [20, { id: 20, url: "https://example.com/b.jpg", alt: "B", width: 800, height: 600, mimeType: "image/jpeg" }],
    ]);
    const { content, imageUrls } = transformPosts([post], new Map(), [], mediaMap);
    expect(content[0].markdown).toContain("a.jpg");
    expect(content[0].markdown).toContain("b.jpg");
    expect(imageUrls).toContain("https://example.com/a.jpg");
    expect(imageUrls).toContain("https://example.com/b.jpg");
  });

  test("gallery markers left as-is without mediaMap", () => {
    const post = makePost({ content: '<p>text</p><!-- wp-gallery:10,20 -->' });
    const { content } = transformPosts([post], new Map(), []);
    // Without mediaMap, markers pass through (may be stripped by HTML→markdown)
    expect(content[0].markdown).not.toContain("img");
  });
});
