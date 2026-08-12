import type { ReportFrequency } from '../types';

/** Basic shape check. Deliberately permissive — this gates a UI form, not auth. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Split a free-text recipients field into addresses.
 * Accepts commas, semicolons, newlines and stray whitespace, because people
 * paste from every one of those.
 */
export function parseRecipients(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (entry.length === 0) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function findInvalidRecipients(recipients: string[]): string[] {
  return recipients.filter((address) => !EMAIL.test(address));
}

/**
 * When a schedule created now would next send.
 *
 * Weekly targets the next occurrence of `sendOnDay` (0 = Sunday). Monthly and
 * quarterly target day-of-month `sendOnDay`, rolling into the next period when
 * that day has already passed. Quarterly advances three months at a time.
 *
 * Days are clamped to 28 by the form so this never has to reason about short
 * months.
 */
export function computeNextRun(frequency: ReportFrequency, sendOnDay: number, from: Date): Date {
  const next = new Date(from.getTime());
  next.setUTCHours(9, 0, 0, 0);

  if (frequency === 'weekly') {
    const target = ((sendOnDay % 7) + 7) % 7;
    let delta = (target - next.getUTCDay() + 7) % 7;
    if (delta === 0 && next.getTime() <= from.getTime()) delta = 7;
    next.setUTCDate(next.getUTCDate() + delta);
    return next;
  }

  const dayOfMonth = Math.min(Math.max(sendOnDay, 1), 28);
  next.setUTCDate(dayOfMonth);

  const step = frequency === 'quarterly' ? 3 : 1;
  if (next.getTime() <= from.getTime()) {
    next.setUTCMonth(next.getUTCMonth() + step);
  }
  return next;
}

export function describeSchedule(
  frequency: ReportFrequency,
  sendOnDay: number,
  recipientCount: number,
): string {
  const cadence =
    frequency === 'weekly'
      ? `every ${WEEKDAYS[((sendOnDay % 7) + 7) % 7]}`
      : frequency === 'monthly'
        ? `on day ${sendOnDay} of each month`
        : `on day ${sendOnDay} of each quarter`;

  const audience = recipientCount === 1 ? '1 recipient' : `${recipientCount} recipients`;
  return `Sends ${cadence} to ${audience}`;
}
