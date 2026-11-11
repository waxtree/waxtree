// Nearby Discogs styles, used to give someone who only picked one genre (say
// just Techno) several shades of it instead of the same string repeated.
// Every value is a style the Explore list already offers.
export const STYLE_FAMILIES = {
  Techno: ['Minimal Techno', 'Dub Techno', 'Acid Techno', 'Tech House', 'Hard Techno', 'Electro'],
  'Dub Techno': ['Techno', 'Ambient', 'Minimal Techno', 'Dub', 'Deep House'],
  'Minimal Techno': ['Minimal', 'Techno', 'Tech House', 'Dub Techno'],
  Minimal: ['Minimal Techno', 'Tech House', 'Techno', 'Deep House'],
  'Acid Techno': ['Techno', 'Acid', 'Hard Techno', 'Electro'],
  'Hard Techno': ['Techno', 'Hard Trance', 'Acid Techno', 'Industrial'],
  'Tech House': ['House', 'Techno', 'Minimal', 'Deep House'],
  House: ['Deep House', 'Tech House', 'Garage House', 'Progressive House', 'Acid House', 'Disco'],
  'Deep House': ['House', 'Dub Techno', 'Tech House', 'Garage House', 'Nu-Disco', 'Minimal'],
  'Acid House': ['Acid', 'House', 'Acid Techno', 'Chicago'],
  'Garage House': ['House', 'Deep House', 'UK Garage', 'Speed Garage'],
  'Progressive House': ['House', 'Tech House', 'Progressive Trance', 'Deep House'],
  Ambient: ['Drone', 'Downtempo', 'Dub Techno', 'IDM', 'Leftfield'],
  Downtempo: ['Ambient', 'Trip Hop', 'Leftfield', 'IDM'],
  IDM: ['Ambient', 'Leftfield', 'Breakcore', 'Electro', 'Downtempo'],
  Electro: ['Techno', 'Breaks', 'IDM', 'Italo-Disco', 'Electroclash'],
  Breaks: ['Breakbeat', 'Electro', 'Big Beat', 'Jungle', 'Drum n Bass'],
  Breakbeat: ['Breaks', 'Big Beat', 'Jungle', 'Drum n Bass'],
  'Drum n Bass': ['Jungle', 'Breakbeat', 'Breaks', 'Dubstep', 'Leftfield'],
  Jungle: ['Drum n Bass', 'Breakbeat', 'Dub', 'Hardcore'],
  Dubstep: ['Grime', 'UK Garage', 'Drum n Bass', 'Dub', 'Bassline'],
  Disco: ['Nu-Disco', 'Italo-Disco', 'Hi NRG', 'House'],
  Trance: ['Progressive Trance', 'Tech Trance', 'Goa Trance', 'Psy-Trance', 'Hard Trance'],
};
