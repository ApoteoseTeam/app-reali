import type { Range } from './reali';

export function reportMonths(today: string, earliest?: string) {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const month = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    const options: { label: string; range: Range }[] = [];

    for (let index = 0; index < 12; index++) {
        const first = month.toISOString().slice(0, 10);
        const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
        if (earliest && last < earliest) break;
        options.push({
            label: label.format(month),
            range: {
                start_date: earliest && first < earliest ? earliest : first,
                end_date: last < today ? last : today,
            },
        });
        month.setUTCMonth(month.getUTCMonth() - 1);
    }
    return options;
}
