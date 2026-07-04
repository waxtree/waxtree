Checkpoint 5 — Jun 28 2026

Novità rispetto a checkpoint-4:
- Error states: buildErrorPanel() con SVG pianta appassita, classifyError() in italiano,
  retryNode() con bottone Riprova
- Rate limit fix: retry con backoff in dReq() no-token path, cancellation tokens
  in fetchArtistData/fetchLabelData (_loadGen counter in addNode)
- Track card layout: duration + ♡ + 🏷 spostati accanto al titolo (sinistra)
- Free/Premium messaging: rimossi tutti i riferimenti a Pro/Upgrade,
  sostituiti con "Feature coming soon" / "SOON" badge / modal "Got it"
- Dark mode: near-black (#09090B) invece di verde scuro, default light su tutti i file
- Avatar profilo: buildAvatarEl() cerchio con foto o iniziali,
  uploadAvatar() via canvas resize (200×200 JPEG) → localStorage,
  visibile nel dropdown Profile accanto a username+email,
  Add/Change photo in My Settings
