import { resolve } from "node:path";
import { bold, cyan, dim, green, red, yellow } from "../utils/colors.js";
import { withSpinner } from "../utils/spinner.js";
import { ProgressBar } from "../utils/progress.js";
import type { ConvertError, WPPostType } from "../types.js";
import type { FetchResult } from "../sources/rest-api.js";
import { RestApiAdapter } from "../sources/rest-api.js";
import { transformPosts } from "../transform/pipeline.js";
import { extractGalleryIds } from "../transform/shortcodes.js";
import { buildUrlMap, generateRedirects, rewriteLinks } from "../transform/links.js";
import { downloadImages, rewriteImageUrls } from "../transform/images.js";
import { scaffoldProject } from "../generate/project.js";
import { writeContent } from "../generate/content.js";
import { writeRedirects } from "../generate/redirects.js";
import { writeComments } from "../generate/comments.js";

interface ConvertOptions {
  url: string;
  output: string;
  downloadImages: boolean;
}

export async function convert({ url, output, downloadImages: dlImages }: ConvertOptions) {
  const outputDir = resolve(output);
  const errors: ConvertError[] = [];

  console.log();
  console.log(bold("wp2astro") + dim(" v0.0.1"));
  console.log(dim("─".repeat(40)));
  console.log(`  ${cyan("URL")}     ${url}`);
  console.log(`  ${cyan("Output")}  ${outputDir}`);
  console.log(dim("─".repeat(40)));
  console.log();

  // Phase 1: Probe + fetch site info
  const adapter = new RestApiAdapter(url);

  const hasApi = await withSpinner("Probing WordPress REST API…", async () => {
    return adapter.probe();
  });

  if (!hasApi) {
    throw new Error(
      `REST API not available at ${url}. Ensure it's a WordPress 4.7+ site with REST API enabled.`,
    );
  }

  const site = await withSpinner("Fetching site info…", async () => {
    return adapter.fetchSite();
  });

  console.log(`  ${cyan("Site")}  ${site.name}`);
  console.log();

  // Phase 2: Fetch posts and pages
  const postResult = await withSpinner("Fetching posts…", async () => {
    return adapter.fetchPosts();
  });

  const pageResult = await withSpinner("Fetching pages…", async () => {
    return adapter.fetchPages();
  });

  const posts = postResult.posts;
  const pages = pageResult.posts;
  let totalScraped = postResult.scrapeCount + pageResult.scrapeCount;
  const allStillEmpty = [...postResult.stillEmpty, ...pageResult.stillEmpty];

  // Discover custom post types
  const cptTypes = await withSpinner("Discovering custom post types…", async () => {
    return adapter.fetchPostTypes();
  });

  const cptResults: { type: WPPostType; result: FetchResult }[] = [];
  for (const cpt of cptTypes) {
    const result = await withSpinner(`Fetching ${cpt.name} (${cpt.restBase})…`, async () => {
      return adapter.fetchCustomPosts(cpt.restBase, cpt.restBase);
    });
    cptResults.push({ type: cpt, result });
    totalScraped += result.scrapeCount;
    allStillEmpty.push(...result.stillEmpty);
  }

  console.log();

  // Phase 3: Resolve media + Transform
  const cptEntries = cptResults.map(({ type, result }) => ({
    restBase: type.restBase,
    posts: result.posts,
  }));
  const urlMap = buildUrlMap(site.url, posts, pages, cptEntries);

  // Collect gallery IDs and fetch media
  const allPosts = [...posts, ...pages, ...cptResults.flatMap(r => r.result.posts)];
  const allGalleryIds = allPosts.flatMap(p => extractGalleryIds(p.content));

  // Fetch attachment images per post
  const attachmentUrls: string[] = [];
  await withSpinner("Fetching post attachments…", async () => {
    for (const post of allPosts) {
      const attachments = await adapter.fetchMediaByParent(post.id);
      for (const att of attachments) {
        if (att.url.startsWith("http")) attachmentUrls.push(att.url);
      }
    }
  });

  // Batch-fetch gallery media
  let mediaMap = new Map();
  if (allGalleryIds.length > 0) {
    mediaMap = await withSpinner(`Fetching ${allGalleryIds.length} gallery media…`, async () => {
      return adapter.fetchMediaByIds([...new Set(allGalleryIds)]);
    });
  }

  const postTransform = await withSpinner(`Transforming ${posts.length} posts…`, async () => {
    return transformPosts(posts, urlMap, errors, mediaMap);
  });

  const pageTransform = await withSpinner(`Transforming ${pages.length} pages…`, async () => {
    return transformPosts(pages, urlMap, errors, mediaMap);
  });

  const cptTransforms = [];
  for (const { type, result } of cptResults) {
    if (result.posts.length === 0) continue;
    const transform = await withSpinner(`Transforming ${result.posts.length} ${type.name}…`, async () => {
      return transformPosts(result.posts, urlMap, errors, mediaMap);
    });
    cptTransforms.push({ type, transform });
  }

  const allContent = [
    ...postTransform.content,
    ...pageTransform.content,
    ...cptTransforms.flatMap(({ transform }) => transform.content),
  ];
  const allImageUrls = [...new Set([
    ...postTransform.imageUrls,
    ...pageTransform.imageUrls,
    ...cptTransforms.flatMap(({ transform }) => transform.imageUrls),
    ...attachmentUrls,
  ])];

  // Phase 4: Download images
  if (dlImages && allImageUrls.length > 0) {
    console.log();
    console.log(`  ${cyan("Downloading")} ${allImageUrls.length} images…`);
    console.log();

    const progress = new ProgressBar("Images", allImageUrls.length).start();
    const imageRefs = await downloadImages(allImageUrls, outputDir, (done, total) => {
      progress.tick();
    }, errors);
    progress.complete();

    // Rewrite image URLs in all content
    for (const item of allContent) {
      item.markdown = rewriteImageUrls(item.markdown, imageRefs);
      // Also rewrite heroImage in frontmatter
      if (item.frontmatter.heroImage) {
        const ref = imageRefs.find((r) => r.originalUrl === item.frontmatter.heroImage);
        if (ref) item.frontmatter.heroImage = ref.localPath;
      }
    }
  } else if (!dlImages) {
    console.log(`  ${dim("Skipping image download (--no-images)")}`);
  }

  // Phase 5: Generate Astro project
  console.log();
  await withSpinner("Scaffolding Astro project…", async () => {
    await scaffoldProject(outputDir, site.name, cptTypes);
  });

  await withSpinner(`Writing ${allContent.length} content files…`, async () => {
    await writeContent(allContent, outputDir);
  });

  const redirectsContent = generateRedirects(site.url, urlMap);
  await withSpinner("Writing redirects…", async () => {
    await writeRedirects(redirectsContent, outputDir);
  });

  const commentCount = await withSpinner("Exporting comments…", async () => {
    return writeComments(allPosts, outputDir);
  });

  // Phase 6: Report
  console.log();
  console.log(dim("─".repeat(40)));
  console.log(bold(green("  Conversion complete!")));
  console.log();
  console.log(`  ${cyan("Site")}       ${site.name}`);
  console.log(`  ${cyan("WordPress")}  ${site.wpVersion}`);
  console.log();
  console.log(`  ${green("✔")} ${posts.length} posts converted`);
  console.log(`  ${green("✔")} ${pages.length} pages converted`);
  for (const { type, result } of cptResults) {
    if (result.posts.length > 0) {
      console.log(`  ${green("✔")} ${result.posts.length} ${type.name} items converted`);
    }
  }
  if (dlImages) {
    console.log(`  ${green("✔")} ${allImageUrls.length} images downloaded`);
  }
  if (commentCount > 0) {
    console.log(`  ${green("✔")} ${commentCount} comments exported`);
  }

  // Scrape fallback report
  if (totalScraped > 0) {
    console.log();
    console.log(`  ${yellow("⚠")} ${totalScraped} posts had empty content from API — scraped from page`);
    if (allStillEmpty.length > 0) {
      console.log(`    ${yellow("·")} ${allStillEmpty.length} still empty: ${allStillEmpty.join(", ")}`);
    }
  }

  // Warnings
  if (errors.length > 0) {
    console.log();
    console.log(`  ${yellow("⚠")} ${errors.length} warnings:`);
    for (const err of errors.slice(0, 10)) {
      console.log(`    ${yellow("·")} [${err.phase}] ${err.message}${err.item ? ` (${err.item})` : ""}`);
    }
    if (errors.length > 10) {
      console.log(`    ${dim(`… and ${errors.length - 10} more`)}`);
    }
  }

  console.log();
  console.log(
    `  ${dim("Next:")} ${cyan(`cd ${output}`)} && ${cyan("pnpm install")} && ${cyan("pnpm dev")}`,
  );
  console.log();
}
