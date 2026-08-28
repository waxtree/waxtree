export const SidebarResize = ({ width, onResize }) => {
  const begin = event => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = nextEvent => onResize(Math.max(160, Math.min(520, startWidth + nextEvent.clientX - startX)));
    const finish = nextEvent => {
      const nextWidth = Math.max(160, Math.min(520, startWidth + nextEvent.clientX - startX));
      localStorage.setItem('wt-sb-w', String(nextWidth));
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', finish);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', finish);
  };

  // The sidebar is a fixed-position drawer on mobile (see Sidebar's own
  // max-sm: classes), not a grid column — dragging to resize it makes no
  // sense there, and the grid itself drops this track below sm anyway.
  return <div role="separator" aria-orientation="vertical" title="Resize sidebar" onMouseDown={begin} className="cursor-col-resize bg-border transition-colors hover:bg-primary max-sm:hidden" />;
};
