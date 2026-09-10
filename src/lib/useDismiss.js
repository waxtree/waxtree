import { useEffect, useRef } from 'react';

// Auto-dismiss a transient popover (dropdown menu, etc.) on any click
// outside it or an Escape press — so a menu left open no longer stays
// stuck until its own toggle button is clicked a second time.
//
// Attach the returned ref to an element that wraps BOTH the toggle button
// and the popover, otherwise the very click that opens the menu (landing
// on the toggle, which would be "outside" a ref put on the popover alone)
// counts as an outside click. pointerdown on the capture phase fires
// before that opening click's React onClick has flipped `open` to true,
// so the listener isn't mounted yet then and the menu can't self-close.
export const useDismiss = (open, onDismiss) => {
  const ref = useRef(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (ref.current && !ref.current.contains(event.target)) dismiss.current();
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') dismiss.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return ref;
};
