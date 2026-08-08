import { EventsList } from '@/components/admin/EventsList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { fmtDate, fmtDateTime } from '@/lib/admin';

export const UserRow = ({ user, mismatch, open, eventState, busy, onExpand, onToggle }) => (
  <>
    <TableRow>
      <TableCell><button type="button" onClick={onExpand}>{open ? '▾' : '▸'}</button></TableCell>
      <TableCell className="font-medium">{user.email}</TableCell>
      <TableCell>{fmtDate(user.created_at)}</TableCell>
      <TableCell>{fmtDateTime(user.last_active)}</TableCell>
      <TableCell>{user.library_track_count ?? '—'}</TableCell>
      <TableCell>{user.search_count ?? 0}</TableCell>
      <TableCell>{user.nodes_count ?? 0}</TableCell>
      <TableCell>
        <Badge variant={user.premium ? 'default' : 'secondary'}>{user.premium ? 'Premium' : 'Free'}</Badge>
        {mismatch && <div className="mt-1 text-[10px] text-destructive">profiles.tier: {user.profiles_tier} (mismatch)</div>}
      </TableCell>
      <TableCell>
        <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={onToggle}>
          {busy ? '…' : `Make ${user.premium ? 'Free' : 'Premium'}`}
        </Button>
      </TableCell>
    </TableRow>
    {open && (
      <TableRow>
        <TableCell colSpan={9}><EventsList state={eventState} /></TableCell>
      </TableRow>
    )}
  </>
);
