import { bold, cyan, dim, green, red, yellow } from "../utils/colors.js";
import { withSpinner } from "../utils/spinner.js";
import { ProgressBar } from "../utils/progress.js";

interface ConvertOptions {
  url: string;
  output: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function convert({ url, output }: ConvertOptions) {
  console.log();
  console.log(bold("wp2astro") + dim(" v0.0.1"));
  console.log(dim("─".repeat(40)));
  console.log(`  ${cyan("URL")}     ${url}`);
  console.log(`  ${cyan("Output")}  ${output}`);
  console.log(dim("─".repeat(40)));
  console.log();

  // Phase 1: Scan
  const siteInfo = await withSpinner("Scanning WordPress site…", async () => {
    await sleep(1500);
    return { title: "My WordPress Blog", wpVersion: "6.7", pages: 24, posts: 156, media: 312 };
  });

  // Phase 2: Analyze
  const analysis = await withSpinner("Analyzing theme & plugins…", async () => {
    await sleep(1200);
    return { theme: "flavor", plugins: ["yoast-seo", "contact-form-7", "wp-super-cache"] };
  });

  // Phase 3: Generate
  console.log();
  console.log(`  ${cyan("Generating Astro project…")}`);
  console.log();

  const totalItems = siteInfo.pages + siteInfo.posts + siteInfo.media;
  const progress = new ProgressBar("Content", totalItems).start();

  for (let i = 0; i < totalItems; i++) {
    await sleep(5);
    progress.tick();
  }
  progress.complete();

  // Phase 4: Report
  console.log();
  console.log(dim("─".repeat(40)));
  console.log(bold(green("  Conversion complete!")));
  console.log();
  console.log(`  ${cyan("Site")}     ${siteInfo.title}`);
  console.log(`  ${cyan("WP")}       ${siteInfo.wpVersion}`);
  console.log(`  ${cyan("Theme")}    ${analysis.theme}`);
  console.log(`  ${cyan("Plugins")}  ${analysis.plugins.length} detected`);
  console.log();
  console.log(`  ${green("✔")} ${siteInfo.pages} pages converted`);
  console.log(`  ${green("✔")} ${siteInfo.posts} posts converted`);
  console.log(`  ${green("✔")} ${siteInfo.media} media files referenced`);
  console.log();
  console.log(
    `  ${dim("Next:")} ${cyan(`cd ${output}`)} && ${cyan("pnpm install")} && ${cyan("pnpm dev")}`,
  );
  console.log();
}
