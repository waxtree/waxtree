import { ReleaseCard } from '@/components/waxtree/ReleaseCard';

export const ReleaseSection = ({ title, groups, ...props }) => {
  if (!groups.length) return null;
  return (
    <section className="mt-8 border-t border-border pt-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground/70">{title}</p>
      <div className="flex flex-col gap-[6px]">{groups.map(group => <ReleaseCard key={group.key} group={group} {...props} />)}</div>
    </section>
  );
};
