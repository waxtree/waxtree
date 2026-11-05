import { Check } from 'lucide-react';

// A native radio under the hood (visually hidden), so arrow-key navigation
// inside the group, focus and screen-reader semantics all come for free.
export const OptionCard = ({ name, icon: Icon, title, description, selected, onSelect }) => (
  <label
    className={`flex w-full cursor-pointer items-start gap-4 rounded-2xl border-[1.5px] p-4 text-left transition hover:border-primary hover:bg-primary/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${selected ? 'border-primary bg-primary/10' : 'border-border bg-white'}`}
  >
    <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
    {Icon && (
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
    )}
    <span className="min-w-0 flex-1">
      <strong className="block text-[15px] text-foreground">{title}</strong>
      <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{description}</span>
    </span>
    <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
      {selected && <Check className="size-3.5" aria-hidden="true" />}
    </span>
  </label>
);
