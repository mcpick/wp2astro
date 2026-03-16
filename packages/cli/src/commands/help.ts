import { bold, cyan, dim } from "../utils/colors.js";

export function printHelp() {
  console.log(`
${bold("wp2astro")} — Convert WordPress sites to Astro

${cyan("USAGE")}
  wp2astro convert --url <wordpress-url> [options]

${cyan("COMMANDS")}
  convert    Convert a WordPress site to an Astro project

${cyan("OPTIONS")}
  -u, --url <url>       WordPress site URL to convert
  -o, --output <dir>    Output directory ${dim("(default: ./output)")}
      --no-images       Skip downloading images
  -h, --help            Show this help message
  -v, --version         Show version number

${cyan("EXAMPLES")}
  wp2astro convert --url https://myblog.com
  wp2astro convert --url https://myblog.com --output ./my-astro-site
  wp2astro convert --url https://myblog.com --no-images
`);
}
