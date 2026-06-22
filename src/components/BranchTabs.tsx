import { useState } from 'react';
import { useStore } from '../store';
import type { Branch } from '../types';

function BranchTab({ branch, isActive }: { branch: Branch; isActive: boolean }) {
  const { setActiveBranch, removeBranch, renameBranch, togglePinBranch } = useStore(s => ({
    setActiveBranch: s.setActiveBranch,
    removeBranch: s.removeBranch,
    renameBranch: s.renameBranch,
    togglePinBranch: s.togglePinBranch,
  }));
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(branch.name);

  const commit = () => {
    setEditing(false);
    if (tmp.trim()) renameBranch(branch.id, tmp.trim());
    else setTmp(branch.name);
  };

  return (
    <div
      className={`branch-tab${isActive ? ' branch-tab--active' : ''}${branch.pinned ? ' branch-tab--pinned' : ''}`}
      onClick={() => setActiveBranch(branch.id)}
    >
      {editing ? (
        <input
          className="branch-tab__input"
          value={tmp}
          onChange={e => setTmp(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setTmp(branch.name); } }}
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="branch-tab__name"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true); setTmp(branch.name); }}
          title="Doppio click per rinominare"
        >
          {branch.name}
        </span>
      )}
      <button
        className="branch-tab__pin"
        onClick={e => { e.stopPropagation(); togglePinBranch(branch.id); }}
        title={branch.pinned ? 'Sblocca' : 'Fissa'}
      >
        {branch.pinned ? '★' : '☆'}
      </button>
      <button
        className="branch-tab__close"
        onClick={e => { e.stopPropagation(); removeBranch(branch.id); }}
        title="Chiudi ramo"
      >
        ✕
      </button>
    </div>
  );
}

export function BranchTabs() {
  const { branches, activeBranchId, addBranch } = useStore(s => ({
    branches: s.branches,
    activeBranchId: s.activeBranchId,
    addBranch: s.addBranch,
  }));

  const sorted = [...branches].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="branch-tabs">
      {sorted.map(b => (
        <BranchTab key={b.id} branch={b} isActive={b.id === activeBranchId} />
      ))}
      <button className="add-branch-btn" onClick={addBranch} title="Nuovo ramo">+</button>
    </div>
  );
}
