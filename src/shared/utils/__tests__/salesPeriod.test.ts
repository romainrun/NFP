import {
  buildDayPeriod,
  buildRangePeriod,
  formatPeriodLabel,
  parseDateInput,
} from '@/shared/utils/salesPeriod';

describe('salesPeriod', () => {
  it('defaults a day from 00:00 to next midnight', () => {
    const day = new Date(2026, 6, 31); // local Jul 31 2026
    const { fromIso, toIso } = buildDayPeriod(day);
    const from = new Date(fromIso);
    const to = new Date(toIso);
    expect(from.getHours()).toBe(0);
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('builds a full-day range without hour slicing', () => {
    const from = new Date(2026, 6, 30);
    const to = new Date(2026, 6, 31);
    const period = buildRangePeriod(from, to);
    expect(new Date(period.fromIso).getHours()).toBe(0);
    expect(formatPeriodLabel(period.fromIso, period.toIso)).not.toMatch(/\d{2}:\d{2}/);
  });

  it('parses YYYY-MM-DD inputs', () => {
    const date = parseDateInput('2026-07-31');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(6);
    expect(date?.getDate()).toBe(31);
    expect(parseDateInput('31/07/2026')).toBeNull();
  });
});
