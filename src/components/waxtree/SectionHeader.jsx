import { buttonSecondary } from '@/lib/waxtreeUi';

export const SectionHeader = ({ title, count, action, controls }) => (
  <div className="mt-3 flex items-center justify-between border-b border-border py-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">
    <span>{title}</span>
    <div className="flex items-center gap-2 font-normal normal-case tracking-normal">{count}{action && <button type="button" className={buttonSecondary} onClick={action}>Clear</button>}{controls}</div>
  </div>
);
