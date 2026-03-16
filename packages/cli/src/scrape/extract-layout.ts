import { parse, type HTMLElement } from "node-html-parser";

interface LayoutInfo {
  layoutType: "full-width" | "sidebar-left" | "sidebar-right";
  sidebarDetected: boolean;
  hasHero: boolean;
  hasSidebar: boolean;
}

const SIDEBAR_SELECTORS = [
  "aside",
  ".sidebar",
  "#sidebar",
  ".widget-area",
  "#secondary",
  "[role='complementary']",
];

const HERO_SELECTORS = [
  "[class*='hero']",
  "[class*='banner']",
  "[class*='jumbotron']",
  ".wp-block-cover",
  "[class*='masthead']",
];

export function extractLayoutFromHTML(html: string): LayoutInfo {
  const root = parse(html);
  const sidebar = findSidebar(root);
  const hasHero = detectHero(root);

  if (!sidebar) {
    return { layoutType: "full-width", sidebarDetected: false, hasHero, hasSidebar: false };
  }

  const position = detectSidebarPosition(root, sidebar);
  return {
    layoutType: position,
    sidebarDetected: true,
    hasHero,
    hasSidebar: true,
  };
}

export function detectHero(root: HTMLElement): boolean {
  for (const sel of HERO_SELECTORS) {
    if (root.querySelector(sel)) return true;
  }

  // Large image above fold heuristic: first <img> inside header or first section
  const header = root.querySelector("header");
  if (header) {
    const img = header.querySelector("img");
    if (img) {
      const width = parseInt(img.getAttribute("width") ?? "0");
      if (width >= 600) return true;
    }
  }

  return false;
}

function findSidebar(root: HTMLElement): HTMLElement | null {
  for (const sel of SIDEBAR_SELECTORS) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function detectSidebarPosition(root: HTMLElement, sidebar: HTMLElement): "sidebar-left" | "sidebar-right" {
  const main = root.querySelector("main") ?? root.querySelector("[role='main']") ?? root.querySelector(".site-content");

  if (!main) return "sidebar-right";

  const parent = main.parentNode;
  if (!parent) return "sidebar-right";

  const children = (parent as HTMLElement).childNodes.filter(
    (n: any) => n.nodeType === 1,
  );

  const mainIdx = children.indexOf(main as any);
  const sidebarIdx = children.indexOf(sidebar as any);

  if (mainIdx === -1 || sidebarIdx === -1) return "sidebar-right";

  return sidebarIdx < mainIdx ? "sidebar-left" : "sidebar-right";
}
