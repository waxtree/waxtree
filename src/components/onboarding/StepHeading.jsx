export const StepHeading = ({ eyebrow, title, subtitle }) => (
  <div className="mb-6">
    {eyebrow && <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">{eyebrow}</span>}
    <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[28px]">{title}</h1>
    {subtitle && <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>}
  </div>
);
