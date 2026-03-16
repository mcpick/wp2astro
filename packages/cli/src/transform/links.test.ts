import { describe, test, expect } from "bun:test";
import { buildUrlMap, rewriteLinks, generateRedirects } from "./links.js";
import type { WPPost } from "../types.js";

function makePost(overrides: Partial<WPPost>): WPPost {
  return {
    id: 1,
    slug: "test",
    title: "Test",
    content: "",
    excerpt: "",
    date: "2024-01-01",
    modified: "2024-01-01",
    status: "publish",
    type: "post",
    link: "https://example.com/test/",
    categories: [],
    tags: [],
    comments: [],
    featuredImage: undefined,
    ...overrides,
  };
}

describe("buildUrlMap", () => {
  test("maps posts to /blog/slug", () => {
    const posts = [makePost({ slug: "hello", link: "https://example.com/hello/" })];
    const map = buildUrlMap("https://example.com", posts, []);
    expect(map.get("https://example.com/hello/")).toBe("/blog/hello");
  });

  test("maps pages to /slug", () => {
    const pages = [makePost({ slug: "about", link: "https://example.com/about/", type: "page" })];
    const map = buildUrlMap("https://example.com", [], pages);
    expect(map.get("https://example.com/about/")).toBe("/about");
  });

  test("trailing slash variants", () => {
    const posts = [makePost({ slug: "post", link: "https://example.com/post/" })];
    const map = buildUrlMap("https://example.com", posts, []);
    expect(map.get("https://example.com/post/")).toBe("/blog/post");
    expect(map.get("https://example.com/post")).toBe("/blog/post");
  });

  test("home page mapped to /", () => {
    const map = buildUrlMap("https://example.com/", [], []);
    expect(map.get("https://example.com")).toBe("/");
    expect(map.get("https://example.com/")).toBe("/");
  });

  test("maps CPT entries to /restBase/slug", () => {
    const cptPosts = [makePost({ slug: "big-project", link: "https://example.com/project/big-project/", type: "project" })];
    const map = buildUrlMap("https://example.com", [], [], [{ restBase: "project", posts: cptPosts }]);
    expect(map.get("https://example.com/project/big-project/")).toBe("/project/big-project");
    expect(map.get("https://example.com/project/big-project")).toBe("/project/big-project");
  });

  test("maps multiple CPTs", () => {
    const projects = [makePost({ slug: "p1", link: "https://example.com/project/p1/", type: "project" })];
    const events = [makePost({ slug: "e1", link: "https://example.com/events/e1/", type: "event" })];
    const map = buildUrlMap("https://example.com", [], [], [
      { restBase: "project", posts: projects },
      { restBase: "events", posts: events },
    ]);
    expect(map.get("https://example.com/project/p1/")).toBe("/project/p1");
    expect(map.get("https://example.com/events/e1/")).toBe("/events/e1");
  });
});

describe("rewriteLinks", () => {
  test("replaces URLs in markdown", () => {
    const map = new Map([["https://example.com/old/", "/blog/new"]]);
    const result = rewriteLinks("Visit [link](https://example.com/old/) now", map);
    expect(result).toBe("Visit [link](/blog/new) now");
  });

  test("longer URLs replaced first", () => {
    const map = new Map([
      ["https://example.com/", "/"],
      ["https://example.com/about/", "/about"],
    ]);
    const md = "[About](https://example.com/about/)";
    const result = rewriteLinks(md, map);
    expect(result).toBe("[About](/about)");
  });
});

describe("generateRedirects", () => {
  test("generates redirect lines", () => {
    const map = new Map([
      ["https://example.com/old-post/", "/blog/old-post"],
      ["https://example.com/old-post", "/blog/old-post"],
    ]);
    const result = generateRedirects("https://example.com", map);
    expect(result).toContain("/old-post /blog/old-post 301");
  });

  test("skips root path", () => {
    const map = new Map([["https://example.com/", "/"]]);
    const result = generateRedirects("https://example.com", map);
    expect(result).not.toContain("/ / 301");
  });

  test("deduplicates paths", () => {
    const map = new Map([
      ["https://example.com/page/", "/new-page"],
      ["https://example.com/page", "/new-page"],
    ]);
    const result = generateRedirects("https://example.com", map);
    const lines = result.split("\n").filter((l) => l.includes("/page /new-page"));
    expect(lines).toHaveLength(1);
  });
});
