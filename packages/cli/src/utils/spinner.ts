import { cyan, green, red } from "./colors.js";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start() {
    process.stdout.write("\x1b[?25l"); // hide cursor
    this.timer = setInterval(() => {
      const f = frames[this.frame % frames.length];
      process.stdout.write(`\r${cyan(f)} ${this.message}`);
      this.frame++;
    }, 80);
    return this;
  }

  succeed(msg?: string) {
    this.stop();
    console.log(`\r${green("✔")} ${msg ?? this.message}`);
  }

  fail(msg?: string) {
    this.stop();
    console.log(`\r${red("✖")} ${msg ?? this.message}`);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    process.stdout.write("\x1b[?25h"); // show cursor
    process.stdout.write("\r\x1b[K"); // clear line
  }
}

export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  const spinner = new Spinner(message);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}
