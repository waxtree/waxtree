import { ChevronLeft, ChevronRight } from 'lucide-react';

// The edge handle of the slide-out branches column. It rides the left edge of
// the centre panel, so it follows the column as it opens and closes. Desktop
// only — on mobile the header's menu button opens the same column as a drawer.
export const SidebarToggle = ({ open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-tour="sidebar-toggle"
    aria-expanded={open}
    aria-label={open ? 'Close branches' : 'Open branches'}
    title={open ? 'Close branches' : 'Open branches'}
    className="absolute left-0 top-1/2 z-20 flex h-16 w-[18px] -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary max-sm:hidden"
  >
    {open ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
  </button>
);
