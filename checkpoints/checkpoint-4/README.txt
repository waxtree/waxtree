Checkpoint 4 — Jun 26 2026 ~21:30
preview.html: 133KB

Novità rispetto a checkpoint-3:
- Logo WaxTree vettoriale nell'header (logo.svg, sfondo rimosso, viewBox croppiato)
- Rinomina Branch → Wood in tutta la UI (Wood 1, Wood 2, ...)
- Free/Premium limits:
    * Free: max 3 Woods (4° tab visibile ma bloccato con 🔒)
    * Free: max 15 nodi per Wood (riga "X more results locked [PRO]" dopo il 15°)
    * Modal Premium con lista vantaggi e CTA "Upgrade to Pro"
    * isPremium letto da user_metadata.premium al login
- supabase/schema.sql: schema completo con:
    * Tabelle: profiles, woods, nodes, node_tags, likes, listen_later,
               listen_history, discogs_collection, discogs_wantlist
    * RLS policies (ogni user vede solo i propri dati)
    * Trigger DB per enforcing limiti Free a livello database
    * Funzione set_premium() per attivare Premium dopo pagamento
