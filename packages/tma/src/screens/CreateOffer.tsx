import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

function getTg() {
    try { return (window as any).Telegram?.WebApp ?? null; } catch { return null; }
}

export default function CreateOffer() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [communities, setCommunities] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const isDirtyRef = useRef(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        price: '',
        type: 'INDIVIDUAL',
        visibility: 'GLOBAL',
        community_id: '',
        target_quantity: '',
        deadline: '',
    });

    useEffect(() => {
        api.getCommunities().then(setCommunities).catch(console.error);
    }, []);

    // Enable closing confirmation when user starts typing
    function update(key: string, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            getTg()?.enableClosingConfirmation?.();
        }
    }

    // Disable when leaving form
    useEffect(() => {
        return () => {
            getTg()?.disableClosingConfirmation?.();
        };
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data: any = {
                title: form.title,
                description: form.description,
                price: parseFloat(form.price),
                type: form.type,
                visibility: form.visibility,
            };
            if (form.community_id) data.community_id = form.community_id;
            if (form.type === 'POOL' && form.target_quantity) data.target_quantity = parseFloat(form.target_quantity);
            if (form.deadline) data.deadline = new Date(form.deadline).toISOString();

            await api.createOffer(data);
            getTg()?.disableClosingConfirmation?.();
            navigate('/');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="page">
            <h1 className="page-header">✨ {t('create_offer')}</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm mb-1 font-medium">{t('name')}</label>
                    <input className="input-field" required value={form.title} onChange={(e) => update('title', e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm mb-1 font-medium">{t('description')}</label>
                    <textarea className="input-field" required value={form.description} onChange={(e) => update('description', e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm mb-1 font-medium">{t('price')} (₴)</label>
                    <input className="input-field" type="number" step="0.01" min="0" required value={form.price} onChange={(e) => update('price', e.target.value)} />
                </div>

                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="block text-sm mb-1 font-medium">{t('offer_type')}</label>
                        <select className="input-field" value={form.type} onChange={(e) => update('type', e.target.value)}>
                            <option value="INDIVIDUAL">{t('individual')}</option>
                            <option value="POOL">{t('pool')}</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm mb-1 font-medium">{t('offer_visibility')}</label>
                        <select className="input-field" value={form.visibility} onChange={(e) => update('visibility', e.target.value)}>
                            <option value="GLOBAL">{t('visibility_global')}</option>
                            <option value="COMMUNITY_ONLY">{t('visibility_community')}</option>
                        </select>
                    </div>
                </div>

                {communities.length > 0 && (
                    <div>
                        <label className="block text-sm mb-1 font-medium">{t('community')}</label>
                        <select className="input-field" value={form.community_id} onChange={(e) => update('community_id', e.target.value)}>
                            <option value="">{t('no_community')}</option>
                            {communities.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.location_tags})</option>
                            ))}
                        </select>
                    </div>
                )}

                {form.type === 'POOL' && (
                    <>
                        <div>
                            <label className="block text-sm mb-1 font-medium">{t('target')} (од.)</label>
                            <input className="input-field" type="number" min="2" required value={form.target_quantity} onChange={(e) => update('target_quantity', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm mb-1 font-medium">{t('deadline')}</label>
                            <input className="input-field" type="datetime-local" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
                        </div>
                    </>
                )}

                <button className="btn-primary w-full mt-2" type="submit" disabled={submitting}>
                    {submitting ? '⏳' : '🚀'} {t('create_offer')}
                </button>
            </form>
        </div>
    );
}
