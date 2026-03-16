import { cyan, dim, green } from "./colors.js";

export class ProgressBar {
  private total: number;
  private current = 0;
  private width: number;
  private label: string;

  constructor(label: string, total: number, width = 30) {
    this.label = label;
    this.total = total;
    this.width = width;
  }

  start() {
    process.stdout.write("\x1b[?25l"); // hide cursor
    this.render();
    return this;
  }

  tick(amount = 1) {
    this.current = Math.min(this.current + amount, this.total);
    this.render();
  }

  complete() {
    this.current = this.total;
    this.render();
    process.stdout.write("\x1b[?25h\n"); // show cursor
  }

  private render() {
    const ratio = this.current / this.total;
    const filled = Math.round(this.width * ratio);
    const empty = this.width - filled;
    const bar = `${green("█".repeat(filled))}${dim("░".repeat(empty))}`;
    const pct = `${Math.round(ratio * 100)}%`;
    process.stdout.write(
      `\r  ${cyan(this.label)} ${bar} ${pct} ${dim(`(${this.current}/${this.total})`)}`,
    );
  }
}
