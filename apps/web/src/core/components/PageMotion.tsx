import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const SURFACE_SELECTOR = [
  '.page-header',
  '.card',
  '.boilerplate-view-container',
  '.dashboard-panel',
  '.metric-card',
  '.tenant-settings-panel',
  '.admin-tenant-card',
  '.notes-keep-controls',
  '.notes-section',
  '.tasks-header',
  '.tasks-filters',
  '.tasks-board',
  '.tasks-sprints-page__form',
  '.tasks-sprint-card',
  '.calendar-picker-card',
  '.calendar-events-panel',
  '.knowledge-chat',
  '.knowledge-panel',
].join(', ');

export function PageMotion({ children }: { children: ReactNode }) {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia(MOTION_QUERY).matches) return undefined;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !root.isConnected) return;
      ctx = gsap.context(() => {
        const surfaces = gsap.utils.toArray<HTMLElement>(SURFACE_SELECTOR, root).slice(0, 12);
        const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

        timeline.fromTo(
          root,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.24, clearProps: 'opacity,visibility,transform' },
        );

        if (surfaces.length > 0) {
          timeline.fromTo(
            surfaces,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.28,
              stagger: 0.035,
              clearProps: 'opacity,visibility,transform',
            },
            '-=0.12',
          );
        }
      }, root);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [location.pathname, location.search]);

  return (
    <div className="page-motion" ref={rootRef}>
      {children}
    </div>
  );
}
