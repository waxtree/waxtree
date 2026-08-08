import { UserRow } from '@/components/admin/UserRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const columns = ['', 'Email', 'Joined', 'Last active', 'Library tracks', 'Searches', 'Nodes opened', 'Tier', ''];

export const UsersTable = ({ users, expanded, events, busyUser, onExpand, onToggle }) => (
  <Card size="sm" className="mt-8 overflow-x-auto">
    <CardHeader>
      <CardTitle className="text-base">Users</CardTitle>
    </CardHeader>
    <CardContent className="px-0">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>{columns.map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => {
            const mismatch = user.profiles_tier != null && (user.profiles_tier === 'premium') !== user.premium;
            return (
              <UserRow
                key={user.id}
                user={user}
                mismatch={mismatch}
                open={!!expanded[user.id]}
                eventState={events[user.id]}
                busy={busyUser === user.id}
                onExpand={() => onExpand(user.id)}
                onToggle={() => onToggle(user)}
              />
            );
          })}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);
