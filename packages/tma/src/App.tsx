import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import Home from './screens/Home';
import OfferDetail from './screens/OfferDetail';
import CreateOffer from './screens/CreateOffer';
import Communities from './screens/Communities';
import CommunityDetail from './screens/CommunityDetail';
import Logistics from './screens/Logistics';
import Profile from './screens/Profile';
import ProducerDashboard from './screens/ProducerDashboard';

// ─── Tab order (nav bar order): Профіль, Доставка, Маркет, Чат, Осередки ───
const TAB_ROUTES = ['/profile', '/logistics', '/', '/chat', '/communities'];

// ─── Telegram WebApp helper ────────────────────────────────────────────────
function getTg() {
    try { return (window as any).Telegram?.WebApp ?? null; } catch { return null; }
}

// ─── BackButton integration ────────────────────────────────────────────────
const MAIN_TABS = new Set(['/', '/communities', '/logistics', '/profile']);

function TelegramBackButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const isMain = MAIN_TABS.has(location.pathname);

    useEffect(() => {
        const tg = getTg();
        if (!tg?.BackButton) return;
        if (isMain) {
            tg.BackButton.hide();
        } else {
            tg.BackButton.show();
            const handler = () => navigate(-1);
            tg.BackButton.onClick(handler);
            return () => tg.BackButton.offClick(handler);
        }
    }, [isMain, navigate]);

    return null;
}

// ─── Nav Bar with 5 tabs ───────────────────────────────────────────────────
function NavBar() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;

    const SUPERGROUP = import.meta.env.VITE_SUPERGROUP_LINK || 'https://t.me/c/3779091657';

    const items = [
        { to: '/profile', icon: '👤', label: t('nav_profile') },
        { to: '/logistics', icon: '📦', label: t('nav_logistics') },
        { to: '/', icon: '🏪', label: t('nav_market') },
        { to: '/chat', icon: '💬', label: t('nav_chat'), external: SUPERGROUP },
        { to: '/communities', icon: '🏘️', label: t('nav_communities') },
    ];

    // Swipe between tabs
    const currentIdx = TAB_ROUTES.indexOf(path) === -1 ? 2 : TAB_ROUTES.indexOf(path);
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (currentIdx < TAB_ROUTES.length - 1) {
                const next = TAB_ROUTES[currentIdx + 1];
                if (next !== '/chat') navigate(next);
            }
        },
        onSwipedRight: () => {
            if (currentIdx > 0) {
                const prev = TAB_ROUTES[currentIdx - 1];
                if (prev !== '/chat') navigate(prev);
            }
        },
        trackTouch: true,
        delta: 50,
        preventScrollOnSwipe: false,
    });

    // Expose swipe handlers to page via ref on body
    useEffect(() => {
        const el = document.getElementById('app-content');
        if (!el) return;
        // attach swipe via data attribute so individual screens can opt out
        el.dataset.swipeEnabled = 'true';
    }, []);

    return (
        <>
            {/* Swipe overlay (transparent, covers full screen above nav) */}
            <div
                {...swipeHandlers}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0,
                    bottom: 60, // above nav bar
                    zIndex: 5,
                    pointerEvents: 'none', // pass-through by default
                }}
            />
            <nav className="nav-bottom">
                {items.map((item) => (
                    item.external ? (
                        <a
                            key={item.to}
                            href={item.external}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-item"
                            onClick={(e) => {
                                e.preventDefault();
                                getTg()?.openLink(item.external!);
                            }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ) : (
                        <button
                            key={item.to}
                            className={`nav-item ${path === item.to ? 'active' : ''}`}
                            onClick={() => navigate(item.to)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    )
                ))}
            </nav>
        </>
    );
}

// ─── Swipe back from left edge for detail screens ─────────────────────────
function EdgeSwipeBack() {
    const navigate = useNavigate();
    const location = useLocation();
    const startX = useRef<number | null>(null);

    useEffect(() => {
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches[0].clientX < 24) startX.current = e.touches[0].clientX;
            else startX.current = null;
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (startX.current !== null && !MAIN_TABS.has(location.pathname)) {
                const dx = e.changedTouches[0].clientX - startX.current;
                if (dx > 60) navigate(-1);
            }
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [navigate, location.pathname]);

    return null;
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
    useEffect(() => {
        const tg = getTg();
        if (!tg) return;
        tg.ready();
        tg.expand();
        // Closing confirmation disabled by default — forms enable it themselves
        tg.disableClosingConfirmation?.();
    }, []);

    return (
        <BrowserRouter>
            <TelegramBackButton />
            <EdgeSwipeBack />
            <div id="app-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/offer/:id" element={<OfferDetail />} />
                    <Route path="/create-offer" element={<CreateOffer />} />
                    <Route path="/communities" element={<Communities />} />
                    <Route path="/community/:id" element={<CommunityDetail />} />
                    <Route path="/logistics" element={<Logistics />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/dashboard" element={<ProducerDashboard />} />
                </Routes>
            </div>
            <NavBar />
        </BrowserRouter>
    );
}
