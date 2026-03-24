# WP2Astro

Convert WordPress sites to Astro projects. Powered by AI agents.

## Packages

| Package | Description |
|---------|-------------|
| [`@wp2astro/convert`](./packages/cli) | CLI that fetches WP content via REST API, transforms to Markdown, and scaffolds an Astro 6 + Tailwind v4 project |
| [`web`](./packages/web) | Marketing site at wp2astro.com |

## Quick start

```sh
# Convert a WordPress site
npx @wp2astro/convert convert --url https://myblog.com

# Convert + extract design data for AI styling
npx @wp2astro/convert convert --url https://myblog.com --scaffold
```

## AI agent workflow

WP2Astro is designed to work with AI coding agents like Claude Code:

1. **Convert** — run `npx -y @wp2astro/convert convert --url <site> --scaffold` to produce an Astro project with content + a design prompt
2. **Style** — paste the scaffold prompt into Claude Code and run `/elite-style` to generate styled components matching the original site
3. **Deploy** — `pnpm build` and push to any static host

See the [CLI README](./packages/cli/README.md) for full docs.

## Development

```sh
pnpm install         # Install all dependencies
pnpm test            # Run CLI tests
```
