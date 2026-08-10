import { ArrowUpRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { StoreButton } from '@/components/waxtree/StoreButton';
import { TrackRow } from '@/components/waxtree/TrackRow';

const actionButton = 'inline-flex shrink-0 items-center whitespace-nowrap rounded-[20px] border-[1.5px] px-[11px] py-[5px] text-[11px] text-muted-foreground transition-colors';
const exploreHighlighted = 'border-primary/50 bg-primary/[.08] font-bold text-primary hover:border-primary hover:bg-primary/[.18]';
const exploreDefault = 'border-border hover:border-primary hover:text-primary';

export const ReleaseCard = ({ group, node, isLabel, state, actions }) => {
  const tracks = group.tracks;
  const first = tracks[0];
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const allPlayed = tracks.length > 0 && tracks.every(track => state.listens[track.id]?.badged);
  const listened = state.alreadyListened.includes(group.key);
  let primaryArtist = null;
  let variousArtists = false;
  if (isLabel) {
    const counts = tracks.reduce((result, track) => {
      if (track.label) result.set(track.label, (result.get(track.label) || 0) + 1);
      return result;
    }, new Map());
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0]?.[1] / tracks.length > 0.5) primaryArtist = ranked[0]?.[0] || null;
    else if (ranked.length > 1) variousArtists = true;
  }
  const yearLabel = [first.year, isLabel ? (variousArtists ? 'Various Artists' : primaryArtist) : first.label].filter(Boolean).join(' · ');
  const genres = first.genre ? first.genre.split(' · ') : [];
  const explore = [];
  if (first.label && !first.fromLabel) explore.push({ label: `Explore label: ${first.label}`, type: 'label', id: first.labelId, name: first.label, highlighted: true });
  tracks.forEach(track => {
    const credits = track.trackArtists?.length ? track.trackArtists : track.exploreName ? [{ id: track.exploreId, name: track.exploreName }] : [];
    credits.forEach(credit => { if (credit.name && !explore.some(item => item.id === credit.id && item.name === credit.name)) explore.push({ label: `${track.exploreLabel || 'Explore'}: ${credit.name}`, type: 'artist', id: credit.id, name: credit.name, highlighted: !!track.fromLabel }); });
  });
  const baseCounts = tracks.reduce((result, track) => {
    const key = actions.baseTitleKey(track.title);
    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map());
  tracks.forEach(track => {
    const candidate = actions.extractRemixCandidate(track.title, baseCounts.get(actions.baseTitleKey(track.title)) > 1);
    const resolved = candidate ? actions.getResolvedRemixArtist(candidate) : null;
    if (resolved && !explore.some(item => item.type === 'artist' && item.id === resolved.id)) explore.push({ label: `Explore remix artist: ${resolved.name}`, type: 'artist', id: resolved.id, name: resolved.name });
  });
  const releaseTitle = first.album || first.title;
  const bandcampDirect = actions.findBcMatch(node.id, releaseTitle) || tracks.map(track => actions.findBcMatch(node.id, track.title)).find(Boolean);
  const digitalOnly = tracks.some(track => track.digital) && !tracks.some(track => track.hasVinyl);

  const exploreItem = item => {
    if (item.id) actions.addNode(item.type, item.id, item.name, node.id, node.branchId);
    else { actions.mutateState(value => { value.q = item.name; }); actions.doSearch(); }
    setExploreOpen(false);
  };

  const highlightedExplore = explore.some(item => item.highlighted);

  return (
    <article data-release-key={group.key} className="flex items-start gap-3 rounded-[10px] border border-border bg-card px-[14px] py-[10px] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
      <div className="flex shrink-0 flex-col items-center gap-[6px]">
        {first.thumbUrl ? <img className="size-10 rounded-[6px] border border-border object-cover" src={first.thumbUrl} alt="" loading="lazy" /> : <div className="flex size-10 items-center justify-center rounded-[6px] border border-border bg-secondary text-[17px] text-muted-foreground/70">♫</div>}
        {(listened || allPlayed) && (
          <button
            type="button"
            title={listened ? 'Remove from Already Listened' : 'Move to Already Listened'}
            onClick={() => actions.mutateState(value => { value.alreadyListened = listened ? value.alreadyListened.filter(key => key !== group.key) : [...value.alreadyListened, group.key]; })}
            className={`flex size-[18px] items-center justify-center rounded-full border-[1.5px] transition hover:scale-110 ${listened ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground/70 hover:border-primary hover:text-primary'}`}
          >
            <Check className="size-2.5" />
          </button>
        )}
      </div>
      <div className="w-[200px] min-w-0 flex-[0_1_200px] pt-0.5">
        <h3 className="truncate text-sm font-bold">{releaseTitle}</h3>
        {yearLabel && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{yearLabel}</p>}
        {genres.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {genres.map(genre => {
              const color = actions.genreColor(genre);
              return <span key={genre} style={{ backgroundColor: `${color}1A`, borderColor: `${color}66`, color }} className="inline-block shrink-0 whitespace-nowrap rounded-[10px] border px-[7px] py-px text-[10px] font-bold leading-[1.6]">{genre}</span>;
            })}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        {tracks.map(track => (
          <TrackRow key={track.id} track={track} node={node} isLabel={isLabel} primaryArtist={primaryArtist} state={state} actions={actions} playlistOpen={openPlaylist === track.id} setPlaylistOpen={open => setOpenPlaylist(open ? track.id : null)} />
        ))}
      </div>
      <div className="flex max-w-[370px] shrink-0 flex-col items-end gap-[5px]">
        {explore.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-[5px]">
            {explore.length === 1 && <button type="button" onClick={() => exploreItem(explore[0])} className={`${actionButton} ${explore[0].highlighted ? exploreHighlighted : exploreDefault}`}>{explore[0].label} ›</button>}
            {explore.length > 1 && (
              <div className="relative shrink-0">
                <button type="button" onClick={() => setExploreOpen(value => !value)} className={`${actionButton} gap-1 ${highlightedExplore ? exploreHighlighted : exploreDefault}`}>
                  Explore {exploreOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
                {exploreOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[190px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--wt-shadow)]">
                    {explore.map(item => <button key={`${item.type}-${item.id}-${item.name}`} type="button" onClick={() => exploreItem(item)} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">{item.label}</button>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-[5px]">
          <StoreButton source="bc" directUrl={bandcampDirect} releaseTitle={releaseTitle} artist={isLabel ? first.label : node.name} label={isLabel ? node.name : first.label} isLabel={isLabel} actions={actions} />
          <StoreButton source="bp" releaseTitle={releaseTitle} artist={isLabel ? first.label : node.name} label={isLabel ? node.name : first.label} isLabel={isLabel} actions={actions} />
          {first.discogsUrl && !digitalOnly && <a href={first.discogsUrl} target="_blank" rel="noreferrer" className={`${actionButton} gap-0.5 border-border hover:border-primary hover:text-primary`}>Discogs<ArrowUpRight className="size-3" /></a>}
        </div>
      </div>
    </article>
  );
};
