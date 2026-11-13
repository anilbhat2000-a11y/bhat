import type { Cadence } from "../../generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const FAR_FUTURE = new Date("9999-12-31T23:59:59.999Z");

type IsoWeek = { year: number; week: number };

// ISO-8601 week: the week belongs to the year that holds its Thursday.
function isoWeekOf(date: Date): IsoWeek {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayBased = (d.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  d.setUTCDate(d.getUTCDate() - mondayBased + 3); // the Thursday of this week
  const year = d.getUTCFullYear();
  const dayOfYear0 = (d.getTime() - Date.UTC(year, 0, 1)) / DAY_MS;
  return { year, week: Math.floor(dayOfYear0 / 7) + 1 };
}

// Monday 00:00 UTC of ISO week 1 of the given year is the Monday on or before Jan 4.
function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = Date.UTC(year, 0, 4);
  const jan4MondayBased = (new Date(jan4).getUTCDay() + 6) % 7;
  const week1Monday = jan4 - jan4MondayBased * DAY_MS;
  return new Date(week1Monday + (week - 1) * 7 * DAY_MS);
}

function parseWeekKey(key: string): IsoWeek {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) throw new Error(`bad weekly key: ${key}`);
  return { year: Number(m[1]), week: Number(m[2]) };
}

export function periodKeyFor(cadence: Cadence, date: Date): string {
  switch (cadence) {
    case "WEEKLY": {
      const { year, week } = isoWeekOf(date);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "MONTHLY":
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    case "ANNUAL":
      return String(date.getUTCFullYear());
    case "ONE_TIME":
      return "ONCE";
  }
}

export function periodBounds(cadence: Cadence, key: string): { opensAt: Date; dueAt: Date } {
  switch (cadence) {
    case "WEEKLY": {
      const { year, week } = parseWeekKey(key);
      const opensAt = mondayOfIsoWeek(year, week);
      return { opensAt, dueAt: new Date(opensAt.getTime() + 7 * DAY_MS - 1) };
    }
    case "MONTHLY": {
      const [y, m] = key.split("-").map(Number);
      return {
        opensAt: new Date(Date.UTC(y, m - 1, 1)),
        dueAt: new Date(Date.UTC(y, m, 1) - 1),
      };
    }
    case "ANNUAL": {
      const y = Number(key);
      return { opensAt: new Date(Date.UTC(y, 0, 1)), dueAt: new Date(Date.UTC(y + 1, 0, 1) - 1) };
    }
    case "ONE_TIME":
      return { opensAt: new Date(0), dueAt: FAR_FUTURE };
  }
}

export function nextPeriodKey(cadence: Cadence, key: string): string {
  switch (cadence) {
    case "WEEKLY": {
      const { year, week } = parseWeekKey(key);
      // Dec 28 always falls in the last ISO week of its year.
      const weeksInYear = isoWeekOf(new Date(Date.UTC(year, 11, 28))).week;
      return week < weeksInYear
        ? `${year}-W${String(week + 1).padStart(2, "0")}`
        : `${year + 1}-W01`;
    }
    case "MONTHLY": {
      const [y, m] = key.split("-").map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    case "ANNUAL":
      return String(Number(key) + 1);
    case "ONE_TIME":
      return "ONCE";
  }
}
