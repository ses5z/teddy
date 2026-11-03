import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Calendar, GraduationCap, Home, LayoutDashboard, Megaphone, Menu, MessageSquare, Settings, X, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useReadAnnouncements } from '../context/ReadAnnouncementsContext';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';

const NAV_ITEMS: { to: string; icon: LucideIcon; label: TKey }[] = [
  { to: '/', icon: Home, label: 'nav.home' },
  { to: '/chat', icon: MessageSquare, label: 'nav.chat' },
  { to: '/study', icon: GraduationCap, label: 'nav.study' },
  { to: '/announcements', icon: Megaphone, label: 'nav.announcements' },
  { to: '/calendar', icon: Calendar, label: 'nav.calendar' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

const FOCUSABLE = 'a[href], button:not([disabled])';
const PANEL_ID = 'main-menu-panel';

// Hamburger on the right of the top bar; the menu slides in from the right.
export function MobileMenu() {
  const { t } = useSettings();
  const { unreadCount } = useReadAnnouncements();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Set when closing because a link was chosen: Layout then focuses main, not the button.
  const navigated = useRef(false);
  const wasOpen = useRef(false);
  const unread = unreadCount != null && unreadCount > 0;

  // Closed panel cannot be focused or read.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.inert = !open;
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      closeRef.current?.focus();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      if (!navigated.current) burgerRef.current?.focus();
      navigated.current = false;
    }
  }, [open]);

  // Back/forward or any route change closes the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={burgerRef}
        type="button"
        aria-label={t(open ? 'nav.closeMenu' : 'nav.openMenu')}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded text-text"
      >
        <Menu size={28} aria-hidden="true" />
        {unread && !open && (
          <>
            <span aria-hidden="true" className="absolute top-2 right-2 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
            <span className="sr-only">{t('nav.unreadBadge', { count: unreadCount })}</span>
          </>
        )}
      </button>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <div
        id={PANEL_ID}
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col border-l border-border bg-surface shadow-lg ${
          open
            ? 'visible translate-x-0 transition-[transform] duration-200'
            : 'invisible translate-x-full transition-[transform,visibility] duration-200 [transition-property:transform,visibility] [transition-delay:0s,200ms]'
        }`}
      >
        <div className="flex justify-end p-2">
          <button
            ref={closeRef}
            type="button"
            aria-label={t('nav.closeMenu')}
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-text"
          >
            <X size={28} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label={t('nav.main')} className="flex-1 overflow-y-auto">
          <ul>
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => {
                    navigated.current = true;
                    setOpen(false);
                  }}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 border-l-4 px-4 py-3 text-base ${
                      isActive ? 'border-primary font-bold text-primary' : 'border-transparent text-text'
                    }`
                  }
                >
                  <Icon size={22} aria-hidden="true" />
                  <span className="flex-1">{t(label)}</span>
                  {to === '/announcements' && unread && (
                    <span
                      role="img"
                      aria-label={t('nav.unreadBadge', { count: unreadCount })}
                      className="min-w-5 rounded bg-primary px-1 text-center text-base font-bold leading-5 whitespace-nowrap text-on-primary"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
