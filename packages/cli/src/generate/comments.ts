import { join } from "node:path";
import type { WPPost } from "../types.js";

interface CommentEntry {
  id: number;
  author: string;
  date: string;
  content: string;
  parent: number;
}

/**
 * Write comments.json from WP posts with comments, keyed by post slug.
 */
export async function writeComments(posts: WPPost[], outputDir: string): Promise<number> {
  const comments: Record<string, CommentEntry[]> = {};
  let total = 0;

  for (const post of posts) {
    if (post.comments.length === 0) continue;
    comments[post.slug] = post.comments.map((c) => ({
      id: c.id,
      author: c.author,
      date: c.date,
      content: c.content.replace(/<[^>]+>/g, "").trim(),
      parent: c.parent,
    }));
    total += post.comments.length;
  }

  if (total > 0) {
    await Bun.write(
      join(outputDir, "src", "data", "comments.json"),
      JSON.stringify(comments, null, 2),
    );
  }

  return total;
}
