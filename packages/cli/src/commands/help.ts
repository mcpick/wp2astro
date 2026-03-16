import { bold, cyan, dim } from "../utils/colors.js";

export function printHelp() {
  console.log(`
${bold("wp2astro")} — Convert WordPress sites to Astro

${cyan("USAGE")}
  bunx @wp2astro/convert convert --url <wordpress-url> [options]

${cyan("COMMANDS")}
  convert    Convert a WordPress site to an Astro project

${cyan("OPTIONS")}
  -u, --url <url>       WordPress site URL to convert
  -o, --output <dir>    Output directory ${dim("(default: ./output)")}
      --no-images       Skip downloading images
      --scaffold        Scrape site design, print styling prompt for /elite-style
  -h, --help            Show this help message
  -v, --version         Show version number

${cyan("EXAMPLES")}
  bunx @wp2astro/convert convert --url https://myblog.com
  bunx @wp2astro/convert convert --url https://myblog.com --output ./my-astro-site
  bunx @wp2astro/convert convert --url https://myblog.com --no-images
  bunx @wp2astro/convert convert --url https://myblog.com --scaffold
`);
}
