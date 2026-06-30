Checkpoint 6 — Jun 30 2026

Novità rispetto a checkpoint-5:
- Right panel architettura: #right-panel (con #yt-host e #related-tracks) spostato
  fuori da #root, così root.innerHTML='' non lo distrugge mai
- Mini player: sempre visibile e funzionante senza restart video tra re-render
- "Related Tracks": sezione sempre visibile sotto il mini player (flex:1)
- "Nothing playing": messaggio ripristinato quando nessuna traccia è in riproduzione
- prev/next track buttons (⏮ ⏭) nel mini player header
- CSS: padding-bottom:56.25% trick per dimensionamento video corretto
  indipendentemente dall'inline style del YouTube IFrame API
- positionYtHost() semplificato: usa solo main.getBoundingClientRect().top + right:0 CSS
