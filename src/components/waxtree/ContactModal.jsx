import { useState } from 'react';
import { Modal } from '@/components/waxtree/Modal';
import { buttonPrimary, buttonSecondary } from '@/lib/waxtreeUi';

const KINDS = [
  ['bug', 'Bug'],
  ['idea', 'Idea'],
  ['question', 'Question'],
  ['other', 'Other'],
];
const MAX_LENGTH = 4000;

// "Contact us" from the profile menu: a kind and a message, sent to the
// WaxTree team's back office. The sender's account comes along automatically.
export const ContactModal = ({ actions }) => {
  const [kind, setKind] = useState('idea');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ state: 'idle' });
  const close = () => actions.mutateState(value => { value.contactModal = false; });

  const send = async () => {
    setStatus({ state: 'sending' });
    const result = await actions.sendContactMessage(kind, message);
    setStatus(result.ok ? { state: 'sent' } : { state: 'error', error: result.error });
  };

  if (status.state === 'sent') {
    return (
      <Modal title="Message sent" close={close} maxWidth="440px">
        <div className="py-4 text-center">
          <div className="mb-2 text-4xl">🌱</div>
          <p className="mb-5 text-[13px] leading-5 text-muted-foreground">Thanks — we read every message. If it needs an answer, we&apos;ll write back to your account email.</p>
          <button type="button" className={`${buttonPrimary} w-full py-2.5`} onClick={close}>Close</button>
        </div>
      </Modal>
    );
  }

  const sending = status.state === 'sending';
  return (
    <Modal title="Contact us" close={close} maxWidth="480px" subtitle="Found a bug, have an idea, or a question? Write to the WaxTree team — your account email comes along, so we can reply.">
      <div role="radiogroup" aria-label="What is it about?" className="mb-3 flex flex-wrap gap-1.5">
        {KINDS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${kind === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={event => setMessage(event.target.value.slice(0, MAX_LENGTH))}
        rows={6}
        autoFocus
        aria-label="Your message"
        placeholder="Tell us what's on your mind…"
        className="w-full resize-y rounded-[10px] border-[1.5px] border-border bg-secondary px-3 py-2 text-[13px] leading-5 outline-none focus:border-primary"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground/70">
        <span className="text-destructive">{status.state === 'error' ? status.error : ''}</span>
        <span>{message.length}/{MAX_LENGTH}</span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={buttonSecondary} onClick={close}>Cancel</button>
        <button type="button" className={`${buttonPrimary} disabled:opacity-40`} disabled={sending || !message.trim()} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
      </div>
    </Modal>
  );
};
