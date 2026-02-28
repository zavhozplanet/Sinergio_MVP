import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import Home from './screens/Home';
import OfferDetail from './screens/OfferDetail';
import CreateOffer from './screens/CreateOffer';
import Communities from './screens/Communities';
import CommunityDetail from './screens/CommunityDetail';
import Logistics from './screens/Logistics';
import Profile from './screens/Profile';
import ProducerDashboard from './screens/ProducerDashboard';

function NavBar() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;

    const items = [
        { to: '/', icon: '🏪', label: t('nav_market') },
        { to: '/communities', icon: '🏘️', label: t('nav_communities') },
        { to: '/logistics', icon: '📦', label: t('nav_logistics') },
        { to: '/profile', icon: '👤', label: t('nav_profile') },
    ];

    return (
        <nav className="nav-bottom">
            {items.map((item) => (
                <button
                    key={item.to}
                    className={`nav-item ${path === item.to ? 'active' : ''}`}
                    onClick={() => navigate(item.to)}
                >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

export default function App() {
    useEffect(() => {
        try {
            const tg = (window as any).Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                tg.enableClosingConfirmation();
            }
        } catch { /* not in Telegram */ }
    }, []);

    return (
        <BrowserRouter>
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
            <NavBar />
        </BrowserRouter>
    );
}
