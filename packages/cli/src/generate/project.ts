import { join } from "node:path";
import { mkdirSync } from "node:fs";
import * as t from "./templates.js";

/**
 * Scaffold the Astro project directory structure and config files.
 */
export async function scaffoldProject(outputDir: string, siteName: string): Promise<void> {
  const dirs = [
    "",
    "src",
    "src/content/posts",
    "src/content/pages",
    "src/data",
    "src/layouts",
    "src/styles",
    "src/pages",
    "src/pages/blog",
    "public/images",
  ];

  for (const dir of dirs) {
    mkdirSync(join(outputDir, dir), { recursive: true });
  }

  const slugifiedName = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  await Promise.all([
    Bun.write(join(outputDir, "package.json"), t.packageJson(slugifiedName || "astro-site")),
    Bun.write(join(outputDir, "astro.config.mjs"), t.astroConfig),
    Bun.write(join(outputDir, "tsconfig.json"), t.tsConfig),
    Bun.write(join(outputDir, "src/content.config.ts"), t.contentConfig),
    Bun.write(join(outputDir, "src/styles/global.css"), t.globalCss),
    Bun.write(join(outputDir, "src/layouts/BaseLayout.astro"), t.baseLayout),
    Bun.write(join(outputDir, "src/layouts/PostLayout.astro"), t.postLayout),
    Bun.write(join(outputDir, "src/pages/index.astro"), t.indexPage(siteName)),
    Bun.write(join(outputDir, "src/pages/blog/[...slug].astro"), t.blogSlugPage),
    Bun.write(join(outputDir, "src/pages/[...slug].astro"), t.pageSlugPage),
  ]);
}
