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
// re-poll something the browser is already telling us. mp3Url is the
// already-resolved Hard Wax track url (see playHardwaxPreview) — the
// actual bytes still only get fetched here, once this actually mounts
// (proxied through our own edge function, see getHardwaxAudioBlobUrl's
// own comment for why a direct src can't just point at hardwax.com).
export const HardwaxCustomControls = ({ trackId, mp3Url, actions }) => {
  const audioRef = useRef(null);
  const seekRef = useRef(null);
  const curRef = useRef(null);
  const durRef = useRef(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const blobUrl = actions.getHardwaxAudioBlobUrl(mp3Url);

  useEffect(() => {
    scrubbingRef.current = false;
    setPlaying(false);
  }, [trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !blobUrl) return;
    const onTime = () => {
      if (durRef.current && audio.duration > 0) durRef.current.textContent = fmtTime(audio.duration);
      if (scrubbingRef.current) return;
      if (seekRef.current && audio.duration > 0) seekRef.current.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      if (curRef.current) curRef.current.textContent = fmtTime(audio.currentTime);
    };
    const onPlay = () => setPlaying(true);
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

  const commitSeek = () => {
    const audio = audioRef.current;
    if (audio?.duration > 0) audio.currentTime = (Number(seekRef.current.value) / 1000) * audio.duration;
    scrubbingRef.current = false;
  };

  if (blobUrl === undefined) return <div className="bg-secondary px-3 py-2.5 text-center text-[11px] text-muted-foreground/70">Loading preview…</div>;
  if (!blobUrl) return <div className="bg-secondary px-3 py-2.5 text-center text-[11px] text-muted-foreground/70">Preview unavailable right now.</div>;

  return (
    <div className="flex items-center gap-2 bg-secondary px-3 py-2">
      <audio ref={audioRef} src={blobUrl} preload="metadata" />
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
        onInput={() => {
          scrubbingRef.current = true;
          const audio = audioRef.current;
          if (curRef.current && seekRef.current) curRef.current.textContent = fmtTime((Number(seekRef.current.value) / 1000) * (audio?.duration || 0));
        }}
        onChange={commitSeek}
        onMouseUp={commitSeek}
      />
      <span ref={durRef} className="w-[26px] shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">0:00</span>
    </div>
  );
};
