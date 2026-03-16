import { parse, type HTMLElement } from "node-html-parser";
import type { NavItem } from "../types.js";

const NAV_SELECTORS = [
  "nav.primary-navigation",
  "nav.main-navigation",
  "#site-navigation",
  "nav[role='navigation']",
  "header nav",
  "nav",
];

export function extractNavFromHTML(html: string): NavItem[] {
  const root = parse(html);

  for (const sel of NAV_SELECTORS) {
    const nav = root.querySelector(sel);
    if (!nav) continue;
    const items = parseMenuItems(nav);
    if (items.length > 0) return items;
  }

  return [];
}

export async function fetchMenuFromAPI(apiUrl: string): Promise<NavItem[] | null> {
  // Try WP REST API menus endpoints
  const endpoints = [
    `${apiUrl}/wp/v2/menu-items?menus=primary&per_page=100`,
    `${apiUrl}/wp/v2/menu-items?per_page=100`,
    `${apiUrl}/menus/v1/menus/primary`,
    `${apiUrl}/menus/v1/menus`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      const items = parseAPIMenuResponse(data, url);
      if (items && items.length > 0) return items;
    } catch {
      continue;
    }
  }

  return null;
}

function parseAPIMenuResponse(data: any, url: string): NavItem[] | null {
  // WP REST API v2 menu-items endpoint
  if (Array.isArray(data) && data[0]?.title?.rendered) {
    return buildTreeFromFlatItems(data);
  }

  // WP-REST-API-V2-Menus plugin (menus/v1)
  if (Array.isArray(data) && data[0]?.items) {
    return parseMenuPluginItems(data[0].items);
  }
  if (data?.items) {
    return parseMenuPluginItems(data.items);
  }

  return null;
}

function buildTreeFromFlatItems(items: any[]): NavItem[] {
  const map = new Map<number, NavItem & { id: number; parent: number }>();
  for (const item of items) {
    map.set(item.id, {
      id: item.id,
      parent: item.parent ?? 0,
      label: item.title?.rendered ?? item.title ?? "",
      href: item.url ?? "#",
      children: [],
    });
  }

  const roots: NavItem[] = [];
  for (const item of map.values()) {
    if (item.parent && map.has(item.parent)) {
      map.get(item.parent)!.children.push({ label: item.label, href: item.href, children: item.children });
    } else {
      roots.push({ label: item.label, href: item.href, children: item.children });
    }
  }
  return roots;
}

function parseMenuPluginItems(items: any[]): NavItem[] {
  return items.map((item: any) => ({
    label: item.title ?? "",
    href: item.url ?? "#",
    children: item.child_items ? parseMenuPluginItems(item.child_items) : [],
  }));
}

function parseMenuItems(nav: HTMLElement): NavItem[] {
  // Find top-level <ul>
  const ul = nav.querySelector("ul");
  if (!ul) return [];
  return parseUl(ul);
}

function parseUl(ul: HTMLElement): NavItem[] {
  const items: NavItem[] = [];

  for (const li of ul.querySelectorAll(":scope > li")) {
    const a = li.querySelector(":scope > a");
    if (!a) continue;

    const label = a.textContent.trim();
    const href = a.getAttribute("href") ?? "#";

    // Check for submenu
    const subUl = li.querySelector(":scope > ul");
    const children = subUl ? parseUl(subUl) : [];

    items.push({ label, href, children });
  }

  return items;
}
