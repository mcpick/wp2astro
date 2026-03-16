import type { AstroContent, ConvertError, ImageRef, WPPost } from "../types.js";
import { processShortcodes } from "./shortcodes.js";
import { htmlToMarkdown } from "./html-to-markdown.js";
import { serializeFrontmatter } from "./frontmatter.js";
import { extractImageUrls, rewriteImageUrls } from "./images.js";
import { rewriteLinks } from "./links.js";

export interface TransformResult {
  content: AstroContent[];
  imageUrls: string[];
}

/**
 * Transform WPPost[] into AstroContent[], collecting image URLs along the way.
 */
export function transformPosts(
  posts: WPPost[],
  urlMap: Map<string, string>,
  errors: ConvertError[],
): TransformResult {
  const content: AstroContent[] = [];
  const allImageUrls: string[] = [];

  for (const post of posts) {
    try {
      // 1. Process shortcodes
      let html = processShortcodes(post.content);

      // 2. HTML → Markdown
      let markdown = htmlToMarkdown(html);

      // 3. Extract image URLs before rewriting
      const imageUrls = extractImageUrls(markdown);
      allImageUrls.push(...imageUrls);

      // 4. Rewrite internal links
      markdown = rewriteLinks(markdown, urlMap);

      // 5. Build frontmatter
      const frontmatter: Record<string, unknown> = {
        title: post.title,
        date: post.date,
        slug: post.slug,
      };

      if (post.modified !== post.date) {
        frontmatter.lastModified = post.modified;
      }

      if (post.excerpt) {
        // Strip HTML from excerpt
        const cleanExcerpt = post.excerpt
          .replace(/<[^>]+>/g, "")
          .replace(/\n/g, " ")
          .trim();
        if (cleanExcerpt) {
          frontmatter.description = cleanExcerpt;
        }
      }

      if (post.featuredImage) {
        frontmatter.heroImage = post.featuredImage.url;
        if (post.featuredImage.alt) {
          frontmatter.heroImageAlt = post.featuredImage.alt;
        }
      }

      if (post.categories.length > 0) {
        frontmatter.categories = post.categories.map((c) => c.name);
      }

      if (post.tags.length > 0) {
        frontmatter.tags = post.tags.map((t) => t.name);
      }

      content.push({
        slug: post.slug,
        type: post.type,
        frontmatter,
        markdown,
      });
    } catch (err: any) {
      errors.push({ phase: "transform", message: err?.message ?? String(err), item: post.slug });
    }
  }

  return { content, imageUrls: [...new Set(allImageUrls)] };
}
