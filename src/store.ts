import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch, ArtistData, Release, Theme, Track, TreeNode, ListenState } from './types';

let nodeSeq = 0;
const uid = () => `n${++nodeSeq}-${Date.now()}`;

interface Store {
  theme: Theme;
  branches: Branch[];
  activeBranchId: string;
  likes: Record<string, boolean>;
  listens: Record<string, ListenState>;

  toggleTheme: () => void;

  addBranch: () => string;
  removeBranch: (id: string) => void;
  renameBranch: (id: string, name: string) => void;
  togglePinBranch: (id: string) => void;
  addTag: (branchId: string, tag: string) => void;
  removeTag: (branchId: string, tag: string) => void;
  setActiveBranch: (id: string) => void;

  addRootNode: (branchId: string, type: TreeNode['type'], discogsId: number, name: string) => string;
  addChildNode: (branchId: string, parentId: string, type: TreeNode['type'], discogsId: number, name: string) => string;
  setNodeLoading: (branchId: string, nodeId: string, v: boolean) => void;
  setNodeData: (branchId: string, nodeId: string, data: ArtistData) => void;
  setNodeError: (branchId: string, nodeId: string, error: string) => void;
  toggleNodeExpanded: (branchId: string, nodeId: string) => void;

  setReleaseTracks: (branchId: string, nodeId: string, releaseId: number, tracks: Track[]) => void;
  toggleReleaseExpanded: (branchId: string, nodeId: string, releaseId: number) => void;

  likeTrack: (trackId: string) => void;
  tickListen: (trackId: string) => void;
}

const mkBranch = (name: string): Branch => ({
  id: uid(),
  name,
  pinned: false,
  tags: [],
  rootIds: [],
  nodes: {},
  createdAt: Date.now(),
});

const mkNode = (type: TreeNode['type'], discogsId: number, name: string): TreeNode => ({
  id: uid(),
  type,
  discogsId,
  name,
  loaded: false,
  loading: false,
  expanded: true,
  childIds: [],
});

function patchBranch(branches: Branch[], branchId: string, fn: (b: Branch) => Branch): Branch[] {
  return branches.map(b => b.id === branchId ? fn(b) : b);
}

function patchNode(b: Branch, nodeId: string, fn: (n: TreeNode) => TreeNode): Branch {
  return { ...b, nodes: { ...b.nodes, [nodeId]: fn(b.nodes[nodeId]) } };
}

function patchRelease(b: Branch, nodeId: string, releaseId: number, fn: (r: Release) => Release): Branch {
  const node = b.nodes[nodeId];
  if (!node?.data) return b;
  return patchNode(b, nodeId, n => ({
    ...n,
    data: { ...n.data!, releases: n.data!.releases.map(r => r.id === releaseId ? fn(r) : r) },
  }));
}

const firstBranch = mkBranch('Ramo 1');

export const useStore = create<Store>()(
  persist(
    (set) => ({
      theme: 'dark',
      branches: [firstBranch],
      activeBranchId: firstBranch.id,
      likes: {},
      listens: {},

      toggleTheme: () =>
        set(s => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          return { theme: next };
        }),

      addBranch: () => {
        const b = mkBranch(`Ramo ${Date.now().toString().slice(-3)}`);
        set(s => ({ branches: [...s.branches, b], activeBranchId: b.id }));
        return b.id;
      },
      removeBranch: (id) =>
        set(s => {
          const next = s.branches.filter(b => b.id !== id);
          if (next.length === 0) {
            const nb = mkBranch('Ramo 1');
            return { branches: [nb], activeBranchId: nb.id };
          }
          const active = s.activeBranchId === id
            ? (next.find(b => b.pinned) ?? next[next.length - 1]).id
            : s.activeBranchId;
          return { branches: next, activeBranchId: active };
        }),
      renameBranch: (id, name) =>
        set(s => ({ branches: patchBranch(s.branches, id, b => ({ ...b, name })) })),
      togglePinBranch: (id) =>
        set(s => ({ branches: patchBranch(s.branches, id, b => ({ ...b, pinned: !b.pinned })) })),
      addTag: (branchId, tag) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          b.tags.includes(tag) ? b : { ...b, tags: [...b.tags, tag] }
        )})),
      removeTag: (branchId, tag) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          ({ ...b, tags: b.tags.filter(t => t !== tag) })
        )})),
      setActiveBranch: (id) => set({ activeBranchId: id }),

      addRootNode: (branchId, type, discogsId, name) => {
        const node = mkNode(type, discogsId, name);
        set(s => ({ branches: patchBranch(s.branches, branchId, b => ({
          ...b,
          rootIds: [...b.rootIds, node.id],
          nodes: { ...b.nodes, [node.id]: node },
        }))}));
        return node.id;
      },
      addChildNode: (branchId, parentId, type, discogsId, name) => {
        const node = mkNode(type, discogsId, name);
        set(s => ({ branches: patchBranch(s.branches, branchId, b => ({
          ...b,
          nodes: {
            ...b.nodes,
            [node.id]: node,
            [parentId]: { ...b.nodes[parentId], childIds: [...b.nodes[parentId].childIds, node.id] },
          },
        }))}));
        return node.id;
      },
      setNodeLoading: (branchId, nodeId, v) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b => patchNode(b, nodeId, n => ({ ...n, loading: v })))})),
      setNodeData: (branchId, nodeId, data) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          patchNode(b, nodeId, n => ({ ...n, data, loaded: true, loading: false, error: undefined }))
        )})),
      setNodeError: (branchId, nodeId, error) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          patchNode(b, nodeId, n => ({ ...n, error, loading: false }))
        )})),
      toggleNodeExpanded: (branchId, nodeId) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          patchNode(b, nodeId, n => ({ ...n, expanded: !n.expanded }))
        )})),

      setReleaseTracks: (branchId, nodeId, releaseId, tracks) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          patchRelease(b, nodeId, releaseId, r => ({ ...r, tracks, tracksLoaded: true }))
        )})),
      toggleReleaseExpanded: (branchId, nodeId, releaseId) =>
        set(s => ({ branches: patchBranch(s.branches, branchId, b =>
          patchRelease(b, nodeId, releaseId, r => ({ ...r, expanded: !r.expanded }))
        )})),

      likeTrack: (trackId) =>
        set(s => ({ likes: { ...s.likes, [trackId]: !s.likes[trackId] } })),
      tickListen: (trackId) =>
        set(s => {
          const prev = s.listens[trackId] ?? { seconds: 0, badged: false };
          const seconds = prev.seconds + 1;
          const badged = prev.badged || seconds >= 60;
          return { listens: { ...s.listens, [trackId]: { seconds, badged } } };
        }),
    }),
    {
      name: 'crate-tree-v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
