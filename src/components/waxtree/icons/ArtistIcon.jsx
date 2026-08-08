// Ported from the pre-migration preview.html's own svgArtist() — a plain
// Unicode glyph (♙) stood in for this during the React rewrite and read as
// disproportionate/ugly next to real icons. Same 16x16 line-icon shape as
// the original, just as a proper React SVG component.
export const ArtistIcon = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
  </svg>
);
