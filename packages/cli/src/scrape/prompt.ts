import type { ScrapedDesign, WPPostType } from "../types.js";

export function generateScaffoldPrompt(
  design: ScrapedDesign,
  siteName: string,
  outputDir: string,
  cptTypes: WPPostType[],
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Styling Prompt for "${siteName}"`);
  sections.push("");

  // 1. Project context
  const collections = ["posts", "pages", ...cptTypes.map(c => c.restBase)];
  sections.push("## Project Context");
  sections.push("");
  sections.push(`There's an Astro 6 project at \`${outputDir}\` with Tailwind v4. It has content collections for ${collections.join(", ")}.`);
  sections.push("");

  // 2. Design system — colors
  if (design.colors.length > 0) {
    sections.push("## Color Palette");
    sections.push("");
    sections.push("| Name | Value |");
    sections.push("|------|-------|");
    for (const c of design.colors) {
      sections.push(`| ${c.name} | \`${c.value}\` |`);
    }
    sections.push("");
  }

  // 2. Design system — fonts
  if (design.fonts.length > 0) {
    sections.push("## Typography");
    sections.push("");
    for (const f of design.fonts) {
      let line = `- **${f.family}**`;
      if (f.fontsource) {
        line += ` → install: \`pnpm add ${f.fontsource}\``;
      } else if (f.url) {
        line += ` → CDN: \`${f.url}\``;
      }
      sections.push(line);
    }
    sections.push("");
  }

  // 2. Layout
  sections.push("## Layout");
  sections.push("");
  sections.push(`- Layout type: **${design.layoutType}**`);
  sections.push(`- Sidebar detected: ${design.sidebarDetected ? "yes" : "no"}`);
  sections.push("");

  // 3. Navigation
  if (design.navItems.length > 0) {
    sections.push("## Navigation");
    sections.push("");
    for (const item of design.navItems) {
      sections.push(`- [${item.label}](${item.href})`);
      for (const child of item.children) {
        sections.push(`  - [${child.label}](${child.href})`);
        for (const grandchild of child.children) {
          sections.push(`    - [${grandchild.label}](${grandchild.href})`);
        }
      }
    }
    sections.push("");
  }

  // 4. Page types
  if (design.pages.length > 0) {
    sections.push("## Page Types Found");
    sections.push("");
    sections.push("| Type | URL | Hero | Sidebar |");
    sections.push("|------|-----|------|---------|");
    for (const p of design.pages) {
      sections.push(`| ${p.type} | ${p.url} | ${p.hasHero ? "yes" : "no"} | ${p.hasSidebar ? "yes" : "no"} |`);
    }
    sections.push("");
  }

  // 5. Instructions
  sections.push("## Instructions");
  sections.push("");
  sections.push("Use `/elite-style` to generate styled Astro components that match the original site's visual design:");
  sections.push("");
  sections.push("- `src/components/Header.astro` — site header with navigation");
  sections.push("- `src/components/Footer.astro` — site footer");
  sections.push("- `src/layouts/BaseLayout.astro` — base layout with head, header, footer");
  sections.push("- `src/layouts/PostLayout.astro` — single post layout");
  sections.push("- `src/pages/index.astro` — landing/home page");
  sections.push("- `src/styles/global.css` — Tailwind @theme tokens for colors and fonts");
  sections.push("");

  // 6. File references
  sections.push("## Key Files to Modify");
  sections.push("");
  sections.push(`- \`${outputDir}/src/layouts/BaseLayout.astro\``);
  sections.push(`- \`${outputDir}/src/layouts/PostLayout.astro\``);
  sections.push(`- \`${outputDir}/src/pages/index.astro\``);
  sections.push(`- \`${outputDir}/src/styles/global.css\``);
  if (cptTypes.length > 0) {
    for (const cpt of cptTypes) {
      sections.push(`- \`${outputDir}/src/pages/${cpt.restBase}/[slug].astro\``);
    }
  }
  sections.push("");

  return sections.join("\n");
}
