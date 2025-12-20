export function parseDate(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function compareDatesDesc(a: string, b: string): number {
    const dateA = parseDate(a);
    const dateB = parseDate(b);

    if (dateA && dateB) {
        return dateB.getTime() - dateA.getTime();
    }

    if (dateA && !dateB) {
        return -1;
    }

    if (!dateA && dateB) {
        return 1;
    }

    return 0;
}

export function isDateInMonth(dateStr: string, monthOffset: number): boolean {
    const date = parseDate(dateStr);
    if (!date) return false;

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

    return (
        date.getFullYear() === targetDate.getFullYear() &&
        date.getMonth() === targetDate.getMonth()
    );
}

export function getMonthRange(offset: number): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
    return { start, end };
}
