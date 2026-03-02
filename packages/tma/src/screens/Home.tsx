import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Home() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [aiMode, setAiMode] = useState(false);
    const [aiMatches, setAiMatches] = useState<any[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        loadOffers();
    }, [filter]);

    async function loadOffers() {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') params.type = filter.toUpperCase();
            if (search && !aiMode) params.search = search;
            const res = await api.getOffers(params);
            setOffers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSearch() {
        if (aiMode && search.trim()) {
            setAiLoading(true);
            try {
                const { matches } = await api.aiMatch(search);
                setAiMatches(matches);
            } catch (err) {
                console.error(err);
                setAiMatches([]);
            } finally {
                setAiLoading(false);
            }
        } else {
            setAiMatches([]);
            loadOffers();
        }
    }

    return (
        <div className="page">
            <div className="flex items-center justify-between mb-4">
                <h1 className="page-header" style={{ marginBottom: 0 }}>🏪 {t('marketplace')}</h1>
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => navigate('/create-offer')}>
                    + {t('create_offer')}
                </button>
            </div>

            {/* Search */}
            <div className="mb-2 flex gap-2">
                <input
                    className="input-field flex-1"
                    placeholder={aiMode ? '🤖 Опишіть що шукаєте...' : t('search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn-secondary" onClick={handleSearch}>{aiLoading ? '⏳' : '🔍'}</button>
            </div>
            <div className="flex gap-2 mb-4">
                <button
                    className={`badge ${aiMode ? 'badge-accent' : ''}`}
                    style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setAiMode(!aiMode); setAiMatches([]); }}
                >
                    🤖 AI Пошук
                </button>
            </div>

            {/* AI Match Results */}
            {aiMode && aiMatches.length > 0 && (
                <div className="mb-4 animate-fade-in">
                    <h3 className="font-semibold mb-2 text-sm">🤖 AI рекомендує:</h3>
                    <div className="flex flex-col gap-2">
                        {aiMatches.map((m: any) => (
                            <div key={m.id} className="glass-card p-3 cursor-pointer" style={{ borderLeft: '3px solid var(--accent)', transform: 'none' }} onClick={() => navigate(`/offer/${m.id}`)}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="badge badge-accent" style={{ fontSize: 10 }}>⭐ {Math.round(m.score * 100)}%</span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>{m.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4">
                {[
                    { key: 'all', label: t('all') },
                    { key: 'individual', label: t('individual') },
                    { key: 'pool', label: t('pool') },
                ].map((f) => (
                    <button
                        key={f.key}
                        className={`badge ${filter === f.key ? 'badge-accent' : ''}`}
                        style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Offers List */}
            {loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
                    ))}
                </div>
            ) : offers.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--tg-hint)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                    <p>{t('no_offers')}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {offers.map((offer, idx) => (
                        <div
                            key={offer.id}
                            className="glass-card p-4 cursor-pointer animate-fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                            onClick={() => navigate(`/offer/${offer.id}`)}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span>{offer.type === 'POOL' ? '👥' : '🛒'}</span>
                                        <h3 className="font-semibold text-base">{offer.title}</h3>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--tg-hint)', lineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                                        {offer.description}
                                    </p>
                                </div>
                                <div className="text-right ml-3">
                                    <div className="font-bold text-lg" style={{ color: 'var(--success)' }}>
                                        {offer.price} ₴
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--tg-hint)' }}>
                                <span>👤 {offer.producer?.name || 'Unknown'}</span>
                                {offer.producer?.c_index > 0 && (
                                    <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: 10 }}>
                                        ⭐S {offer.producer.c_index}
                                    </span>
                                )}
                                {offer.community && <span>🏘️ {offer.community.name}</span>}
                            </div>

                            {/* Pool Progress */}
                            {offer.type === 'POOL' && offer.target_quantity && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--tg-hint)' }}>
                                        <span>{t('progress')}</span>
                                        <span>{offer.current_quantity} / {offer.target_quantity}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${Math.min(100, (Number(offer.current_quantity) / Number(offer.target_quantity)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
