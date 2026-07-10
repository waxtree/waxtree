Checkpoint 8 — Jul 10 2026

Novità rispetto a checkpoint-7:

Risultati ricerca — card raggruppate per release
- Le tracce dello stesso EP/Album non sono più card separate: ora condividono
  una singola riga divisa in tre zone (sinistra → destra):
  sinistra = una riga compatta per traccia (tasto play piccolo, titolo,
  durata, cuoricino, tag playlist, badge libreria/collezione/wantlist/BPM);
  centro = titolo della release + anno·etichetta + generi (una volta sola);
  destra = i soliti bottoni Explore label/artist + Bandcamp/Beatport/Discogs
- Tasto play grande rimosso, sostituito da uno piccolo per ogni traccia
- Per le compilation Various Artists, "Explore artist" resta un bottone per
  ogni artista distinto nella release (non collassato in uno solo)
- Bandcamp/Beatport ora cercano per titolo della release, non più per
  singola traccia

Velocità di ricerca
- Fetch delle release di artista/label ora a batch paralleli invece che
  sequenziali una alla volta — tempo di caricamento sensibilmente ridotto

Ricerca — etichetta
- Aggiunta label "Recent Searches" sopra la fila delle chip di cronologia
  ricerche (prima non era chiaro cosa fosse quella fila); sticky a sinistra
  durante lo scroll orizzontale, nessuna emoji

INCIDENTE CRITICO: perdita dati + backup cloud
- L'utente ha perso tutto (playlist, alberi esplorati, cronologia, foto
  profilo) svuotando la cache del browser — causa: TUTTI i dati utente
  vivevano solo in localStorage, nessun backup server-side esisteva
  davvero (uno schema.sql completo era nel repo ma non era mai stato
  eseguito sul database live — verificato via query dirette REST)
- Fix: nuova tabella Supabase `user_state` (RLS scoped a auth.uid()),
  singolo blob JSONB che rispecchia lo stesso payload di saveSt()
- saveSt() ora fa anche un push cloud debounced (4s) via
  pushStateToCloud(); i nodi vengono alleggeriti (solo campi identità,
  niente cache pesante Discogs) prima dell'upload
- hydrateFromCloud() gira una volta all'avvio: confronta updated_at del
  cloud contro un timestamp locale (SK+':ts'), ripristina solo se il cloud
  è più recente — non sovrascrive mai dati locali più freschi
- ensureNodeLoaded(): un nodo ripristinato (senza cache pesante) si
  riscarica da solo al click, invece di mostrare un pannello vuoto
- Cronologia ascolto ora limitata a 300 voci (prima cresceva all'infinito
  — era il fattore che avrebbe pesato di più nel tempo sullo storage)
- File nuovo: supabase/user_state.sql — va eseguito manualmente una volta
  nel SQL Editor di Supabase (richiesto, non fatto in automatico)

Landing page waitlist
- index.html non fa più redirect diretto a preview.html (che a sua volta
  buttava fuori chi non era loggato verso login.html) — ora mostra una
  vera landing page: logo, tagline, bottone centrale "Join the Waitlist",
  bottone "Login" in alto a destra (percorso di login normale invariato)
- register.html riconvertito in form "Registration Waitlist": via i campi
  password/conferma (una waitlist non è un account), resta solo Email
  (+ Nome opzionale + "How did you find out about us?" opzionale)
- L'iscrizione alla waitlist NON crea un account Supabase reale — solo
  una riga nella tabella `waitlist`; l'utente iscritto vede un messaggio
  di ringraziamento, non ottiene accesso automatico
- File nuovo: supabase/waitlist.sql — va eseguito manualmente una volta
  nel SQL Editor di Supabase (idempotente, sicuro da rilanciare più volte)
- login.html e la logica di autenticazione in preview.html NON sono state
  toccate — account esistenti continuano a funzionare esattamente come prima

Passaggi manuali richiesti (fatti dall'utente fuori da questo codice):
- Eseguire supabase/user_state.sql nel SQL Editor di Supabase
- Eseguire supabase/waitlist.sql nel SQL Editor di Supabase
