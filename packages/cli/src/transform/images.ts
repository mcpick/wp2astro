import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import type { ConvertError, ImageRef } from "../types.js";

/**
 * Extract all image URLs from markdown content.
 */
export function extractImageUrls(markdown: string): string[] {
  const urls = new Set<string>();

  // Markdown images: ![alt](url)
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    urls.add(match[1]);
  }

  // HTML images that survived conversion: <img src="...">
  for (const match of markdown.matchAll(/<img[^>]+src=["']([^"']+)["']/g)) {
    urls.add(match[1]);
  }

  return [...urls].filter((u) => u.startsWith("http"));
}

/**
 * Download images to the output directory and return mapping.
 */
export async function downloadImages(
  urls: string[],
  outputDir: string,
  onProgress?: (downloaded: number, total: number) => void,
  errors?: ConvertError[],
): Promise<ImageRef[]> {
  const imagesDir = join(outputDir, "public", "images");
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  const refs: ImageRef[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const filename = imageFilename(url);
      const localPath = join(imagesDir, filename);

      if (!existsSync(localPath)) {
        const res = await fetch(url);
        if (!res.ok) {
          errors?.push({ phase: "images", message: `HTTP ${res.status}`, item: url });
          continue;
        }
        const buffer = await res.arrayBuffer();
        await Bun.write(localPath, buffer);
      }

      refs.push({ originalUrl: url, localPath: `/images/${filename}`, filename });
    } catch (err: any) {
      errors?.push({ phase: "images", message: err.message, item: url });
    }

    onProgress?.(i + 1, urls.length);
  }

  return refs;
}

/**
 * Rewrite image URLs in markdown content to local paths.
 */
export function rewriteImageUrls(markdown: string, images: ImageRef[]): string {
  let result = markdown;
  for (const img of images) {
    result = result.replaceAll(img.originalUrl, img.localPath);
  }
  return result;
}

function imageFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop() ?? "image";
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Prefix with short hash to avoid collisions across domains
    const hash = hashCode(url).toString(36);
    return `${hash}_${sanitized}`;
  } catch {
    return `image_${Date.now()}.jpg`;
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
