import {
  addDays,
  endOfDay,
  format,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export type DayPreset = 'today' | 'yesterday' | 'range';

/**
 * Builds an ISO period for a full calendar day: 00:00 → next midnight.
 */
export function buildDayPeriod(
  day: Date,
  startHour = 0,
  endHour = 24,
): { fromIso: string; toIso: string } {
  const base = startOfDay(day);
  const from = setMilliseconds(
    setSeconds(setMinutes(setHours(base, clampHour(startHour, 0, 23)), 0), 0),
    0,
  );

  let to: Date;
  if (endHour >= 24) {
    to = startOfDay(addDays(base, 1));
  } else {
    to = setMilliseconds(
      setSeconds(setMinutes(setHours(base, clampHour(endHour, 0, 23)), 0), 0),
      0,
    );
  }

  if (to <= from) {
    to = startOfDay(addDays(base, 1));
  }

  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

export function presetDay(preset: 'today' | 'yesterday'): Date {
  return preset === 'today' ? new Date() : subDays(new Date(), 1);
}

/** Inclusive date range as full calendar days (no hour slicing). */
export function buildRangePeriod(
  fromDate: Date,
  toDate: Date,
): { fromIso: string; toIso: string } {
  const from = buildDayPeriod(fromDate, 0, 24).fromIso;
  const to = buildDayPeriod(toDate, 0, 24).toIso;
  return { fromIso: from, toIso: to };
}

/** Human label without clock times (full-day periods only). */
export function formatPeriodLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const lastIncluded = new Date(new Date(toIso).getTime() - 1);
  const sameDay =
    format(from, 'yyyy-MM-dd') === format(lastIncluded, 'yyyy-MM-dd');

  if (sameDay) {
    return format(from, 'EEEE d MMMM', { locale: fr });
  }

  return `${format(from, 'd MMM', { locale: fr })} → ${format(lastIncluded, 'd MMM yyyy', { locale: fr })}`;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

function clampHour(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseDateInput(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export { endOfDay, format, startOfDay, subDays };
