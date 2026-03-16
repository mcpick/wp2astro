import { join } from "node:path";

/**
 * Write _redirects file from redirect content.
 */
export async function writeRedirects(redirectsContent: string, outputDir: string): Promise<void> {
  await Bun.write(join(outputDir, "_redirects"), redirectsContent);
}
