// The dimmed screen with a lit "hole" around the step's target. On a reading
// step the whole screen (hole included) swallows clicks so the person stays on
// the tour; on a doing step the dim is lighter and lets every click through,
// so menus opening outside the hole (Explore's dropdown) still work.
const PAD = 6;

export const TourSpotlight = ({ rect, interactive }) => {
  const dim = `fixed z-[950] transition-[top,left,right,bottom,width,height] duration-300 ease-out motion-reduce:transition-none ${interactive ? 'pointer-events-none bg-black/35' : 'bg-black/55'}`;
  if (!rect) return <div className={`${dim} inset-0`} />;
  const hole = {
    '--hole-top': `${Math.max(0, rect.top - PAD)}px`,
    '--hole-left': `${Math.max(0, rect.left - PAD)}px`,
    '--hole-right': `${rect.left + rect.width + PAD}px`,
    '--hole-bottom': `${rect.top + rect.height + PAD}px`,
  };
  const middle = 'top-[var(--hole-top)] h-[calc(var(--hole-bottom)-var(--hole-top))]';
  return (
    <div style={hole}>
      <div className={`${dim} inset-x-0 top-0 h-[var(--hole-top)]`} />
      <div className={`${dim} inset-x-0 bottom-0 top-[var(--hole-bottom)]`} />
      <div className={`${dim} left-0 w-[var(--hole-left)] ${middle}`} />
      <div className={`${dim} right-0 left-[var(--hole-right)] ${middle}`} />
      <div className={`fixed z-[950] left-[var(--hole-left)] w-[calc(var(--hole-right)-var(--hole-left))] ${middle} rounded-xl ring-2 ring-primary transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none ${interactive ? 'pointer-events-none' : ''}`} />
    </div>
  );
};
