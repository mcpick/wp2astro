import type { ScrapedDesign, WPPost, PageSummary } from "../types.js";
import { fetchPage, fetchPages } from "./fetcher.js";
import { extractColorsFromHTML, fetchStylesheetColors, deduplicateColors } from "./extract-colors.js";
import { extractFontsFromHTML } from "./extract-fonts.js";
import { extractNavFromHTML, fetchMenuFromAPI } from "./extract-nav.js";
import { extractLayoutFromHTML } from "./extract-layout.js";
import { classifyPage, classifyPostPage, classifyBlogListing } from "./analyze-pages.js";

export async function scrapeDesign(
  siteUrl: string,
  posts: WPPost[],
  pages: WPPost[],
): Promise<ScrapedDesign> {
  const base = siteUrl.replace(/\/+$/, "");
  const apiUrl = `${base}/wp-json`;

  // Determine URLs to fetch
  const urlsToFetch = [base]; // homepage

  // Blog listing: try /blog/ first
  const blogUrl = `${base}/blog/`;
  urlsToFetch.push(blogUrl);

  // First published post
  const firstPost = posts[0];
  if (firstPost?.link) urlsToFetch.push(firstPost.link);

  // First published page
  const firstPage = pages[0];
  if (firstPage?.link) urlsToFetch.push(firstPage.link);

  // Fetch all pages in parallel
  const fetched = await fetchPages(urlsToFetch);

  const homepageHTML = fetched.get(base) ?? "";

  // Extract colors from homepage + stylesheets
  const inlineColors = homepageHTML ? extractColorsFromHTML(homepageHTML) : [];
  const sheetColors = homepageHTML ? await fetchStylesheetColors(homepageHTML, base) : [];
  const colors = deduplicateColors([...inlineColors, ...sheetColors]);

  // Extract fonts from homepage
  const fonts = homepageHTML ? extractFontsFromHTML(homepageHTML) : [];

  // Extract nav: try API first, fall back to HTML scraping
  let navItems = await fetchMenuFromAPI(apiUrl);
  if (!navItems || navItems.length === 0) {
    navItems = homepageHTML ? extractNavFromHTML(homepageHTML) : [];
  }

  // Extract layout from homepage
  const layout = homepageHTML
    ? extractLayoutFromHTML(homepageHTML)
    : { layoutType: "full-width" as const, sidebarDetected: false, hasHero: false, hasSidebar: false };

  // Classify pages
  const pageSummaries: PageSummary[] = [];

  if (homepageHTML) {
    pageSummaries.push(classifyPage(homepageHTML, base, "Homepage", true));
  }

  const blogHTML = fetched.get(blogUrl);
  if (blogHTML) {
    pageSummaries.push(classifyBlogListing(blogHTML, blogUrl));
  }

  if (firstPost?.link) {
    const postHTML = fetched.get(firstPost.link);
    if (postHTML) {
      pageSummaries.push(classifyPostPage(postHTML, firstPost.link, firstPost.title));
    }
  }

  if (firstPage?.link) {
    const pageHTML = fetched.get(firstPage.link);
    if (pageHTML) {
      pageSummaries.push(classifyPage(pageHTML, firstPage.link, firstPage.title, false));
    }
  }

  return {
    colors,
    fonts,
    navItems,
    layoutType: layout.layoutType,
    sidebarDetected: layout.sidebarDetected,
    pages: pageSummaries,
  };
}
