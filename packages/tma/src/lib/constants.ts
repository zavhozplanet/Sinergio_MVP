/**
 * Shared status label maps — single source of truth for
 * order / logistics status → Ukrainian label.
 */

export const ORDER_STATUS: Record<string, string> = {
    CREATED: 'Створено',
    PENDING: 'Очікує',
    FUNDING: 'Збір коштів',
    AWAITING_PAYMENT: 'Очікує оплати',
    PAID: 'Оплачено',
    IN_PROGRESS: 'В процесі',
    READY_FOR_LOGISTICS: 'Готово до відправки',
    COMPLETED: 'Завершено',
    DISPUTED: 'Вирішення питань',
};

export const LOGISTICS_STATUS: Record<string, string> = {
    PENDING: 'Очікує',
    PICKED_UP: 'Забрано',
    DELIVERED: 'Доставлено',
};
