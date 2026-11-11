import { useEffect, useState } from 'react';

const isShown = element => {
  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;
  return element.checkVisibility ? element.checkVisibility({ visibilityProperty: true }) : true;
};

// Follows the on-screen box of the first visible element matching `selector`
// (the walkthrough's spotlight target) every frame, so it keeps up with the
// sliding sidebar, scrolling and loading content. Scrolls the element into
// view the first time it shows up off-screen. null while nothing matches.
export const useTargetRect = selector => {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    setRect(null);
    if (!selector) return undefined;
    let frame = 0;
    let last = '';
    let scrolled = false;
    const tick = () => {
      const element = [...document.querySelectorAll(selector)].find(isShown);
      let next = null;
      if (element) {
        const box = element.getBoundingClientRect();
        const onScreen = box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
        if (!onScreen && !scrolled) {
          scrolled = true;
          element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (onScreen) next = { top: box.top, left: box.left, width: box.width, height: box.height };
      }
      const key = next ? [next.top, next.left, next.width, next.height].map(Math.round).join(',') : '';
      if (key !== last) {
        last = key;
        setRect(next);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [selector]);
  return rect;
};
