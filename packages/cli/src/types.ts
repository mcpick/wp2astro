export interface WPSite {
  name: string;
  description: string;
  url: string;
  wpVersion: string;
}

export interface WPPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  modified: string;
  status: string;
  type: string;
  link: string;
  featuredImage?: WPMedia;
  categories: WPTaxonomy[];
  tags: WPTaxonomy[];
  comments: WPComment[];
}

export interface WPMedia {
  id: number;
  url: string;
  alt: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface WPTaxonomy {
  id: number;
  name: string;
  slug: string;
}

export interface WPComment {
  id: number;
  author: string;
  date: string;
  content: string;
  parent: number;
}

export interface AstroContent {
  slug: string;
  type: string;
  frontmatter: Record<string, unknown>;
  markdown: string;
}

export interface WPPostType {
  name: string;
  slug: string;
  restBase: string;
  label: string;
}

export interface ImageRef {
  originalUrl: string;
  localPath: string;
  filename: string;
}

export interface ConvertContext {
  url: string;
  output: string;
  downloadImages: boolean;
  site: WPSite;
  posts: WPPost[];
  pages: WPPost[];
  images: ImageRef[];
  content: AstroContent[];
  errors: ConvertError[];
  urlMap: Map<string, string>;
}

export interface ConvertError {
  phase: string;
  message: string;
  item?: string;
}
