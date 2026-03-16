export async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchPages(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const fetches = urls.map(async (url) => {
    const html = await fetchPage(url);
    if (html) results.set(url, html);
  });
  await Promise.all(fetches);
  return results;
}
