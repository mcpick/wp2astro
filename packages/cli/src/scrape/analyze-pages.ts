import { parse } from "node-html-parser";
import type { PageSummary } from "../types.js";
import { extractLayoutFromHTML } from "./extract-layout.js";

export function classifyPage(
  html: string,
  url: string,
  title: string,
  isHomepage: boolean,
): PageSummary {
  const root = parse(html);
  const layout = extractLayoutFromHTML(html);

  if (isHomepage) {
    const hasPostList = !!(
      root.querySelector("article.post") ??
      root.querySelector(".post-list") ??
      root.querySelector(".blog-posts") ??
      root.querySelector(".hentry")
    );
    return {
      type: hasPostList ? "blog-listing" : "landing",
      url,
      title,
      hasHero: layout.hasHero,
      hasSidebar: layout.hasSidebar,
    };
  }

  return {
    type: "single-page",
    url,
    title,
    hasHero: layout.hasHero,
    hasSidebar: layout.hasSidebar,
  };
}

export function classifyPostPage(html: string, url: string, title: string): PageSummary {
  const layout = extractLayoutFromHTML(html);
  return {
    type: "single-post",
    url,
    title,
    hasHero: layout.hasHero,
    hasSidebar: layout.hasSidebar,
  };
}

export function classifyBlogListing(html: string, url: string): PageSummary {
  const layout = extractLayoutFromHTML(html);
  return {
    type: "blog-listing",
    url,
    title: "Blog",
    hasHero: layout.hasHero,
    hasSidebar: layout.hasSidebar,
  };
}
