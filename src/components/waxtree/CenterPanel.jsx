import { Dashboard } from '@/components/dashboard/Dashboard';
import { Content } from '@/components/waxtree/Content';
import { SidebarToggle } from '@/components/waxtree/SidebarToggle';

// The middle of the workspace. The dashboard is the fixed layer: it stays
// mounted (so its scroll position and open record survive) and digging mode
// simply covers it; the logo in the header brings it back. The handle on the
// left edge opens and closes the branches column.
export const CenterPanel = ({ state, actions }) => {
  const digging = state.view === 'digging';
  return (
    <div className="relative min-h-0 min-w-0">
      <SidebarToggle open={state.sidebarOpen} onClick={actions.toggleSidebar} />
      <div className={`h-full min-h-0 *:h-full ${digging ? 'hidden' : ''}`}><Dashboard state={state} actions={actions} /></div>
      {digging && <div className="h-full min-h-0 *:h-full"><Content state={state} actions={actions} /></div>}
    </div>
  );
};
