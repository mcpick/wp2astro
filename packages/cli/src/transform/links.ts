import type { WPPost } from "../types.js";

/**
 * Build a map from old WordPress URLs to new Astro paths.
 */
function mapUrl(map: Map<string, string>, oldUrl: string, newPath: string) {
  map.set(oldUrl, newPath);
  if (oldUrl.endsWith("/")) {
    map.set(oldUrl.slice(0, -1), newPath);
  } else {
    map.set(oldUrl + "/", newPath);
  }
}

export function buildUrlMap(
  siteUrl: string,
  posts: WPPost[],
  pages: WPPost[],
  cptEntries: { restBase: string; posts: WPPost[] }[] = [],
): Map<string, string> {
  const map = new Map<string, string>();
  const baseUrl = siteUrl.replace(/\/+$/, "");

  for (const post of posts) {
    mapUrl(map, post.link, `/blog/${post.slug}`);
  }

  for (const page of pages) {
    mapUrl(map, page.link, `/${page.slug}`);
  }

  for (const { restBase, posts: cptPosts } of cptEntries) {
    for (const post of cptPosts) {
      mapUrl(map, post.link, `/${restBase}/${post.slug}`);
    }
  }

  // Map home page
  map.set(baseUrl, "/");
  map.set(baseUrl + "/", "/");

  return map;
}

/**
 * Rewrite internal WordPress links in markdown content to new Astro paths.
 */
export function rewriteLinks(markdown: string, urlMap: Map<string, string>): string {
  let result = markdown;

  // Sort by URL length descending so longer URLs match first
  const entries = [...urlMap.entries()].sort((a, b) => b[0].length - a[0].length);

  for (const [oldUrl, newPath] of entries) {
    result = result.replaceAll(oldUrl, newPath);
  }

  return result;
}

/**
 * Generate _redirects file content from URL map.
 */
export function generateRedirects(siteUrl: string, urlMap: Map<string, string>): string {
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const lines: string[] = ["# Redirects from old WordPress URLs to new Astro paths"];

  const seen = new Set<string>();
  for (const [oldUrl, newPath] of urlMap) {
    try {
      const oldPath = new URL(oldUrl).pathname.replace(/\/+$/, "") || "/";
      if (oldPath === newPath || oldPath === "/" || seen.has(oldPath)) continue;
      seen.add(oldPath);
      lines.push(`${oldPath} ${newPath} 301`);
    } catch {
      // Skip non-URL entries
    }
  }

  return lines.join("\n") + "\n";
}
