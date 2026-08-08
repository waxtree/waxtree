// Ported from the pre-migration preview.html's own svgLabel() — a plain
// Unicode glyph (◎) stood in for this during the React rewrite and read as
// disproportionate/ugly next to real icons. Same 16x16 line-icon shape as
// the original (a record label: outer ring + filled center), just as a
// proper React SVG component.
export const LabelIcon = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="8" cy="8" r="6.5" />
    <circle cx="8" cy="8" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);
