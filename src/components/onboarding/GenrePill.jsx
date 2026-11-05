const pillClass = (selected, suggested) => {
  if (selected) return 'border-primary bg-primary text-primary-foreground';
  if (suggested) return 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15';
  return 'border-border bg-white text-muted-foreground hover:border-primary hover:text-primary';
};

export const GenrePill = ({ label, selected, suggested, onToggle }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onToggle}
    className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${pillClass(selected, suggested)}`}
  >
    {suggested && !selected && <span aria-hidden="true">✦ </span>}
    {label}
  </button>
);
