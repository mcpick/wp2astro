import { parseArgs } from "util";

export interface CliArgs {
  command: string;
  url?: string;
  output: string;
  help: boolean;
  version: boolean;
}

export function parse(args: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      url: { type: "string", short: "u" },
      output: { type: "string", short: "o", default: "./output" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  return {
    command: positionals[0] ?? "",
    url: values.url,
    output: values.output as string,
    help: values.help as boolean,
    version: values.version as boolean,
  };
}
