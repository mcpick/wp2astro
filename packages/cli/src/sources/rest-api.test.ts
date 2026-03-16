import { describe, test, expect } from "bun:test";
import { mapPost, decodeHtml, extractMainContent } from "./rest-api.js";

const basePost = {
  id: 1,
  slug: "hello-world",
  title: { rendered: "Hello World" },
  content: { rendered: "<p>Content</p>" },
  excerpt: { rendered: "<p>Excerpt</p>" },
  date: "2024-01-01T00:00:00",
  modified: "2024-01-02T00:00:00",
  status: "publish",
  link: "https://example.com/hello-world",
};

describe("mapPost", () => {
  test("normal embedded data", () => {
    const raw = {
      ...basePost,
      _embedded: {
        "wp:term": [
          [{ id: 1, name: "News", slug: "news" }],
          [{ id: 2, name: "Featured", slug: "featured" }],
        ],
        replies: [
          [{ id: 10, author_name: "Alice", date: "2024-01-03T00:00:00", content: { rendered: "Nice!" }, parent: 0 }],
        ],
        "wp:featuredmedia": [
          { id: 5, source_url: "https://example.com/img.jpg", alt_text: "Hero", media_details: { width: 800, height: 600 }, mime_type: "image/jpeg" },
        ],
      },
    };

    const post = mapPost(raw, "post");
    expect(post.categories).toEqual([{ id: 1, name: "News", slug: "news" }]);
    expect(post.tags).toEqual([{ id: 2, name: "Featured", slug: "featured" }]);
    expect(post.comments).toEqual([{ id: 10, author: "Alice", date: "2024-01-03T00:00:00", content: "Nice!", parent: 0 }]);
    expect(post.featuredImage).toEqual({ id: 5, url: "https://example.com/img.jpg", alt: "Hero", width: 800, height: 600, mimeType: "image/jpeg" });
  });

  test("replies[0] is non-array object — original crash", () => {
    const raw = {
      ...basePost,
      _embedded: { replies: [{ code: "rest_no_route" }] },
    };
    const post = mapPost(raw, "post");
    expect(post.comments).toEqual([]);
  });

  test("replies[0] is null", () => {
    const raw = {
      ...basePost,
      _embedded: { replies: [null] },
    };
    const post = mapPost(raw, "post");
    expect(post.comments).toEqual([]);
  });

  test("wp:term[0] is non-array", () => {
    const raw = {
      ...basePost,
      _embedded: { "wp:term": [{ code: "rest_no_route" }, [{ id: 1, name: "Tag", slug: "tag" }]] },
    };
    const post = mapPost(raw, "post");
    expect(post.categories).toEqual([]);
    expect(post.tags).toEqual([{ id: 1, name: "Tag", slug: "tag" }]);
  });

  test("no _embedded at all", () => {
    const post = mapPost({ ...basePost }, "post");
    expect(post.categories).toEqual([]);
    expect(post.tags).toEqual([]);
    expect(post.comments).toEqual([]);
    expect(post.featuredImage).toBeUndefined();
  });

  test("empty _embedded", () => {
    const post = mapPost({ ...basePost, _embedded: {} }, "page");
    expect(post.type).toBe("page");
    expect(post.categories).toEqual([]);
    expect(post.tags).toEqual([]);
    expect(post.comments).toEqual([]);
    expect(post.featuredImage).toBeUndefined();
  });

  test("featured media present", () => {
    const raw = {
      ...basePost,
      _embedded: {
        "wp:featuredmedia": [
          { id: 3, source_url: "https://example.com/photo.png", alt_text: "Alt", media_details: { width: 1920, height: 1080 }, mime_type: "image/png" },
        ],
      },
    };
    const post = mapPost(raw, "post");
    expect(post.featuredImage).toEqual({ id: 3, url: "https://example.com/photo.png", alt: "Alt", width: 1920, height: 1080, mimeType: "image/png" });
  });

  test("featured media absent", () => {
    const post = mapPost({ ...basePost, _embedded: { "wp:featuredmedia": [] } }, "post");
    expect(post.featuredImage).toBeUndefined();
  });
});

describe("decodeHtml", () => {
  test("decodes numeric entities", () => {
    expect(decodeHtml("&#8217;")).toBe("\u2019");
  });

  test("decodes hex entities", () => {
    expect(decodeHtml("&#x2019;")).toBe("\u2019");
  });

  test("decodes named entities", () => {
    expect(decodeHtml("&amp; &lt; &gt; &quot; &#039; &apos;")).toBe('& < > " \' \'');
  });

  test("title with HTML entities", () => {
    const raw = {
      ...basePost,
      title: { rendered: "Tom&#8217;s &amp; Jerry&#039;s" },
    };
    const post = mapPost(raw, "post");
    expect(post.title).toBe("Tom\u2019s & Jerry's");
  });
});

describe("extractMainContent", () => {
  test(".entry-content returns innerHTML", () => {
    const html = `<html><body><div class="entry-content"><p>Hello</p></div></body></html>`;
    expect(extractMainContent(html)).toBe("<p>Hello</p>");
  });

  test("article fallback", () => {
    const html = `<html><body><article><p>Article content</p></article></body></html>`;
    expect(extractMainContent(html)).toBe("<p>Article content</p>");
  });

  test("nested .entry-content inside layout wrappers", () => {
    const html = `<html><body><div class="site"><div class="wrapper"><div class="entry-content"><h2>Nested</h2><p>Text</p></div></div></div></body></html>`;
    expect(extractMainContent(html)).toBe("<h2>Nested</h2><p>Text</p>");
  });

  test("no matching content returns null", () => {
    const html = `<html><body><div class="sidebar">Sidebar</div></body></html>`;
    expect(extractMainContent(html)).toBeNull();
  });

  test("empty matching element returns null", () => {
    const html = `<html><body><div class="entry-content">   </div></body></html>`;
    expect(extractMainContent(html)).toBeNull();
  });

  test("prefers .entry-content over article", () => {
    const html = `<html><body><article><div class="entry-content"><p>Preferred</p></div><p>Other</p></article></body></html>`;
    expect(extractMainContent(html)).toBe("<p>Preferred</p>");
  });

  // annasiebert.com.au pattern — Goodlayers page builder (kleanity theme)
  // article matches but contains only empty wrapper divs, should fall through
  // to .gdlr-core-page-builder-body which has actual content
  test("Goodlayers: skips article with empty wrappers, matches gdlr-core", () => {
    const html = `<html><body>
      <div class="kleanity-content-area">
        <article id="post-512" class="post type-post">
          <div class="kleanity-single-article">
            <div class="kleanity-single-article-content"></div>
          </div>
        </article>
      </div>
      <div class="gdlr-core-page-builder-body">
        <div class="gdlr-core-pbf-element">
          <div class="gdlr-core-text-box-item">
            <div class="gdlr-core-text-box-item-content">
              <p>I had my eldest daughter before I became a doula</p>
              <h2>You Matter</h2>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;
    const result = extractMainContent(html);
    expect(result).toContain("I had my eldest daughter");
    expect(result).toContain("<h2>You Matter</h2>");
  });

  // bigreddog.com.au pattern — Elementor with no .entry-content, .wp-site-blocks root
  test("Elementor page with no .entry-content (wp-site-blocks root)", () => {
    const html = `<html><body>
      <div class="wp-site-blocks">
        <header class="sticky-header-fixed-dark"><nav></nav></header>
        <div data-elementor-type="wp-post" class="elementor elementor-768">
          <div class="elementor-section elementor-top-section">
            <div class="elementor-container">
              <div class="elementor-column">
                <div class="elementor-widget elementor-widget-text-editor">
                  <div class="elementor-widget-container"><p>Big red dog content</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`;
    const result = extractMainContent(html);
    expect(result).toContain("Big red dog content");
  });

  // Elementor text-editor widget without .entry-content or data-elementor-type
  test("Elementor widget-text-editor standalone", () => {
    const html = `<html><body>
      <div class="elementor">
        <div class="e-con e-parent">
          <div class="elementor-widget elementor-widget-text-editor">
            <div class="elementor-widget-container"><p>Widget text</p></div>
          </div>
        </div>
      </div>
    </body></html>`;
    const result = extractMainContent(html);
    expect(result).toContain("Widget text");
  });

  // Empty wrapper divs in .entry-content fall through to page builder selectors
  test("empty .entry-content falls through to Elementor selectors", () => {
    const html = `<html><body>
      <div class="entry-content"><div class="empty-wrapper"></div></div>
      <div data-elementor-type="wp-post" class="elementor">
        <div class="e-con e-parent">
          <div class="elementor-widget elementor-widget-text-editor">
            <div class="elementor-widget-container"><p>Fallthrough content</p></div>
          </div>
        </div>
      </div>
    </body></html>`;
    const result = extractMainContent(html);
    expect(result).toContain("Fallthrough content");
  });

  // Element with only HTML tags but no text content should be skipped
  test("skips elements with HTML structure but no text", () => {
    const html = `<html><body>
      <article><div class="wrapper"><div class="inner"></div></div></article>
      <main><p>Real content here</p></main>
    </body></html>`;
    const result = extractMainContent(html);
    expect(result).toContain("Real content here");
  });
});
