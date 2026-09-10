import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const fmtTime = seconds => {
  const s = isFinite(seconds) && seconds > 0 ? seconds : 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// Same look as YtCustomControls, backed by a real <audio> element instead
// of the YouTube iframe API — which means real events instead of a poll:
// YtCustomControls polls because getCurrentTime() is genuinely all the YT
// postMessage API offers, but a native <audio> element already fires
// timeupdate/play/pause/loadedmetadata directly, so there's no reason to
// re-poll something the browser is already telling us. Source of the clip
// (source: 'deezer' | 'hardwax' | 'yoyaku' | 'deejay' | 'clone' — see
// TrackRow.jsx). Two of the five resolve their url HERE rather than
// arriving with a ready mp3Url:
//   - 'hardwax': media.hardwax.com blocks a direct in-browser load by
//     Sec-Fetch-Site (see getHardwaxAudioBlobUrl), so it's proxied
//     through our edge function and only pulls the bytes once this mounts.
//   - 'deezer': the 30s preview url is signed and expires ~15 min after
//     issue, so only the numeric track id was cached — getDeezerPreviewUrl
//     fetches a fresh url now, at mount, keyed off nowPlaying.deezerId.
// Yoyaku's, Deejay.de's and Clone.nl's mp3s (and Deezer's, once resolved)
// all serve cross-origin fine to an <audio> element — playable directly.
export const AudioPreviewControls = ({ trackId, mp3Url, source, deezerId, title, artistName, actions }) => {
  const audioRef = useRef(null);
  const seekRef = useRef(null);
  const curRef = useRef(null);
  const durRef = useRef(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const blobUrl = source === 'hardwax' ? actions.getHardwaxAudioBlobUrl(mp3Url)
    : source === 'deezer' ? actions.getDeezerPreviewUrl(deezerId)
    : mp3Url;

  useEffect(() => {
    scrubbingRef.current = false;
    setPlaying(false);
  }, [trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !blobUrl) return;
    const onTime = () => {
      if (durRef.current && audio.duration > 0) durRef.current.textContent = fmtTime(audio.duration);
      // Don't touch the handle while the user is dragging it, nor while a
      // commited seek is still landing — a stray timeupdate mid-seek
      // still reports the OLD position and would yank the handle back.
      if (scrubbingRef.current || audio.seeking) return;
      if (seekRef.current && audio.duration > 0) seekRef.current.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      if (curRef.current) curRef.current.textContent = fmtTime(audio.currentTime);
    };
    // Same "badge it the instant playback actually starts" moment the
    // YouTube player already gets (see badgeListened/tryBadge in the
    // engine) — this fallback player has no ytTid of its own to hook
    // into that mechanism, so it calls the same badging logic directly
    // instead. Confirmed live 2026-09-04: a track played only via this
    // preview never got marked Listened at all before this.
    const onPlay = () => { setPlaying(true); actions.badgeListened(trackId, title, artistName); };
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.play().catch(() => {}); // autoplay can be blocked silently — the play/pause button still works either way
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [blobUrl]);

  // Fires continuously as the handle moves (React aliases a range input's
  // onChange to its input event) — the clip is fully buffered
  // (preload="auto"), so seeking on every tick just scrubs smoothly.
  const seekTo = () => {
    const audio = audioRef.current;
    const dur = audio?.duration;
    if (!audio || !seekRef.current || !Number.isFinite(dur) || dur <= 0) return;
    const frac = Math.min(1, Math.max(0, Number(seekRef.current.value) / 1000));
    if (!Number.isFinite(frac)) return;
    audio.currentTime = frac * dur;
    if (curRef.current) curRef.current.textContent = fmtTime(audio.currentTime);
  };

  if (blobUrl === undefined) return <div className="bg-secondary px-3 py-2.5 text-center text-[11px] text-muted-foreground/70">Loading preview…</div>;
  if (!blobUrl) return <div className="bg-secondary px-3 py-2.5 text-center text-[11px] text-muted-foreground/70">Preview unavailable right now.</div>;

  return (
    <div className="flex items-center gap-2 bg-secondary px-3 py-2">
      {/* preload="auto": the whole (30s–2min) clip lands in memory up
          front, so dragging the scrub handle anywhere is instant instead
          of stalling on a range request the CDN may be slow to serve. */}
      <audio ref={audioRef} src={blobUrl} preload="auto" />
      <button
        type="button"
        title="Play/pause"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) audio.play();
          else audio.pause();
        }}
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
      >
        {playing ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
      </button>
      <span ref={curRef} className="w-[26px] shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">0:00</span>
      <input
        ref={seekRef}
        type="range"
        min="0"
        max="1000"
        defaultValue="0"
        className="h-1 flex-1 cursor-pointer accent-primary"
        onPointerDown={() => { scrubbingRef.current = true; }}
        onPointerUp={() => { scrubbingRef.current = false; }}
        onPointerCancel={() => { scrubbingRef.current = false; }}
        onKeyDown={() => { scrubbingRef.current = true; }}
        onKeyUp={() => { scrubbingRef.current = false; }}
        onBlur={() => { scrubbingRef.current = false; }}
        onChange={seekTo}
      />
      <span ref={durRef} className="w-[26px] shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">0:00</span>
    </div>
  );
};
