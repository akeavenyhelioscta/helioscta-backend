import { ScrapeCatalogEntry } from "@/lib/scrapeMonitoringTypes";

interface CronSpec {
  minutes: number[];
  hours: number[];
  weekdays: number[]; // Monday=1 ... Sunday=7
}

export interface ScheduleEvaluation {
  expectedLatestRunAt: Date | null;
  staleFallbackHours: number;
  scheduleError: string | null;
}

export interface StalenessEvaluation {
  expectedLatestRunAt: Date | null;
  isStale: boolean;
  staleReason: string | null;
}

const DEFAULT_STALE_FALLBACK_HOURS = 24;

function toZonedDate(date: Date, timeZone: string): Date {
  return new Date(date.toLocaleString("en-US", { timeZone, hour12: false }));
}

function fromZonedDate(zonedDate: Date, timeZone: string): Date {
  const utcGuess = new Date(
    Date.UTC(
      zonedDate.getFullYear(),
      zonedDate.getMonth(),
      zonedDate.getDate(),
      zonedDate.getHours(),
      zonedDate.getMinutes(),
      zonedDate.getSeconds(),
      zonedDate.getMilliseconds()
    )
  );

  const asTimeZone = toZonedDate(utcGuess, timeZone);
  const diffMs = utcGuess.getTime() - asTimeZone.getTime();
  return new Date(utcGuess.getTime() + diffMs);
}

function getDayMon1ToSun7(date: Date): number {
  const day = date.getDay(); // 0 Sunday ... 6 Saturday
  return day === 0 ? 7 : day;
}

function buildRange(start: number, end: number): number[] {
  if (end < start) return [];
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function parseNumberOrRange(part: string, min: number, max: number): number[] | null {
  if (part.includes("-")) {
    const [rawStart, rawEnd] = part.split("-");
    const start = Number.parseInt(rawStart, 10);
    const end = Number.parseInt(rawEnd, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < min || end > max || end < start) return null;
    return buildRange(start, end);
  }

  const val = Number.parseInt(part, 10);
  if (!Number.isFinite(val) || val < min || val > max) return null;
  return [val];
}

function parseCronField(field: string, min: number, max: number): number[] | null {
  if (field.trim() === "*") return buildRange(min, max);

  const pieces = field.split(",").map((x) => x.trim()).filter(Boolean);
  if (pieces.length === 0) return null;

  const acc: number[] = [];
  for (const piece of pieces) {
    const parsed = parseNumberOrRange(piece, min, max);
    if (!parsed) return null;
    acc.push(...parsed);
  }

  return uniqueSorted(acc);
}

function normalizeCronWeekdays(weekdays: number[]): number[] {
  // Cron typically uses 0/7 as Sunday. Internally use Monday=1 ... Sunday=7.
  return uniqueSorted(
    weekdays.map((d) => {
      if (d === 0 || d === 7) return 7;
      return d;
    })
  );
}

function parseCron(cron: string): CronSpec | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart] = parts;

  // v1 supports wildcard day-of-month and month; current scheduler files use this.
  if (dayOfMonthPart !== "*" || monthPart !== "*") return null;

  const minutes = parseCronField(minutePart, 0, 59);
  const hours = parseCronField(hourPart, 0, 23);
  const weekdays = parseCronField(dayOfWeekPart, 0, 7);
  if (!minutes || !hours || !weekdays) return null;

  return {
    minutes,
    hours,
    weekdays: normalizeCronWeekdays(weekdays),
  };
}

function getLatestCronOccurrence(cron: CronSpec, timezone: string, now: Date): Date | null {
  const zonedNow = toZonedDate(now, timezone);

  for (let dayOffset = 0; dayOffset <= 14; dayOffset += 1) {
    const day = new Date(zonedNow);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - dayOffset);

    const weekday = getDayMon1ToSun7(day);
    if (!cron.weekdays.includes(weekday)) continue;

    for (let hIdx = cron.hours.length - 1; hIdx >= 0; hIdx -= 1) {
      for (let mIdx = cron.minutes.length - 1; mIdx >= 0; mIdx -= 1) {
        const candidate = new Date(day);
        candidate.setHours(cron.hours[hIdx], cron.minutes[mIdx], 0, 0);

        if (dayOffset === 0 && candidate.getTime() > zonedNow.getTime()) {
          continue;
        }
        return fromZonedDate(candidate, timezone);
      }
    }
  }

  return null;
}

function parseTimesLocal(timesLocal: string[] | undefined): Array<{ hour: number; minute: number }> {
  if (!timesLocal || timesLocal.length === 0) return [];
  const parsed: Array<{ hour: number; minute: number }> = [];

  for (const value of timesLocal) {
    const [rawHour, rawMinute] = value.split(":");
    const hour = Number.parseInt(rawHour, 10);
    const minute = Number.parseInt(rawMinute, 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;
    parsed.push({ hour, minute });
  }

  parsed.sort((a, b) => {
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });

  const unique = new Map<string, { hour: number; minute: number }>();
  for (const t of parsed) unique.set(`${t.hour}:${t.minute}`, t);
  return [...unique.values()];
}

function getLatestWeeklyOccurrence(
  weekdays: number[],
  timesLocal: Array<{ hour: number; minute: number }>,
  timezone: string,
  now: Date
): Date | null {
  if (weekdays.length === 0 || timesLocal.length === 0) return null;
  const zonedNow = toZonedDate(now, timezone);

  for (let dayOffset = 0; dayOffset <= 14; dayOffset += 1) {
    const day = new Date(zonedNow);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - dayOffset);

    const weekday = getDayMon1ToSun7(day);
    if (!weekdays.includes(weekday)) continue;

    for (let idx = timesLocal.length - 1; idx >= 0; idx -= 1) {
      const candidate = new Date(day);
      candidate.setHours(timesLocal[idx].hour, timesLocal[idx].minute, 0, 0);

      if (dayOffset === 0 && candidate.getTime() > zonedNow.getTime()) {
        continue;
      }
      return fromZonedDate(candidate, timezone);
    }
  }

  return null;
}

export function evaluateSchedule(entry: ScrapeCatalogEntry, now: Date = new Date()): ScheduleEvaluation {
  const fallbackHours = entry.stale_fallback_hours ?? DEFAULT_STALE_FALLBACK_HOURS;

  if (entry.schedule_kind === "cron") {
    if (!entry.cron) {
      return {
        expectedLatestRunAt: new Date(now.getTime() - fallbackHours * 3600_000),
        staleFallbackHours: fallbackHours,
        scheduleError: "missing cron expression",
      };
    }

    const parsed = parseCron(entry.cron);
    if (!parsed) {
      return {
        expectedLatestRunAt: new Date(now.getTime() - fallbackHours * 3600_000),
        staleFallbackHours: fallbackHours,
        scheduleError: `unsupported cron: ${entry.cron}`,
      };
    }

    const expectedLatestRunAt = getLatestCronOccurrence(parsed, entry.timezone, now);
    return {
      expectedLatestRunAt,
      staleFallbackHours: fallbackHours,
      scheduleError: expectedLatestRunAt ? null : "no matching cron occurrence found",
    };
  }

  if (entry.schedule_kind === "weekly_times") {
    const weekdays = entry.weekdays ?? [];
    const times = parseTimesLocal(entry.times_local);
    const expectedLatestRunAt = getLatestWeeklyOccurrence(weekdays, times, entry.timezone, now);

    if (!expectedLatestRunAt) {
      return {
        expectedLatestRunAt: new Date(now.getTime() - fallbackHours * 3600_000),
        staleFallbackHours: fallbackHours,
        scheduleError: "invalid weekly_times schedule",
      };
    }

    return {
      expectedLatestRunAt,
      staleFallbackHours: fallbackHours,
      scheduleError: null,
    };
  }

  return {
    expectedLatestRunAt: new Date(now.getTime() - fallbackHours * 3600_000),
    staleFallbackHours: fallbackHours,
    scheduleError: null,
  };
}

export function evaluateStaleness(
  entry: ScrapeCatalogEntry,
  lastSuccessAt: Date | null,
  now: Date = new Date()
): StalenessEvaluation {
  const { expectedLatestRunAt, scheduleError } = evaluateSchedule(entry, now);

  if (!expectedLatestRunAt) {
    return {
      expectedLatestRunAt: null,
      isStale: lastSuccessAt === null,
      staleReason: lastSuccessAt === null ? "no successful run recorded" : scheduleError,
    };
  }

  if (!lastSuccessAt) {
    return {
      expectedLatestRunAt,
      isStale: true,
      staleReason: "no successful run recorded",
    };
  }

  if (lastSuccessAt.getTime() < expectedLatestRunAt.getTime()) {
    return {
      expectedLatestRunAt,
      isStale: true,
      staleReason: "latest success is older than expected schedule",
    };
  }

  return {
    expectedLatestRunAt,
    isStale: false,
    staleReason: null,
  };
}
