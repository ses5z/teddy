import { useEffect, useRef } from 'react';
import { GraduationCap, Home, LayoutDashboard, Megaphone, MessageSquare, Settings, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useReadAnnouncements } from '../context/ReadAnnouncementsContext';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';
import { Logo } from './Logo';

const NAV_ITEMS: { to: string; icon: LucideIcon; label: TKey }[] = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/chat', icon: MessageSquare, label: 'nav.chat' },
  { to: '/study', icon: GraduationCap, label: 'nav.study' },
  { to: '/announcements', icon: Megaphone, label: 'nav.announcements' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

function UnreadBadge({ className }: { className: string }) {
  const { t } = useSettings();
  const { unreadCount } = useReadAnnouncements();
  if (unreadCount == null || unreadCount === 0) return null;
  return (
    <span
      role="img"
      aria-label={t('nav.unreadBadge', { count: unreadCount })}
      className={`min-w-5 rounded bg-primary px-1 text-center font-bold leading-5 whitespace-nowrap text-on-primary ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}

// Logo bar on top. Nav is a bottom bar on mobile and joins the top bar from md up.
export function Layout() {
  const { t, settings } = useSettings();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const navRef = useRef<HTMLElement>(null);

  // When the mobile menu scrolls sideways, keep the current screen's item in view.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    nav.querySelector('a[aria-current="page"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [pathname, settings.fontSize, settings.language]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 [&>:first-child]:shrink-0">
          <Logo />
          <nav
            ref={navRef}
            aria-label={t('nav.main')}
            className="fixed inset-x-0 bottom-0 z-10 h-[var(--mobile-nav-height)] border-t border-border bg-surface overflow-x-auto md:static md:h-auto md:min-w-0 md:border-t-0"
          >
            <ul className="flex h-full w-max min-w-full md:h-auto lg:gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <li key={to} className="w-min flex-[1_0_auto] md:w-auto">
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex h-full flex-col items-center justify-center gap-0.5 border-t-2 px-1 text-center leading-tight transition-colors md:h-auto md:min-h-11 md:flex-row md:gap-1 md:border-t-0 md:border-b-2 md:px-1 lg:gap-2 lg:px-3 md:text-base md:leading-normal md:whitespace-nowrap ${
                        isActive ? 'border-primary font-bold text-primary' : 'border-transparent text-muted'
                      }`
                    }
                  >
                    {/* Badge beside the icon on mobile, after the label from md up; only one is ever displayed. */}
                    <span className="flex items-center justify-center gap-1">
                      <Icon size={20} aria-hidden="true" />
                      {to === '/announcements' && <UnreadBadge className="md:hidden" />}
                    </span>
                    {t(label)}
                    {to === '/announcements' && <UnreadBadge className="hidden md:inline-block" />}
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
