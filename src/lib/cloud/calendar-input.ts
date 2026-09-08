const monthPattern = /^(\d{4})-(\d{2})$/;

export type CalendarDay = { iso: string; day: number; inMonth: boolean };

export function currentMonth(timeZone = "Europe/Moscow", now = new Date()) {
  return currentCalendarDay(timeZone, now).slice(0, 7);
}

export function currentCalendarDay(timeZone = "Europe/Moscow", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseCalendarMonth(value: string | undefined, fallback = currentMonth()) {
  const match = value?.match(monthPattern);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12 ? value! : fallback;
}

export function shiftCalendarMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calendarMonthBounds(value: string) {
  const next = shiftCalendarMonth(value, 1);
  return { first: `${value}-01`, last: isoDay(new Date(Date.UTC(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1, 0))) };
}

export function buildCalendarDays(value: string): CalendarDay[] {
  const { first, last } = calendarMonthBounds(value);
  const firstDate = parseIsoDay(first);
  const mondayOffset = (firstDate.getUTCDay() + 6) % 7;
  const start = addDays(firstDate, -mondayOffset);
  const lastDate = parseIsoDay(last);
  const sundayOffset = 6 - ((lastDate.getUTCDay() + 6) % 7);
  const end = addDays(lastDate, sundayOffset);
  const days: CalendarDay[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const iso = isoDay(date);
    days.push({ iso, day: date.getUTCDate(), inMonth: iso.startsWith(`${value}-`) });
  }
  return days;
}

function parseIsoDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: Date, count: number) { return new Date(value.getTime() + count * 86_400_000); }
function isoDay(value: Date) { return value.toISOString().slice(0, 10); }
