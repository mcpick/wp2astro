export const packageJson = (name: string) => `{
  "name": "${name}",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^6.0.4",
    "@astrojs/check": "^0.9.7",
    "@tailwindcss/vite": "^4.2.1",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.8.2"
  }
}
`;

export const astroConfig = `import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
`;

export const globalCss = `@import "tailwindcss";
`;

export const tsConfig = `{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
`;

function toIdentifier(name: string): string {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export const contentConfig = (cptNames: string[] = []) => {
  const cptCollections = cptNames.map(name => {
    const id = toIdentifier(name);
    return `
const ${id} = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/${name}" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    slug: z.string(),
    lastModified: z.string().optional(),
    description: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});`;
  }).join("\n");

  const allEntries = [
    ...["posts", "pages"].map(n => n),
    ...cptNames.map(name => {
      const id = toIdentifier(name);
      return id === name ? name : `"${name}": ${id}`;
    }),
  ];

  return `import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    slug: z.string(),
    lastModified: z.string().optional(),
    description: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    slug: z.string(),
    lastModified: z.string().optional(),
    description: z.string().optional(),
  }),
});
${cptCollections}
export const collections = { ${allEntries.join(", ")} };
`;
};

export const baseLayout = `---
import "../styles/global.css";

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {description && <meta name="description" content={description} />}
    <title>{title}</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
  </body>
</html>
`;

export const postLayout = `---
import "../styles/global.css";

interface Props {
  title: string;
  date: string;
  description?: string;
  heroImage?: string;
  heroImageAlt?: string;
  categories?: string[];
  tags?: string[];
}

const { title, date, description, heroImage, heroImageAlt, categories, tags } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {description && <meta name="description" content={description} />}
    <title>{title}</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/blog">Blog</a>
      </nav>
    </header>
    <main>
      <article>
        <h1>{title}</h1>
        <time datetime={date}>{new Date(date).toLocaleDateString()}</time>
        {heroImage && <img src={heroImage} alt={heroImageAlt ?? ""} />}
        {categories && categories.length > 0 && (
          <div class="categories">
            {categories.map((cat) => <span>{cat}</span>)}
          </div>
        )}
        <slot />
        {tags && tags.length > 0 && (
          <div class="tags">
            {tags.map((tag) => <span>#{tag}</span>)}
          </div>
        )}
      </article>
    </main>
  </body>
</html>
`;

export const indexPage = (siteName: string) => `---
import BaseLayout from "../layouts/BaseLayout.astro";
import { getCollection } from "astro:content";

const posts = (await getCollection("posts")).sort(
  (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
);
---

<BaseLayout title="${siteName}">
  <h1>${siteName}</h1>
  <ul>
    {posts.map((post) => (
      <li>
        <a href={\`/blog/\${post.data.slug}\`}>
          <time datetime={post.data.date}>
            {new Date(post.data.date).toLocaleDateString()}
          </time>
          {" — "}
          {post.data.title}
        </a>
      </li>
    ))}
  </ul>
</BaseLayout>
`;

export const blogSlugPage = `---
import PostLayout from "../../layouts/PostLayout.astro";
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<PostLayout
  title={post.data.title}
  date={post.data.date}
  description={post.data.description}
  heroImage={post.data.heroImage}
  heroImageAlt={post.data.heroImageAlt}
  categories={post.data.categories}
  tags={post.data.tags}
>
  <Content />
</PostLayout>
`;

export const pageSlugPage = `---
import BaseLayout from "../layouts/BaseLayout.astro";
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const pages = await getCollection("pages");
  return pages.map((page) => ({
    params: { slug: page.data.slug },
    props: { page },
  }));
}

const { page } = Astro.props;
const { Content } = await render(page);
---

<BaseLayout title={page.data.title} description={page.data.description}>
  <h1>{page.data.title}</h1>
  <Content />
</BaseLayout>
`;

export const cptSlugPage = (collectionName: string) => `---
import PostLayout from "../../layouts/PostLayout.astro";
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const items = await getCollection("${collectionName}");
  return items.map((item) => ({
    params: { slug: item.data.slug },
    props: { item },
  }));
}

const { item } = Astro.props;
const { Content } = await render(item);
---

<PostLayout
  title={item.data.title}
  date={item.data.date}
  description={item.data.description}
  heroImage={item.data.heroImage}
  heroImageAlt={item.data.heroImageAlt}
  categories={item.data.categories}
  tags={item.data.tags}
>
  <Content />
</PostLayout>
`;
