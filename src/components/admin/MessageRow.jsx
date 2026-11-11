import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtDateTime } from '@/lib/admin';

const KIND_LABELS = { bug: 'Bug', idea: 'Idea', question: 'Question', other: 'Other' };

// One "Contact us" message. Unread ones carry a green edge; Reply opens the
// admin's own mail client addressed to the sender.
export const MessageRow = ({ message, busy, onToggleRead }) => {
  const unread = !message.read_at;
  const from = [message.username, message.email].filter(Boolean).join(' · ') || 'Deleted account';
  const reply = message.email ? `mailto:${message.email}?subject=${encodeURIComponent(`Re: your WaxTree ${KIND_LABELS[message.kind]?.toLowerCase() || 'message'}`)}` : null;
  return (
    <article className={`border-l-2 py-3 pl-3 pr-1 ${unread ? 'border-primary bg-primary/[.04]' : 'border-transparent'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={message.kind === 'bug' ? 'destructive' : 'secondary'}>{KIND_LABELS[message.kind] || message.kind}</Badge>
        <span className={`min-w-0 truncate ${unread ? 'font-semibold' : ''}`}>{from}</span>
        <span className="text-[11px] text-muted-foreground">{fmtDateTime(message.created_at)}{message.page ? ` · from ${message.page}` : ''}</span>
        <span className="flex-1" />
        {reply && (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href={reply}><Mail className="size-3.5" /> Reply</a>
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={onToggleRead}>
          {unread ? 'Mark read' : 'Mark unread'}
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5">{message.message}</p>
    </article>
  );
};
