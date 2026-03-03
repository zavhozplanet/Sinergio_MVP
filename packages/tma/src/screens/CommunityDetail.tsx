import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

function getTg() {
    try { return (window as any).Telegram?.WebApp ?? null; } catch { return null; }
}
const SUPERGROUP_LINK = import.meta.env.VITE_SUPERGROUP_LINK || 'https://t.me/c/3779091657';
const SUPERGROUP_NUMERIC = SUPERGROUP_LINK.replace('https://t.me/c/', '');

export default function CommunityDetail() {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) load();
    }, [id]);

    async function load() {
        try {
            const data = await api.getCommunity(id!);
            setCommunity(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    async function handleJoin() {
        try {
            await api.joinCommunity(id!);
            load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleLeave() {
        try {
            await api.leaveCommunity(id!);
            load();
        } catch (err: any) { alert(err.message); }
    }

    if (loading) return <div className="page"><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;
    if (!community) return <div className="page"><p>{t('error')}</p></div>;

    return (
        <div className="page">

            <div className="glass-card p-5 mb-4 animate-fade-in">
                <h1 className="text-xl font-bold mb-2">🏘️ {community.name}</h1>
                <p className="mb-3" style={{ color: 'var(--tg-hint)' }}>{community.description}</p>
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--tg-hint)' }}>
                    <span>📍 {community.location_tags}</span>
                    <span>👥 {community._count?.members || 0}</span>
                </div>

                <div className="flex gap-2 mt-4">
                    <button className="btn-primary flex-1" onClick={handleJoin}>🤝 {t('join')}</button>
                    <button className="btn-secondary flex-1" onClick={handleLeave}>{t('leave')}</button>
                </div>

                {/* Chat link */}
                <button
                    className="btn-secondary w-full mt-3"
                    style={{ fontSize: 13 }}
                    onClick={() => {
                        const url = community.tg_topic_id
                            ? `https://t.me/c/${SUPERGROUP_NUMERIC}/${community.tg_topic_id}`
                            : SUPERGROUP_LINK;
                        const tg = getTg();
                        if (tg?.openTelegramLink) tg.openTelegramLink(url);
                        else window.open(url, '_blank');
                    }}
                >
                    💬 {t('community_chat')}
                </button>
            </div>

            {/* Members */}
            {community.members && community.members.length > 0 && (
                <div className="mb-4">
                    <h3 className="font-semibold mb-2">👥 {t('members')} ({community.members.length})</h3>
                    <div className="flex flex-col gap-2">
                        {community.members.map((m: any) => (
                            <div key={m.user_id} className="glass-card p-3 flex items-center justify-between" style={{ transform: 'none' }}>
                                <div className="flex items-center gap-2">
                                    <span>👤</span>
                                    <span className="font-medium">{m.user?.name}</span>
                                    {m.is_admin && <span className="badge badge-accent" style={{ fontSize: 10 }}>Адмін</span>}
                                    {m.is_treasurer && <span className="badge badge-warning" style={{ fontSize: 10 }}>💰 Скарбник</span>}
                                </div>
                                <span className="badge badge-success" style={{ fontSize: 10 }}>⭐S {m.user?.c_index || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Community Offers */}
            {community.offers && community.offers.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2">📦 {t('offers')} ({community.offers.length})</h3>
                    <div className="flex flex-col gap-2">
                        {community.offers.map((o: any) => (
                            <div key={o.id} className="glass-card p-3 cursor-pointer" style={{ transform: 'none' }} onClick={() => navigate(`/offer/${o.id}`)}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{o.title}</span>
                                    <span style={{ color: 'var(--success)' }}>{o.price} ₴</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
