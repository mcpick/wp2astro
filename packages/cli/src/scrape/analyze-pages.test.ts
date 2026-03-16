import { describe, test, expect } from "bun:test";
import { classifyPage, classifyPostPage, classifyBlogListing } from "./analyze-pages.js";

describe("classifyPage", () => {
  test("homepage with post list → blog-listing", () => {
    const html = `<html><body><main><article class="post">Post 1</article></main></body></html>`;
    const page = classifyPage(html, "https://example.com", "Home", true);
    expect(page.type).toBe("blog-listing");
    expect(page.url).toBe("https://example.com");
  });

  test("homepage without post list → landing", () => {
    const html = `<html><body><div class="hero-section"><h1>Welcome</h1></div><main>Content</main></body></html>`;
    const page = classifyPage(html, "https://example.com", "Home", true);
    expect(page.type).toBe("landing");
    expect(page.hasHero).toBe(true);
  });

  test("non-homepage → single-page", () => {
    const html = `<html><body><main><article>About us</article></main></body></html>`;
    const page = classifyPage(html, "https://example.com/about", "About", false);
    expect(page.type).toBe("single-page");
    expect(page.title).toBe("About");
  });

  test("passes through sidebar detection", () => {
    const html = `<html><body><div><main>Content</main><aside>Sidebar</aside></div></body></html>`;
    const page = classifyPage(html, "/", "Home", true);
    expect(page.hasSidebar).toBe(true);
  });
});

describe("classifyPostPage", () => {
  test("returns single-post type", () => {
    const html = `<html><body><main><article>Post content</article></main></body></html>`;
    const page = classifyPostPage(html, "https://example.com/hello", "Hello World");
    expect(page.type).toBe("single-post");
    expect(page.title).toBe("Hello World");
  });
});

describe("classifyBlogListing", () => {
  test("returns blog-listing type", () => {
    const html = `<html><body><main>Posts here</main></body></html>`;
    const page = classifyBlogListing(html, "https://example.com/blog/");
    expect(page.type).toBe("blog-listing");
    expect(page.title).toBe("Blog");
  });
});
