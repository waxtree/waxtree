export type Theme = 'dark' | 'light';

export interface Track {
  id: string;
  releaseId: number;
  position?: string;
  title: string;
  duration?: string;
}

export interface Release {
  id: number;
  title: string;
  year?: number;
  genre?: string;
  style?: string;
  format?: string;
  label?: string;
  labelId?: number;
  catno?: string;
  thumb?: string;
  discogsUrl: string;
  resourceUrl: string;
  tracks?: Track[];
  tracksLoaded: boolean;
  expanded: boolean;
}

export interface ArtistData {
  id: number;
  name: string;
  bio?: string;
  imageUrl?: string;
  aliases?: Array<{ id: number; name: string }>;
  namevariations?: string[];
  realname?: string;
  urls?: string[];
  releases: Release[];
  releasesLoaded: boolean;
  releasesPage: number;
  releasesTotal: number;
}

export interface TreeNode {
  id: string;
  type: 'artist' | 'label';
  discogsId: number;
  name: string;
  loaded: boolean;
  loading: boolean;
  error?: string;
  expanded: boolean;
  childIds: string[];
  data?: ArtistData;
}

export interface Branch {
  id: string;
  name: string;
  pinned: boolean;
  tags: string[];
  rootIds: string[];
  nodes: Record<string, TreeNode>;
  createdAt: number;
}

export interface DiscogsSearchResult {
  id: number;
  type: string;
  title: string;
  thumb?: string;
  uri?: string;
}

export interface ListenState {
  seconds: number;
  badged: boolean;
}
