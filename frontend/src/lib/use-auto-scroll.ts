import { useEffect, useRef, useCallback } from "react";

const BOTTOM_THRESHOLD = 50;

/**
 * Auto-scroll to bottom while content streams, but pause if the user scrolls up.
 * Pass a ref to the scrollable container and an `enabled` flag (e.g. streaming).
 */
export function useAutoScroll(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUp = useRef(false);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    userScrolledUp.current = scrollTop + clientHeight < scrollHeight - BOTTOM_THRESHOLD;
  }, []);

  // Scroll to bottom whenever content changes while enabled and user hasn't scrolled up.
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el || userScrolledUp.current) return;

    el.scrollTop = el.scrollHeight;
  });

  return { containerRef, onScroll, userScrolledUp };
}
