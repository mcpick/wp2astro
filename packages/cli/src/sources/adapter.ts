import type { WPPost, WPSite } from "../types.js";
import type { FetchResult } from "./rest-api.js";
import { RestApiAdapter } from "./rest-api.js";

export interface SourceAdapter {
  probe(): Promise<boolean>;
  fetchSite(): Promise<WPSite>;
  fetchPosts(onProgress?: (count: number, total: number) => void): Promise<FetchResult>;
  fetchPages(onProgress?: (count: number, total: number) => void): Promise<FetchResult>;
}

export function createAdapter(url: string): SourceAdapter {
  return new RestApiAdapter(url);
}
