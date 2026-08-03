import { useCallback, useEffect, useRef, type RefObject } from 'react';

export const scheduleQuestionnaireCategoryTopScroll = (
  getAnchor: () => HTMLElement | null,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame,
): number => requestFrame(() => {
  getAnchor()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

export const useScrollToQuestionnaireCategoryTop = <T extends HTMLElement>(): {
  categoryTopRef: RefObject<T | null>;
  scrollToCategoryTop: (target?: HTMLElement | null) => void;
} => {
  const categoryTopRef = useRef<T>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const scrollToCategoryTop = useCallback((target?: HTMLElement | null) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = scheduleQuestionnaireCategoryTopScroll(
      () => target || categoryTopRef.current,
    );
  }, []);

  return { categoryTopRef, scrollToCategoryTop };
};
