import { Moon, Sun, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search } from '@/components/waxtree/Search';

export const Header = ({ state, session, actions }) => {
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Profile';
  // Total nodes across every branch, not search-bar use — see addNode's
  // own comment in waxTreeEngine.jsx for why.
  const level = actions.getLevelFromCount(state.nodes.length);
  const playlistCount = state.dasAscoltare.length + state.playlists.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
  const avatar = actions.getAvatarUrl();

  return (
    <header className="flex h-[50px] shrink-0 items-center gap-3.5 border-b border-border bg-card px-[18px]">
      <div className="flex shrink-0 items-center gap-3">
        <img className="h-10 w-10 object-contain" src="/logo.svg" alt="" />
        <span className="text-2xl font-bold text-primary">WaxTree</span>
        <span className="self-end pb-1 text-[13px] font-medium text-muted-foreground/70">Beta v.1</span>
      </div>
      <Search state={state} actions={actions} />
      <div className="flex-1" />
      <Button
        variant="outline"
        className={`h-auto gap-1 rounded-full px-3 py-1 text-xs ${playlistCount ? 'border-primary text-primary' : 'text-muted-foreground'}`}
        onClick={() => actions.mutateState(value => { value.playlistsModal = true; })}
      >
        <Tag className="size-3.5" /> Playlists{playlistCount > 0 && <span className="font-bold">{playlistCount}</span>}
      </Button>
      <Badge asChild className="h-auto cursor-pointer rounded-full border border-primary bg-primary/10 px-3 py-1 text-[11px] text-primary">
        <button type="button" onClick={() => actions.mutateState(value => { value.profileModal = true; })}>{level.title}</button>
      </Badge>
      <div className="relative">
        <Button variant="outline" className="h-auto rounded-full px-3 py-1 text-xs text-muted-foreground" onClick={event => { event.stopPropagation(); actions.mutateState(value => { value.profileOpen = !value.profileOpen; }); }}>Profile</Button>
        {state.profileOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-[500] min-w-[185px] overflow-hidden rounded-[14px] border border-border bg-card p-1 shadow-[var(--wt-shadow)]">
            <button
              type="button"
              onClick={() => actions.mutateState(value => { value.profileOpen = false; value.profileModal = true; })}
              className="mb-1 flex w-full items-center gap-2.5 rounded-lg border-b border-border px-3 py-2 text-left hover:bg-muted"
            >
              {avatar ? <img className="size-9 rounded-full object-cover" src={avatar} alt="" /> : <div className="flex size-9 items-center justify-center rounded-full bg-secondary font-bold text-primary">{username.slice(0, 2).toUpperCase()}</div>}
              <span className="text-xs font-semibold">{username}</span>
            </button>
            {[['Libraries', 'librariesModal'], ['Settings', 'settingsModal'], ['Likes', 'likesModal'], ['Follows', 'followsModal'], ['History', 'historyModal']].map(([label, key]) => (
              <button key={key} type="button" onClick={() => actions.mutateState(value => { value.profileOpen = false; value[key] = true; })} className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] hover:bg-muted">{label}</button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={async () => { await actions.supabase.auth.signOut(); Object.keys(localStorage).filter(key => key.startsWith('sb-')).forEach(key => localStorage.removeItem(key)); window.location.href = '/login'; }}
              className="block w-full rounded-lg px-3.5 py-2 text-left text-[13px] text-destructive hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
      <Button variant="secondary" size="icon" className="rounded-full" onClick={() => actions.setTheme(state.theme === 'dark' ? 'light' : 'dark')}>
        {state.theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </header>
  );
};
