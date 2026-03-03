/**
 * Shared Telegram WebApp helpers — eliminates getTg() duplication
 * across App.tsx, Communities.tsx, CommunityDetail.tsx, CreateOffer.tsx.
 */

/** Safe accessor for the Telegram WebApp object. */
export function getTg() {
    try {
        return (window as any).Telegram?.WebApp ?? null;
    } catch {
        return null;
    }
}

/** Current Telegram user from initDataUnsafe (null outside TG). */
export function getTgUser() {
    try {
        return (window as any).Telegram?.WebApp?.initDataUnsafe?.user ?? null;
    } catch {
        return null;
    }
}

/** Open a Telegram chat link natively inside TG, fallback to window.open. */
export function openChatLink(url: string) {
    const tg = getTg();
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

/** The supergroup invite link from env, with a sensible fallback. */
export const SUPERGROUP_LINK =
    import.meta.env.VITE_SUPERGROUP_LINK || 'https://t.me/+9VMozYg_a704OWQ6';
