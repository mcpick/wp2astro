import { join } from "node:path";
import type { AstroContent } from "../types.js";
import { serializeFrontmatter } from "../transform/frontmatter.js";

/**
 * Write AstroContent[] as .md files with frontmatter.
 */
export async function writeContent(content: AstroContent[], outputDir: string): Promise<void> {
  for (const item of content) {
    const dir = item.type === "post" ? "posts" : "pages";
    const filePath = join(outputDir, "src", "content", dir, `${item.slug}.md`);
    const fileContent = `${serializeFrontmatter(item.frontmatter)}\n\n${item.markdown}\n`;
    await Bun.write(filePath, fileContent);
  }
}
