#!/usr/bin/env bun

import { parse } from "./utils/args.js";
import { printHelp } from "./commands/help.js";
import { convert } from "./commands/convert.js";
import { bold, red } from "./utils/colors.js";

const version = "0.0.1";

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    process.stdout.write("\x1b[?25h"); // restore cursor
    process.exit(130);
  });
}

async function main() {
  const args = parse(process.argv.slice(2));

  if (args.version) {
    console.log(version);
    return;
  }

  if (args.help || !args.command) {
    printHelp();
    return;
  }

  if (args.command === "convert") {
    if (!args.url) {
      console.error(`${red("error:")} ${bold("--url")} is required`);
      console.error(`  Run ${bold("wp2astro --help")} for usage`);
      process.exit(1);
    }
    await convert({
      url: args.url,
      output: args.output,
      downloadImages: args.downloadImages,
      scaffold: args.scaffold,
    });
    return;
  }

  console.error(`${red("error:")} Unknown command ${bold(args.command)}`);
  console.error(`  Run ${bold("wp2astro --help")} for usage`);
  process.exit(1);
}

main().catch((err) => {
  console.error(red("fatal:"), err.message);
  process.exit(1);
});
