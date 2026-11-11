import { MessageRow } from '@/components/admin/MessageRow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Inbox of the app's "Contact us" messages, newest first.
export const MessagesSection = ({ state, busyMessage, onToggleRead }) => {
  const unread = state.items?.filter(message => !message.read_at).length || 0;
  return (
    <Card size="sm" className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Messages {unread > 0 && <Badge>{unread} unread</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.loading && <div className="text-muted-foreground">Loading…</div>}
        {state.error && <div className="text-destructive">Failed to load messages: {state.error}</div>}
        {state.missingTable && <div className="text-muted-foreground">The messages table doesn&apos;t exist yet — run <code>supabase/contact_messages.sql</code> in the Supabase SQL editor to start receiving messages.</div>}
        {state.items && !state.missingTable && !state.items.length && <div className="text-muted-foreground">No messages yet — they arrive here from &quot;Contact us&quot; in the app&apos;s profile menu.</div>}
        {state.items?.length > 0 && (
          <div className="divide-y divide-border">
            {state.items.map(message => (
              <MessageRow key={message.id} message={message} busy={busyMessage === message.id} onToggleRead={() => onToggleRead(message)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
