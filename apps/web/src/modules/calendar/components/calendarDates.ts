import type { CalendarEvent } from '../api';

export type CalendarDateSettings = {
  timezone: string;
  locale: string;
  dateFormat: string;
  weekStartsOn: string;
};

export const DEFAULT_CALENDAR_DATE_SETTINGS: CalendarDateSettings = {
  timezone: 'UTC',
  locale: 'en',
  dateFormat: 'MMM d, yyyy',
  weekStartsOn: 'monday',
};

export function getMonthRange(month: Date, weekStartsOn: string = DEFAULT_CALENDAR_DATE_SETTINGS.weekStartsOn) {
  const weekStart = getWeekStartIndex(weekStartsOn);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  const from = new Date(first);
  from.setDate(first.getDate() - getDaysSinceWeekStart(first, weekStart));
  const to = new Date(last);
  to.setDate(last.getDate() + getDaysUntilWeekEnd(last, weekStart));
  return { from, to };
}

export function eventTouchesDate(event: CalendarEvent, date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
  const eventStart = new Date(event.startAt).getTime();
  const eventEnd = new Date(event.endAt).getTime();
  return eventStart <= dayEnd && eventEnd >= dayStart;
}

export function eventTouchesTenantDate(
  event: CalendarEvent,
  date: Date,
  settings: CalendarDateSettings,
) {
  const dayKey = toDateKey(date);
  const eventStartKey = toDateKeyInTimeZone(new Date(event.startAt), settings.timezone);
  const eventEndKey = toDateKeyInTimeZone(new Date(event.endAt), settings.timezone);
  return eventStartKey <= dayKey && eventEndKey >= dayKey;
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getWeekStartIndex(weekStartsOn: string) {
  return weekStartsOn.toLowerCase() === 'sunday' ? 0 : 1;
}

export function getWeekdayLabels(weekStartsOn: string, locale: string) {
  const baseSunday = new Date(2026, 6, 5);
  const formatter = new Intl.DateTimeFormat(locale || DEFAULT_CALENDAR_DATE_SETTINGS.locale, { weekday: 'short' });
  const weekStart = getWeekStartIndex(weekStartsOn);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(baseSunday);
    day.setDate(baseSunday.getDate() + ((weekStart + index) % 7));
    return formatter.format(day);
  });
}

export function formatFloatingDate(
  date: Date,
  settings: CalendarDateSettings,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!options) return formatDateParts(getLocalDateParts(date), settings);

  return new Intl.DateTimeFormat(
    settings.locale || DEFAULT_CALENDAR_DATE_SETTINGS.locale,
    options,
  ).format(date);
}

export function formatTenantTimestamp(date: string | Date, settings: CalendarDateSettings) {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return `${formatDateParts(getTimeZoneDateParts(parsedDate, settings), settings)} ${formatTenantTime(parsedDate, settings)}`;
}

export function formatTenantTime(date: string | Date, settings: CalendarDateSettings) {
  return new Intl.DateTimeFormat(settings.locale || DEFAULT_CALENDAR_DATE_SETTINGS.locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: settings.timezone || DEFAULT_CALENDAR_DATE_SETTINGS.timezone,
  }).format(typeof date === 'string' ? new Date(date) : date);
}

function getDaysSinceWeekStart(date: Date, weekStart: number) {
  return (date.getDay() - weekStart + 7) % 7;
}

function getDaysUntilWeekEnd(date: Date, weekStart: number) {
  return (weekStart + 6 - date.getDay() + 7) % 7;
}

function toDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, {
    ...DEFAULT_CALENDAR_DATE_SETTINGS,
    timezone: timeZone,
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getLocalDateParts(date: Date) {
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

function getTimeZoneDateParts(date: Date, settings: CalendarDateSettings) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: settings.timezone || DEFAULT_CALENDAR_DATE_SETTINGS.timezone,
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
}

function formatDateParts(
  parts: { year: string; month: string; day: string },
  settings: CalendarDateSettings,
) {
  if (settings.dateFormat === 'dd/MM/yyyy') return `${parts.day}/${parts.month}/${parts.year}`;
  if (settings.dateFormat === 'MM/dd/yyyy') return `${parts.month}/${parts.day}/${parts.year}`;

  const sampleDate = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const month = new Intl.DateTimeFormat(settings.locale || DEFAULT_CALENDAR_DATE_SETTINGS.locale, {
    month: 'short',
  }).format(sampleDate);
  return `${month} ${Number(parts.day)}, ${parts.year}`;
}
