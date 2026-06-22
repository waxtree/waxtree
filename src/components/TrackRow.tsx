import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Track } from '../types';

interface Props {
  track: Track;
  artistName: string;
  releaseTitle: string;
}

export function TrackRow({ track, artistName, releaseTitle }: Props) {
  const { liked, listenState, likeTrack, tickListen } = useStore(s => ({
    liked: !!s.likes[track.id],
    listenState: s.listens[track.id],
    likeTrack: s.likeTrack,
    tickListen: s.tickListen,
  }));

  const [listening, setListening] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  const badged = listenState?.badged ?? false;

  const handlePlay = () => {
    const q = encodeURIComponent(`${artistName} ${track.title}`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
    if (!badged) {
      setListening(true);
      tickRef.current = setInterval(() => tickListen(track.id), 1000);
    }
  };

  useEffect(() => {
    if (badged && tickRef.current) {
      clearInterval(tickRef.current);
      setListening(false);
    }
  }, [badged]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const ytQuery = `${artistName} - ${track.title} ${releaseTitle}`;

  return (
    <div className="track-row">
      {track.position && <span className="track-pos">{track.position}</span>}
      <span className="track-title">{track.title}</span>
      {track.duration && <span className="track-dur">{track.duration}</span>}
      <div className="track-actions">
        {badged && <span className="listened-badge">✓ ascoltata</span>}
        {listening && !badged && <span className="listening-dot" title="In ascolto…" />}
        <button
          className={`like-btn${liked ? ' like-btn--liked' : ''}`}
          onClick={() => likeTrack(track.id)}
          title={liked ? 'Rimuovi like' : 'Like'}
        >
          {liked ? '♥' : '♡'}
        </button>
        <button
          className="yt-btn"
          onClick={handlePlay}
          title={`Cerca "${ytQuery}" su YouTube`}
        >
          ▶ YT
        </button>
      </div>
    </div>
  );
}
