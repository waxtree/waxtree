import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArtistNode } from '../components/ArtistNode';
import { BranchTabs } from '../components/BranchTabs';
import { BrandMark } from '../components/BrandMark';
import { SearchPanel } from '../components/SearchPanel';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useStore, snapshotFromState } from '../store';

function BranchView({ branchId }: { branchId: string }) {
  const branch = useStore(state => state.branches.find(item => item.id === branchId));
  const { addTag, removeTag } = useStore(state => ({ addTag: state.addTag, removeTag: state.removeTag }));
  const [tagInput, setTagInput] = useState('');
  const latestNodeRef = useRef<HTMLDivElement>(null);

  const handleNodeAdded = () => {
    setTimeout(() => latestNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submitTag = () => {
    const tag = tagInput.trim();
    if (!tag || !branch) return;
    addTag(branch.id, tag);
    setTagInput('');
  };

  if (!branch) return null;

  return (
    <>
      <div className="branch-header">
        <div className="branch-tags">
          {branch.tags.map(tag => (
            <span key={tag} className="branch-tag">
              {tag}
              <button className="branch-tag__rm" onClick={() => removeTag(branch.id, tag)} aria-label={`Remove ${tag}`}>
                x
              </button>
            </span>
          ))}
        </div>
        <div className="tag-input-wrap">
          <input
            className="tag-input"
            placeholder="Add tag"
            value={tagInput}
            onChange={event => setTagInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') submitTag();
            }}
          />
          <button className="tag-add-btn" onClick={submitTag}>
            +
          </button>
        </div>
      </div>

      <SearchPanel branchId={branch.id} onNodeAdded={handleNodeAdded} />

      {branch.rootIds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">WT</div>
          <div className="empty-state__title">Empty branch</div>
          <div className="empty-state__sub">Search an artist to start building this tree.</div>
        </div>
      ) : (
        <div className="tree">
          {branch.rootIds.map((id, index) => (
            <div key={id} ref={index === branch.rootIds.length - 1 ? latestNodeRef : undefined}>
              <ArtistNode branchId={branch.id} nodeId={id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CloudStateBridge() {
  const { user } = useAuth();
  const restoreSnapshot = useStore(state => state.restoreSnapshot);
  const [status, setStatus] = useState('Local');

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function hydrate() {
      setStatus('Syncing');
      const { data, error } = await supabase
        .from('user_state')
        .select('data,updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (disposed) return;
      if (error) {
        setStatus('Local');
        return;
      }

      const remote = data?.data;
      const local = snapshotFromState(useStore.getState());
      const localHasTree = local.branches.some(branch => branch.rootIds.length > 0);
      if (!localHasTree && remote && Array.isArray(remote.branches)) {
        restoreSnapshot(remote);
      }
      setStatus('Saved');
    }

    void hydrate();

    const unsubscribe = useStore.subscribe(state => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        setStatus('Syncing');
        const payload = snapshotFromState(state);
        const { error } = await supabase.from('user_state').upsert({
          user_id: userId,
          data: payload,
        });
        if (!disposed) setStatus(error ? 'Local' : 'Saved');
      }, 900);
    });

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [restoreSnapshot, user]);

  return <span className="sync-pill">{status}</span>;
}

function AccountMenu() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    navigate('/login', { replace: true });
  }

  async function deleteAccount() {
    if (!session) return;
    const confirmed = window.confirm('Delete this account and all synced WaxTree data? This cannot be undone.');
    if (!confirmed) return;
    setBusy(true);
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      window.alert(body?.error ?? 'Could not delete account.');
      return;
    }
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="account-menu">
      <button className="account-trigger" onClick={() => setOpen(value => !value)}>
        {user?.email?.slice(0, 2).toUpperCase() ?? 'ME'}
      </button>
      {open && (
        <div className="account-popover">
          <div className="account-popover__identity">
            <strong>{user?.user_metadata?.username ?? 'WaxTree user'}</strong>
            <span>{user?.email}</span>
          </div>
          <Link to="/admin" className="account-popover__item">
            Admin
          </Link>
          <button className="account-popover__item" onClick={signOut} disabled={busy}>
            Sign out
          </button>
          <button className="account-popover__item account-popover__item--danger" onClick={deleteAccount} disabled={busy}>
            Delete account
          </button>
        </div>
      )}
    </div>
  );
}

export function AppPage() {
  const { theme, activeBranchId } = useStore(state => ({
    theme: state.theme,
    activeBranchId: state.activeBranchId,
  }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <BrandMark compact />
        <div className="app-spacer" />
        <CloudStateBridge />
        <ThemeToggle />
        <AccountMenu />
      </header>
      <BranchTabs />
      <main className="main" data-sc="main">
        <BranchView key={activeBranchId} branchId={activeBranchId} />
      </main>
    </div>
  );
}
