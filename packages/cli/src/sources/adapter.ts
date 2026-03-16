import type { WPMedia, WPPost, WPPostType, WPSite } from "../types.js";
import type { FetchResult } from "./rest-api.js";
import { RestApiAdapter } from "./rest-api.js";

export interface SourceAdapter {
  probe(): Promise<boolean>;
  fetchSite(): Promise<WPSite>;
  fetchPosts(onProgress?: (count: number, total: number) => void): Promise<FetchResult>;
  fetchPages(onProgress?: (count: number, total: number) => void): Promise<FetchResult>;
  fetchPostTypes(): Promise<WPPostType[]>;
  fetchCustomPosts(restBase: string, typeName: string, onProgress?: (count: number, total: number) => void): Promise<FetchResult>;
  fetchMediaByIds(ids: number[]): Promise<Map<number, WPMedia>>;
  fetchMediaByParent(parentId: number): Promise<WPMedia[]>;
}

export function createAdapter(url: string): SourceAdapter {
  return new RestApiAdapter(url);
}
