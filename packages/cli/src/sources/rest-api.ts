import { parse } from "node-html-parser";
import type { SourceAdapter } from "./adapter.js";
import type { WPComment, WPMedia, WPPost, WPPostType, WPSite, WPTaxonomy } from "../types.js";

const CONTENT_SELECTORS = [
  ".entry-content",
  ".post-content",
  "article .content",
  // Page builders
  ".elementor-widget-theme-post-content",
  ".elementor-widget-text-editor",
  "[data-elementor-type='wp-post']",
  ".et_pb_post_content",
  ".fl-post-content",
  ".wpb_text_column",
  ".gdlr-core-page-builder-body",
  // Generic fallbacks
  "main article",
  "article",
  ".elementor",
  "main",
];

export function extractMainContent(html: string): string | null {
  const root = parse(html);
  for (const sel of CONTENT_SELECTORS) {
    const el = root.querySelector(sel);
    if (el?.textContent?.trim()) return el.innerHTML;
  }
  return null;
}

async function scrapeContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return extractMainContent(await res.text());
  } catch {
    return null;
  }
}

export interface FetchResult {
  posts: WPPost[];
  scrapeCount: number;
  scraped: number;
  stillEmpty: string[];
}

export function decodeHtml(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

export function mapPost(raw: any, type: string): WPPost {
  const embedded = raw._embedded ?? {};

  const featuredMedia = embedded["wp:featuredmedia"]?.[0];
  const featuredImage: WPMedia | undefined = featuredMedia
    ? {
        id: featuredMedia.id,
        url: featuredMedia.source_url ?? featuredMedia.link,
        alt: featuredMedia.alt_text ?? "",
        width: featuredMedia.media_details?.width ?? 0,
        height: featuredMedia.media_details?.height ?? 0,
        mimeType: featuredMedia.mime_type ?? "image/jpeg",
      }
    : undefined;

  const categories: WPTaxonomy[] = (Array.isArray(embedded["wp:term"]?.[0]) ? embedded["wp:term"][0] : []).map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  const tags: WPTaxonomy[] = (Array.isArray(embedded["wp:term"]?.[1]) ? embedded["wp:term"][1] : []).map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  const comments: WPComment[] = (Array.isArray(embedded.replies?.[0]) ? embedded.replies[0] : []).map((c: any) => ({
    id: c.id,
    author: c.author_name ?? "Anonymous",
    date: c.date,
    content: c.content?.rendered ?? "",
    parent: c.parent ?? 0,
  }));

  return {
    id: raw.id,
    slug: raw.slug,
    title: decodeHtml(raw.title?.rendered ?? ""),
    content: raw.content?.rendered ?? "",
    excerpt: raw.excerpt?.rendered ?? "",
    date: raw.date,
    modified: raw.modified,
    status: raw.status,
    type,
    link: raw.link,
    featuredImage,
    categories,
    tags,
    comments,
  };
}

export class RestApiAdapter implements SourceAdapter {
  private baseUrl: string;
  private apiUrl: string;

  constructor(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
    this.apiUrl = `${this.baseUrl}/wp-json`;
  }

  async probe(): Promise<boolean> {
    try {
      const res = await fetch(this.apiUrl, { redirect: "follow" });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data?.namespaces?.includes("wp/v2");
    } catch {
      return false;
    }
  }

  async fetchSite(): Promise<WPSite> {
    const res = await fetch(this.apiUrl);
    if (!res.ok) throw new Error(`Failed to fetch site info: ${res.status}`);
    const data = await res.json();
    return {
      name: data.name ?? "WordPress Site",
      description: data.description ?? "",
      url: data.url ?? this.baseUrl,
      wpVersion: data.namespaces?.includes("wp/v2") ? "4.7+" : "unknown",
    };
  }

  async fetchPosts(onProgress?: (count: number, total: number) => void): Promise<FetchResult> {
    return this.fetchCollection("posts", onProgress);
  }

  async fetchPages(onProgress?: (count: number, total: number) => void): Promise<FetchResult> {
    return this.fetchCollection("pages", onProgress);
  }

  async fetchPostTypes(): Promise<WPPostType[]> {
    const res = await fetch(`${this.apiUrl}/wp/v2/types`);
    if (!res.ok) return [];
    const data = await res.json();
    return filterPostTypes(data);
  }

  async fetchCustomPosts(
    restBase: string,
    typeName: string,
    onProgress?: (count: number, total: number) => void,
  ): Promise<FetchResult> {
    return this.fetchCollection(restBase, onProgress, typeName);
  }

  private async fetchCollection(
    type: string,
    onProgress?: (count: number, total: number) => void,
    typeName?: string,
  ): Promise<FetchResult> {
    const results: WPPost[] = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;

    while (page <= totalPages) {
      const url = `${this.apiUrl}/wp/v2/${type}?per_page=100&page=${page}&_embed`;
      const res = await fetch(url);

      if (!res.ok) {
        if (page === 1) throw new Error(`Failed to fetch ${type}: ${res.status}`);
        break;
      }

      if (page === 1) {
        totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);
        total = parseInt(res.headers.get("X-WP-Total") ?? "0", 10);
      }

      const items: any[] = await res.json();
      const postType = typeName ?? (type === "pages" ? "page" : "post");
      for (const item of items) {
        results.push(mapPost(item, postType));
      }

      onProgress?.(results.length, total);
      page++;
    }

    // Scrape fallback for posts with empty content
    const emptyPosts = results.filter(p => !p.content.trim());
    let scraped = 0;
    const stillEmpty: string[] = [];

    if (emptyPosts.length > 0) {
      await Promise.all(emptyPosts.map(async (post) => {
        const content = await scrapeContent(post.link);
        if (content) {
          post.content = content;
          scraped++;
        } else {
          stillEmpty.push(post.slug);
        }
      }));
    }

    return {
      posts: results,
      scrapeCount: emptyPosts.length,
      scraped,
      stillEmpty,
    };
  }

  async fetchMediaByIds(ids: number[]): Promise<Map<number, WPMedia>> {
    const map = new Map<number, WPMedia>();
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const res = await fetch(`${this.apiUrl}/wp/v2/media?include=${chunk.join(",")}&per_page=100`);
      if (!res.ok) continue;
      const items: any[] = await res.json();
      for (const item of items) {
        map.set(item.id, {
          id: item.id,
          url: item.source_url ?? item.link,
          alt: item.alt_text ?? "",
          width: item.media_details?.width ?? 0,
          height: item.media_details?.height ?? 0,
          mimeType: item.mime_type ?? "image/jpeg",
        });
      }
    }
    return map;
  }

  async fetchMediaByParent(parentId: number): Promise<WPMedia[]> {
    const res = await fetch(`${this.apiUrl}/wp/v2/media?parent=${parentId}&per_page=100`);
    if (!res.ok) return [];
    const items: any[] = await res.json();
    return items.map(item => ({
      id: item.id,
      url: item.source_url ?? item.link,
      alt: item.alt_text ?? "",
      width: item.media_details?.width ?? 0,
      height: item.media_details?.height ?? 0,
      mimeType: item.mime_type ?? "image/jpeg",
    }));
  }
}

const EXCLUDED_SLUGS = new Set([
  "post", "page", "attachment", "nav_menu_item",
]);

const EXCLUDED_PREFIXES = ["wp_", "jp_", "jb_", "elementor_"];

export function filterPostTypes(data: Record<string, any>): WPPostType[] {
  const results: WPPostType[] = [];
  for (const [key, value] of Object.entries(data)) {
    const slug = value.slug ?? key;
    if (EXCLUDED_SLUGS.has(slug)) continue;
    if (EXCLUDED_PREFIXES.some(p => slug.startsWith(p))) continue;
    const restBase = value.rest_base;
    if (!restBase || /[(){}]/.test(restBase)) continue;
    results.push({
      name: value.name ?? slug,
      slug,
      restBase,
      label: value.labels?.singular_name ?? value.name ?? slug,
    });
  }
  return results;
}
