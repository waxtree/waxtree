import { buttonSecondary } from '@/lib/waxtreeUi';

// Stops 260px short of the right edge at the same min-[901px] breakpoint
// RightPanel itself uses (max-[900px]:hidden there) — leaving its own
// mini-player/transport/Related-Tracks column uncovered and clickable
// instead of hidden behind this backdrop, so a track already playing can
// still be scrubbed or swapped for a related pick while any modal (e.g.
// Playlists) is open on top of the rest of the app. Below that width
// RightPanel isn't a real, present grid column anyway (hidden, or a
// fixed bottom sheet only while something plays) — full-width backdrop
// there, unchanged.
//
// top-[50px] (Header's own fixed h-[50px]), not top-0: the backdrop used
// to start at the very top of the viewport, same as Header's own height —
// harmless when it was one uniform full-width dim, but once the right
// edge above started being skipped (previous paragraph), that split the
// single continuous Header bar itself in two, dimmed on the left, fully
// bright on the right, right where its own "Playlists"/profile/theme
// buttons sit — confirmed live 2026-09-06. Starting the backdrop below
// Header entirely keeps that bar looking like one uniform piece (dimmed
// in full, same as before this whole feature) regardless of the RightPanel
// cutout, since Header was never actually part of what needed to stay
// exposed/clickable in the first place — only RightPanel was.
export const Modal = ({ title, close, children, maxWidth = '520px', subtitle }) => (
  <div onClick={close} className="fixed inset-x-0 bottom-0 top-[50px] z-[700] flex items-center justify-center bg-black/60 p-5 min-[901px]:right-[260px]">
    <section onClick={event => event.stopPropagation()} style={{ maxWidth }} className="max-h-[84vh] w-full overflow-y-auto rounded-[14px] border border-border bg-card p-[22px] shadow-[var(--wt-shadow)]">
      <div className="mb-1 flex items-center justify-between gap-4"><h2 className="text-[15px] font-bold">{title}</h2><button type="button" className={buttonSecondary} onClick={close}>×</button></div>
      {subtitle && <p className="mb-3.5 text-[12.5px] leading-5 text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  </div>
);
