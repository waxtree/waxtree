import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const fmtTime = seconds => {
  const s = isFinite(seconds) && seconds > 0 ? seconds : 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// Discogs-confirmed videos hide YouTube's native control bar (see
// createYtPlayer's controls:0) and get this one instead. Position/time
// are written straight to refs from a self-contained poll rather than
// through state — see ytGetSnapshot's own comment for why.
export const YtCustomControls = ({ trackId, actions }) => {
  const seekRef = useRef(null);
  const curRef = useRef(null);
  const durRef = useRef(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    scrubbingRef.current = false;
    setPlaying(false);
    const tick = () => {
      const snap = actions.ytGetSnapshot();
      if (!snap) return;
      setPlaying(prev => (prev !== snap.playing ? snap.playing : prev));
      if (durRef.current && snap.dur > 0) durRef.current.textContent = fmtTime(snap.dur);
      if (scrubbingRef.current) return;
      if (seekRef.current && snap.dur > 0) seekRef.current.value = String(Math.round((snap.cur / snap.dur) * 1000));
      if (curRef.current) curRef.current.textContent = fmtTime(snap.cur);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [trackId, actions]);

  const commitSeek = () => {
    actions.ytSeekFraction(Number(seekRef.current.value) / 1000);
    scrubbingRef.current = false;
  };

  return (
    <div className="flex items-center gap-2 bg-secondary px-3 py-2">
      <button type="button" title="Play/pause" onClick={() => actions.ytTogglePlayPause()} className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90">
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
          const snap = actions.ytGetSnapshot();
          if (curRef.current && seekRef.current) curRef.current.textContent = fmtTime((Number(seekRef.current.value) / 1000) * (snap?.dur || 0));
        }}
        onChange={commitSeek}
        onMouseUp={commitSeek}
      />
      <span ref={durRef} className="w-[26px] shrink-0 text-center text-[10px] tabular-nums text-muted-foreground">0:00</span>
    </div>
  );
};
