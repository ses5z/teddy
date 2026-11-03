import { useEffect, useRef } from 'react';
import { GraduationCap, Home, LayoutDashboard, MessageSquare, Settings, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';
import { Logo } from './Logo';

const NAV_ITEMS: { to: string; icon: LucideIcon; label: TKey }[] = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/chat', icon: MessageSquare, label: 'nav.chat' },
  { to: '/study', icon: GraduationCap, label: 'nav.study' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

// Logo bar on top. Nav is a bottom bar on mobile and joins the top bar from md up.
export function Layout() {
  const { t, settings } = useSettings();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Move focus on navigation so screen readers announce the new screen.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  // Each screen gets its own tab title, taken from its heading.
  useEffect(() => {
    const heading = mainRef.current?.querySelector('h1')?.textContent;
    document.title = heading ? `${heading} – ${t('app.name')}` : t('app.name');
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <Logo />
          <nav
            aria-label={t('nav.main')}
            className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface md:static md:border-t-0"
          >
            <ul className="flex md:gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <li key={to} className="flex-1">
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 px-1 transition-colors md:min-h-11 md:flex-row md:gap-2 md:border-t-0 md:border-b-2 md:px-3 md:text-base md:whitespace-nowrap ${
                        isActive ? 'border-primary font-bold text-primary' : 'border-transparent text-muted'
                      }`
                    }
                  >
                    <Icon size={20} aria-hidden="true" />
                    {t(label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
