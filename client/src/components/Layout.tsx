import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';

// Logo bar on top with the menu button on the right.
export function Layout() {
  const { t, settings } = useSettings();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);

  // Move focus on navigation so screen readers announce the new screen.
  useEffect(() => {
    // Compared, not a first-run flag: StrictMode runs effects twice on load.
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  // Each screen gets its own tab title, taken from its heading.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const update = () => {
      const heading = main.querySelector('h1')?.textContent;
      document.title = heading ? `${heading} – ${t('app.name')}` : t('app.name');
    };
    update();
    // Pages that load data render their heading later.
    const observer = new MutationObserver(update);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, settings.language, t]);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:m-2 focus:rounded focus:bg-surface focus:p-2"
      >
        {t('common.skipToContent')}
      </a>

      <header className="border-b-2 border-stripe bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 [&>:first-child]:shrink-0">
          <Logo />
          <MobileMenu />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
