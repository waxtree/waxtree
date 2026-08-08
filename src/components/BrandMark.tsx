import logoUrl from '../../logo.svg';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand-mark brand-mark--compact' : 'brand-mark'}>
      <img src={logoUrl} alt="" />
      <div>
        <div className="brand-mark__name">Wax<span>Tree</span></div>
        {!compact && <div className="brand-mark__sub">Dig deeper</div>}
      </div>
    </div>
  );
}
