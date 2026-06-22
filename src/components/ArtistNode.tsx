import { useEffect, useState } from 'react';
import { fetchArtist, fetchReleaseTracks } from '../api/discogs';
import { useStore } from '../store';
import type { TreeNode } from '../types';
import { TrackRow } from './TrackRow';

interface Props {
  branchId: string;
  nodeId: string;
  depth?: number;
}

export function ArtistNode({ branchId, nodeId, depth = 0 }: Props) {
  const node = useStore(s => s.branches.find(b => b.id === branchId)?.nodes[nodeId]);
  const {
    setNodeLoading, setNodeData, setNodeError,
    toggleNodeExpanded, addChildNode,
    toggleReleaseExpanded, setReleaseTracks,
  } = useStore(s => ({
    setNodeLoading: s.setNodeLoading,
    setNodeData: s.setNodeData,
    setNodeError: s.setNodeError,
    toggleNodeExpanded: s.toggleNodeExpanded,
    addChildNode: s.addChildNode,
    toggleReleaseExpanded: s.toggleReleaseExpanded,
    setReleaseTracks: s.setReleaseTracks,
  }));

  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    if (!node || node.loaded || node.loading) return;
    setNodeLoading(branchId, nodeId, true);
    fetchArtist(node.discogsId)
      .then(data => setNodeData(branchId, nodeId, data))
      .catch(e => setNodeError(branchId, nodeId, (e as Error).message));
  }, [node?.discogsId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;

  const handleAliasClick = (id: number, name: string) => {
    const childId = addChildNode(branchId, nodeId, 'artist', id, name);
    void childId;
  };

  const handleReleaseExpand = async (releaseId: number) => {
    toggleReleaseExpanded(branchId, nodeId, releaseId);
    const rel = node.data?.releases.find(r => r.id === releaseId);
    if (rel && !rel.tracksLoaded && !rel.expanded) {
      try {
        const tracks = await fetchReleaseTracks(releaseId);
        setReleaseTracks(branchId, nodeId, releaseId, tracks);
      } catch { /* ignore track load error */ }
    }
  };

  const data = node.data;
  const bio = data?.bio;
  const bioLong = bio && bio.length > 280;

  const urlLabel = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  };

  return (
    <div className={`artist-node${node.loading ? ' artist-node--loading' : ''}`}>
      {/* Header — click to collapse/expand body */}
      <div className="artist-header" onClick={() => toggleNodeExpanded(branchId, nodeId)}>
        {data?.imageUrl
          ? <img className="artist-avatar" src={data.imageUrl} alt={node.name} />
          : <div className="artist-avatar-ph">🎵</div>}
        <div className="artist-meta">
          <div className="artist-name">{node.name}</div>
          {data?.realname && <div className="artist-realname">{data.realname}</div>}
          {data?.aliases && data.aliases.length > 0 && (
            <div className="artist-aliases" onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 11, color: 'var(--text-f)', marginRight: 4 }}>aka</span>
              {data.aliases.slice(0, 8).map(a => (
                <span
                  key={a.id}
                  className="alias-chip"
                  onClick={() => handleAliasClick(a.id, a.name)}
                  title={`Apri "${a.name}" nel ramo`}
                >
                  {a.name}
                </span>
              ))}
              {data.namevariations && data.namevariations.slice(0, 4).map(v => (
                <span key={v} className="alias-chip alias-chip--variation" title="Variante del nome">{v}</span>
              ))}
            </div>
          )}
        </div>
        {node.loading && <span style={{ color: 'var(--text-f)', fontSize: 12 }}>…</span>}
        {!node.loading && (
          <span className={`expand-chevron${node.expanded ? ' expand-chevron--open' : ''}`}>▶</span>
        )}
      </div>

      {node.error && <div className="error-msg">Errore: {node.error}</div>}

      {node.expanded && data && (
        <div className="artist-body">
          {/* Bio */}
          {bio && (
            <div>
              <div className={`artist-bio${bioExpanded ? ' artist-bio--expanded' : ''}`}>
                {bio}
              </div>
              {bioLong && (
                <div className="bio-toggle" onClick={() => setBioExpanded(v => !v)}>
                  {bioExpanded ? '▲ meno' : '▼ leggi tutto'}
                </div>
              )}
              <div className="bio-source">Fonte: Discogs community — discogs.com/artist/{data.id}</div>
            </div>
          )}

          {/* External URLs */}
          {data.urls && data.urls.length > 0 && (
            <div className="artist-urls">
              {data.urls.slice(0, 6).map(url => (
                <a key={url} className="url-chip" href={url} target="_blank" rel="noreferrer">{urlLabel(url)}</a>
              ))}
            </div>
          )}

          {/* Releases */}
          {data.releases.length > 0 && (
            <>
              <div className="section-title">Uscite ({data.releasesTotal})</div>
              <div className="releases">
                {data.releases.slice(0, 30).map(release => (
                  <div key={release.id} className="release-row">
                    <div className="release-header" onClick={() => handleReleaseExpand(release.id)}>
                      {release.thumb
                        ? <img className="release-thumb" src={release.thumb} alt="" />
                        : <div className="release-thumb-ph">💿</div>}
                      <div className="release-info">
                        <div className="release-title">{release.title}</div>
                        <div className="release-meta">
                          {[release.year, release.label, release.catno, release.format].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="release-actions" onClick={e => e.stopPropagation()}>
                        <a
                          className="release-ext-link"
                          href={release.discogsUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Apri su Discogs"
                        >
                          Discogs ↗
                        </a>
                        <span style={{ color: 'var(--text-f)', fontSize: 12 }}>
                          {release.expanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {release.expanded && (
                      <div className="track-list">
                        {!release.tracksLoaded && (
                          <div className="search-spinner" style={{ padding: '10px 12px' }}>Caricamento tracce…</div>
                        )}
                        {release.tracks?.map(t => (
                          <TrackRow
                            key={t.id}
                            track={t}
                            artistName={node.name}
                            releaseTitle={release.title}
                          />
                        ))}
                        {release.tracksLoaded && release.tracks?.length === 0 && (
                          <div className="search-spinner" style={{ padding: '10px 12px' }}>Nessuna traccia trovata</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Child nodes (non-destructive tree) */}
      {node.childIds.length > 0 && (
        <div className="tree-children" style={{ padding: '0 14px 14px 28px' }}>
          {node.childIds.map(cid => (
            <ArtistNode key={cid} branchId={branchId} nodeId={cid} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
