// Growing-tree loader ported verbatim from the pre-migration preview.html's
// buildPlantLoader() (see src/index.css for the animation keyframes this
// SVG relies on) — replaces the plain pulsing 🌱 emoji the React rewrite
// had quietly swapped in instead.
export const PlantLoader = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center gap-5 px-5 pb-12 pt-16">
    <svg viewBox="0 0 100 90" className="h-[99px] w-[110px]" aria-hidden="true">
      <rect x="0" y="64" width="100" height="26" fill="var(--wt-elevated)" />
      <line x1="8" y1="64" x2="92" y2="64" stroke="var(--wt-faint)" strokeWidth="1" opacity="0.3" />
      <g className="wt-grow">
        <path className="wt-b wt-b-trunk" d="M50,64 C49,56 51,48 50,38" stroke="var(--wt-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path className="wt-b wt-b-a" d="M50,52 C45,49 39,47 34,45" stroke="var(--wt-accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path className="wt-b wt-b-b" d="M50,46 C56,43 62,42 67,41" stroke="var(--wt-accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path className="wt-b wt-b-c" d="M50,42 C46,38 41,35 38,32" stroke="var(--wt-accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path className="wt-b wt-b-d" d="M50,40 C55,36 60,33 63,30" stroke="var(--wt-accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path className="wt-b wt-b-top" d="M50,38 C49,35 50,32 50,28" stroke="var(--wt-accent)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <g className="wt-leaf wt-leaf-a" fill="var(--wt-accent-light)">
          <circle cx="31" cy="42" r="2.6" /><circle cx="36" cy="41" r="2.3" /><circle cx="33" cy="47" r="2.2" />
        </g>
        <g className="wt-leaf wt-leaf-b" fill="var(--wt-accent-light)">
          <circle cx="71" cy="38" r="2.6" /><circle cx="65" cy="37" r="2.3" /><circle cx="69" cy="43" r="2.2" />
        </g>
        <g className="wt-leaf wt-leaf-c" fill="var(--wt-accent-light)">
          <circle cx="35" cy="29" r="2.5" /><circle cx="40" cy="28" r="2.2" /><circle cx="37" cy="34" r="2.1" />
        </g>
        <g className="wt-leaf wt-leaf-d" fill="var(--wt-accent-light)">
          <circle cx="67" cy="27" r="2.5" /><circle cx="61" cy="26" r="2.2" /><circle cx="65" cy="32" r="2.1" />
        </g>
        <g className="wt-leaf wt-leaf-top" fill="var(--wt-accent-light)">
          <circle cx="47" cy="25" r="2.5" /><circle cx="52" cy="24" r="2.4" /><circle cx="55" cy="26" r="2.0" /><circle cx="50" cy="29" r="2.1" />
        </g>
      </g>
    </svg>
    {label && <span className="text-xs tracking-[.06em] text-[var(--wt-faint)]">{label}</span>}
  </div>
);
