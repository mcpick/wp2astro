import { describe, test, expect } from "bun:test";
import { generateScaffoldPrompt } from "./prompt.js";
import type { ScrapedDesign, WPPostType } from "../types.js";

function makeDesign(overrides: Partial<ScrapedDesign> = {}): ScrapedDesign {
  return {
    colors: [
      { name: "primary", value: "#ff5733" },
      { name: "background", value: "#ffffff" },
    ],
    fonts: [
      { family: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter", fontsource: "@fontsource/inter" },
    ],
    navItems: [
      { label: "Home", href: "/", children: [] },
      { label: "About", href: "/about", children: [] },
    ],
    layoutType: "full-width",
    sidebarDetected: false,
    pages: [
      { type: "landing", url: "https://example.com", title: "Homepage", hasHero: true, hasSidebar: false },
      { type: "single-post", url: "https://example.com/hello", title: "Hello", hasHero: false, hasSidebar: true },
    ],
    ...overrides,
  };
}

describe("generateScaffoldPrompt", () => {
  test("includes site name in header", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain('Styling Prompt for "My Site"');
  });

  test("includes project context with output dir", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("Astro 6 project at `/out`");
    expect(prompt).toContain("Tailwind v4");
    expect(prompt).toContain("posts, pages");
  });

  test("includes CPT collections in context", () => {
    const cpts: WPPostType[] = [{ name: "Projects", slug: "project", restBase: "projects", label: "Project" }];
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", cpts);
    expect(prompt).toContain("posts, pages, projects");
  });

  test("includes color palette table", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("| primary | `#ff5733` |");
    expect(prompt).toContain("| background | `#ffffff` |");
  });

  test("includes font with fontsource install", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("**Inter**");
    expect(prompt).toContain("pnpm add @fontsource/inter");
  });

  test("falls back to CDN URL when no fontsource", () => {
    const design = makeDesign({
      fonts: [{ family: "Custom", url: "https://example.com/font.css" }],
    });
    const prompt = generateScaffoldPrompt(design, "My Site", "/out", []);
    expect(prompt).toContain("CDN: `https://example.com/font.css`");
  });

  test("includes navigation items", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("[Home](/)");
    expect(prompt).toContain("[About](/about)");
  });

  test("includes layout info", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("Layout type: **full-width**");
  });

  test("includes page types table", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("| landing |");
    expect(prompt).toContain("| single-post |");
  });

  test("includes /elite-style instruction", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("/elite-style");
  });

  test("includes key files to modify", () => {
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", []);
    expect(prompt).toContain("/out/src/layouts/BaseLayout.astro");
    expect(prompt).toContain("/out/src/pages/index.astro");
    expect(prompt).toContain("/out/src/styles/global.css");
  });

  test("includes CPT page paths", () => {
    const cpts: WPPostType[] = [{ name: "Projects", slug: "project", restBase: "projects", label: "Project" }];
    const prompt = generateScaffoldPrompt(makeDesign(), "My Site", "/out", cpts);
    expect(prompt).toContain("/out/src/pages/projects/[slug].astro");
  });

  test("handles sidebar layout", () => {
    const design = makeDesign({ layoutType: "sidebar-right", sidebarDetected: true });
    const prompt = generateScaffoldPrompt(design, "My Site", "/out", []);
    expect(prompt).toContain("Layout type: **sidebar-right**");
    expect(prompt).toContain("Sidebar detected: yes");
  });

  test("omits color section when no colors", () => {
    const prompt = generateScaffoldPrompt(makeDesign({ colors: [] }), "Site", "/out", []);
    expect(prompt).not.toContain("## Color Palette");
  });

  test("omits typography section when no fonts", () => {
    const prompt = generateScaffoldPrompt(makeDesign({ fonts: [] }), "Site", "/out", []);
    expect(prompt).not.toContain("## Typography");
  });

  test("omits navigation section when no nav", () => {
    const prompt = generateScaffoldPrompt(makeDesign({ navItems: [] }), "Site", "/out", []);
    expect(prompt).not.toContain("## Navigation");
  });
});
