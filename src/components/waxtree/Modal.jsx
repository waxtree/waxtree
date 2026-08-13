import { buttonSecondary } from '@/lib/waxtreeUi';

export const Modal = ({ title, close, children, maxWidth = '520px', subtitle }) => (
  <div onClick={close} className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-5">
    <section onClick={event => event.stopPropagation()} style={{ maxWidth }} className="max-h-[84vh] w-full overflow-y-auto rounded-[14px] border border-border bg-card p-[22px] shadow-[var(--wt-shadow)]">
      <div className="mb-1 flex items-center justify-between gap-4"><h2 className="text-[15px] font-bold">{title}</h2><button type="button" className={buttonSecondary} onClick={close}>×</button></div>
      {subtitle && <p className="mb-3.5 text-[12.5px] leading-5 text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  </div>
);
