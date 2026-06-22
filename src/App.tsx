import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { BranchTabs } from './components/BranchTabs';
import { SearchPanel } from './components/SearchPanel';
import { ArtistNode } from './components/ArtistNode';
import { ThemeToggle } from './components/ThemeToggle';

function BranchView({ branchId }: { branchId: string }) {
  const branch = useStore(s => s.branches.find(b => b.id === branchId));
  const { addTag, removeTag } = useStore(s => ({ addTag: s.addTag, removeTag: s.removeTag }));
  const [tagInput, setTagInput] = useState('');
  const latestNodeRef = useRef<HTMLDivElement>(null);

  const handleNodeAdded = () => {
    setTimeout(() => latestNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submitTag = () => {
    const t = tagInput.trim();
    if (t) { addTag(branchId, t); setTagInput(''); }
  };

  if (!branch) return null;

  return (
    <>
      {/* Tag bar */}
      <div className="branch-header">
        <div className="branch-tags">
          {branch.tags.map(tag => (
            <span key={tag} className="branch-tag">
              {tag}
              <button className="branch-tag__rm" onClick={() => removeTag(branchId, tag)}>✕</button>
            </span>
          ))}
        </div>
        <div className="tag-input-wrap">
          <input
            className="tag-input"
            placeholder="Aggiungi tag…"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTag(); }}
          />
          <button className="tag-add-btn" onClick={submitTag}>+</button>
        </div>
      </div>

      <SearchPanel branchId={branchId} onNodeAdded={handleNodeAdded} />

      {branch.rootIds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🌿</div>
          <div className="empty-state__title">Ramo vuoto</div>
          <div className="empty-state__sub">Cerca un artista per iniziare a costruire l'albero</div>
        </div>
      ) : (
        <div className="tree">
          {branch.rootIds.map((id, i) => (
            <div key={id} ref={i === branch.rootIds.length - 1 ? latestNodeRef : undefined}>
              <ArtistNode branchId={branchId} nodeId={id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function App() {
  const { theme, activeBranchId } = useStore(s => ({ theme: s.theme, activeBranchId: s.activeBranchId }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">Crate<span>Tree</span></div>
        <div className="app-spacer" />
        <ThemeToggle />
      </header>
      <BranchTabs />
      <main className="main">
        <BranchView key={activeBranchId} branchId={activeBranchId} />
      </main>
    </div>
  );
}
