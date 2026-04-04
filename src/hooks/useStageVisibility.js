import { useEffect, useRef } from "react";

export function useStageVisibility({
  elRef,
  scrollRef, // ← replaces el.closest() entirely
  stageId,
  pipelineId,
  layoutReady,
  isCollapsed,
  onVisible,
}) {
  const firedKeyRef = useRef(null);

  useEffect(() => {
    if (isCollapsed) return;
    if (!layoutReady) return;

    const el = elRef.current;
    if (!el) return;

    const key = `${pipelineId}::${stageId}`;
    const scrollRoot = scrollRef?.current ?? null; // real DOM node, not class lookup

    const isInScrollView = () => {
      const elRect = el.getBoundingClientRect();
      if (!scrollRoot) {
        return elRect.left < window.innerWidth && elRect.right > 0;
      }
      const rootRect = scrollRoot.getBoundingClientRect();
      const overlapLeft = Math.max(elRect.left, rootRect.left);
      const overlapRight = Math.min(elRect.right, rootRect.right);
      return overlapRight - overlapLeft >= 30;
    };

    const tryFire = () => {
      if (firedKeyRef.current === key) return;
      firedKeyRef.current = key;
      onVisible();
    };

    if (isInScrollView()) {
      tryFire();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryFire();
          observer.disconnect();
        }
      },
      {
        root: scrollRoot,
        rootMargin: "0px 120px 0px 120px",
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stageId, pipelineId, layoutReady, isCollapsed]);
}
