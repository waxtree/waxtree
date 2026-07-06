Checkpoint 7 — Jul 6 2026

Novità rispetto a checkpoint-6:

Video / mini player
- matchVideo(): normalizzazione zero-padding ("04" ↔ "4") per matchare meglio
  i video già presenti nei dati Discogs
- Errore 101/150 (embedding disabilitato dal proprietario) → messaggio chiaro
  "Embedding disabled by owner" + link diretto youtube.com/watch?v=ID
  (invece di una search generica)
- Rimosso definitivamente il tentativo di auto-ricerca YouTube per tracce
  senza video Discogs: causava troppi falsi positivi (video sbagliati,
  DJ set, stream). Tornato al comportamento originale, affidabile:
  "No video in Discogs data" + bottone "Search on YouTube" manuale
- Sezione Bandcamp nella colonna centrale ora si nasconde del tutto quando
  la ricerca non trova risultati (prima restava un blocco vuoto)

Related Tracks / Playlists / History
- Label "Coming Soon" nell'area bianca sotto Related Tracks
- Playlist: bottone "Rename" accanto a "Delete" nel modal Playlists
  (input inline, Enter/blur salva, Escape annulla)
- History modal: thumbnail reale della traccia al posto della ✓ generica,
  bottone ▶ Play quando c'è un videoId, bottone "Open" che salta al nodo
  già presente nell'albero o lo apre come nuovo

Libreria musicale locale
- Riscrittura completa dello scanner: da File System Access API a
  <input webkitdirectory> — la prima API saltava in silenzio cartelle con
  nomi "non sicuri" (es. spazio finale), causando scansioni incomplete
- Report diagnostico per-cartella (file audio trovati, sotto-cartelle,
  file spazzatura macOS ignorati, cartelle non lette) visibile in-app
- Avviso quando vengono trovati archivi .zip/.rar/.7z non estratti
- Tutto lo scan spostato da "My Settings" dentro un nuovo modal
  "Sync Libraries" (rinominato da "Discogs Collection"), che ora contiene
  sia "Local Music Folder" che "Discogs Collection" nello stesso posto

Ricerca
- Ricerca artista/label live-as-you-type: dopo 300ms di pausa (min 2
  caratteri) mostra i suggerimenti senza premere Invio; preserva focus e
  posizione del cursore nel campo di testo durante il repaint

Various Artists / dati Discogs
- Le tracce di una release "Various Artists" ora mostrano l'artista reale
  per singola traccia (letto da tracklist[].artists su Discogs), non più
  la stringa "Various" a livello di release
- "Explore artist" punta all'artista vero della traccia, non più al
  pseudo-artista Discogs "Various" (id 194)
- Sistema di auto-guarigione: i nodi label già aggiunti prima di questo fix
  si ri-scaricano da soli (all'avvio dell'app e/o quando riselezionati),
  tramite un numero di versione (LABEL_DATA_VERSION) confrontato con
  quello salvato nel nodo — nessuna azione manuale richiesta all'utente
