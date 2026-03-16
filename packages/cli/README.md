# @wp2astro/convert

CLI that converts a WordPress site into an Astro 6 project. Fetches content via the WP REST API, transforms HTML to Markdown, downloads images, and scaffolds a complete Astro project with Tailwind v4.

## Install

```sh
# Run directly with bun
bun packages/cli/src/cli.ts convert --url https://myblog.com

# Or build a binary
cd packages/cli && bun run build
./dist/wp2astro convert --url https://myblog.com
```

## Usage

```
wp2astro convert --url <wordpress-url> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-u, --url <url>` | WordPress site URL (required) |
| `-o, --output <dir>` | Output directory (default: `./output`) |
| `--no-images` | Skip downloading images |
| `--scaffold` | Scrape site design, print styling prompt for `/elite-style` |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

### Examples

```sh
# Basic conversion
wp2astro convert --url https://myblog.com

# Custom output directory
wp2astro convert --url https://myblog.com --output ./my-astro-site

# Skip images
wp2astro convert --url https://myblog.com --no-images

# Convert + generate styling prompt
wp2astro convert --url https://myblog.com --scaffold
```

## What it does

### Convert pipeline

1. **Probe** — checks the site has a WP REST API (`/wp-json`)
2. **Fetch** — pulls posts, pages, and custom post types via REST API. Falls back to scraping the live page if API content is empty
3. **Media** — resolves gallery shortcodes, fetches post attachments, downloads images to `public/images/`
4. **Transform** — processes shortcodes, converts HTML to Markdown, rewrites links, builds frontmatter with categories/tags/hero images
5. **Generate** — scaffolds Astro 6 project with Tailwind v4, content collections, layouts, and `_redirects`

### `--scaffold` flag

Scrapes the live WordPress site to extract design data, then prints a markdown prompt to stdout. The prompt includes:

- **Color palette** — CSS custom properties and declarations from `:root`/`body`, including WP preset vars (`--wp--preset--color--primary`)
- **Typography** — Google Fonts links, `@font-face` declarations, body/heading font families. Fonts are mapped to [Fontsource](https://fontsource.org) packages where possible, with CDN fallback
- **Navigation** — tries WP REST API menu endpoints first (`/wp/v2/menu-items`), falls back to scraping `<nav>` elements from HTML
- **Layout** — sidebar detection and position, hero section detection
- **Page types** — classifies homepage (landing vs blog listing), posts, pages

## Using with Claude Code

The recommended workflow for a full WordPress-to-Astro migration:

### Step 1: Convert content

Ask Claude Code to run the CLI:

```
Convert my WordPress site at https://myblog.com to Astro.
Run: bun packages/cli/src/cli.ts convert --url https://myblog.com --scaffold --output ./my-site
```

This produces:
- A working Astro project at `./my-site` with all content as Markdown files
- A scaffold prompt printed to stdout with the site's design data

### Step 2: Style with `/elite-style`

Copy the scaffold prompt output, paste it into Claude Code, and run `/elite-style`. The prompt contains everything the AI needs:

- Color palette with hex values
- Font families with `pnpm add @fontsource/...` install commands
- Full nav menu structure
- Layout type (full-width, sidebar-left, sidebar-right)
- Page types with hero/sidebar indicators
- File paths to modify

Claude Code generates styled Astro components:
- `src/components/Header.astro` — site header with navigation
- `src/components/Footer.astro` — site footer
- `src/layouts/BaseLayout.astro` — base layout
- `src/layouts/PostLayout.astro` — single post layout
- `src/pages/index.astro` — landing page
- `src/styles/global.css` — Tailwind `@theme` tokens

### Step 3: Review and deploy

```sh
cd my-site
pnpm install
pnpm dev        # Preview at localhost:4321
pnpm build      # Build for production
```

Deploy to Cloudflare Pages, Vercel, Netlify, or any static host. Redirects from old WordPress URLs are generated in `_redirects`.

## Architecture

```
packages/cli/src/
  cli.ts                    # Entry point
  types.ts                  # Shared interfaces
  commands/
    convert.ts              # Main conversion orchestration
    help.ts                 # Help text
  sources/
    rest-api.ts             # WP REST API client + scrape fallback
  transform/
    pipeline.ts             # Transform orchestrator
    shortcodes.ts           # WordPress shortcode processing
    images.ts               # Image download + URL rewriting
    html-to-markdown.ts     # Turndown config
    links.ts                # URL mapping + redirects
    frontmatter.ts          # YAML frontmatter serializer
  generate/
    project.ts              # Astro project scaffolding
    content.ts              # Write .md content files
    redirects.ts            # _redirects file
    comments.ts             # Comments JSON export
    templates.ts            # Astro template strings
  scrape/
    index.ts                # Scrape orchestrator
    fetcher.ts              # Page fetcher with timeout
    extract-colors.ts       # CSS color extraction
    extract-fonts.ts        # Font detection + Fontsource mapping
    extract-nav.ts          # Nav extraction (API + HTML)
    extract-layout.ts       # Sidebar + hero detection
    analyze-pages.ts        # Page type classification
    prompt.ts               # Scaffold prompt generator
  utils/
    args.ts                 # CLI argument parser
    spinner.ts              # Terminal spinner
    progress.ts             # Progress bar
    colors.ts               # ANSI colors
```

## Development

```sh
# Run tests
bun test

# Run CLI in dev
bun run dev -- convert --url https://example.com

# Build binary
bun run build
```

## Dependencies

- **[node-html-parser](https://github.com/nicholaslee119/node-html-parser)** — HTML parsing for scraping fallback and design extraction
- **[turndown](https://github.com/mixmark-io/turndown)** — HTML to Markdown conversion
- **Bun** — runtime, test runner, and bundler
