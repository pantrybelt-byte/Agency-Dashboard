import { describe, expect, it } from 'vitest';
import { resolveDateRange } from './dateRange';

// A fixed "today" so these tests never depend on the wall clock.
const NOW = new Date('2026-08-11T18:30:00.000Z');

describe('resolveDateRange', () => {
  it('resolves 7d to a seven-day inclusive window ending today', () => {
    const result = resolveDateRange('7d', null, NOW);
    expect(result.startDate).toBe('2026-08-05');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(7);
  });

  it('resolves the previous period as the window immediately before', () => {
    const result = resolveDateRange('7d', null, NOW);
    expect(result.previousStartDate).toBe('2026-07-29');
    expect(result.previousEndDate).toBe('2026-08-04');
  });

  it('resolves 30d to a thirty-day inclusive window', () => {
    const result = resolveDateRange('30d', null, NOW);
    expect(result.startDate).toBe('2026-07-13');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(30);
    expect(result.previousEndDate).toBe('2026-07-12');
    expect(result.previousStartDate).toBe('2026-06-13');
  });

  it('resolves 90d to a ninety-day inclusive window', () => {
    const result = resolveDateRange('90d', null, NOW);
    expect(result.dayCount).toBe(90);
    expect(result.endDate).toBe('2026-08-11');
  });

  it('resolves ytd from January 1 of the current year', () => {
    const result = resolveDateRange('ytd', null, NOW);
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-08-11');
    expect(result.dayCount).toBe(223);
    expect(result.previousEndDate).toBe('2025-12-31');
  });

  it('uses the supplied custom range', () => {
    const result = resolveDateRange('custom', { startDate: '2026-07-01', endDate: '2026-07-31' }, NOW);
    expect(result.startDate).toBe('2026-07-01');
    expect(result.endDate).toBe('2026-07-31');
    expect(result.dayCount).toBe(31);
  });

  it('normalises a custom range supplied backwards', () => {
    const result = resolveDateRange('custom', { startDate: '2026-08-01', endDate: '2026-07-01' }, NOW);
    expect(result.startDate).toBe('2026-07-01');
    expect(result.endDate).toBe('2026-08-01');
    expect(result.dayCount).toBe(32);
  });

  it('falls back to 30d when custom is selected without a range', () => {
    const result = resolveDateRange('custom', null, NOW);
    expect(result.startDate).toBe('2026-07-13');
    expect(result.dayCount).toBe(30);
  });

  it('does not shift with the local timezone', () => {
    // Late-evening UTC and early-morning UTC on the same date must agree.
    const lateEvening = resolveDateRange('7d', null, new Date('2026-08-11T23:59:00.000Z'));
    const earlyMorning = resolveDateRange('7d', null, new Date('2026-08-11T00:01:00.000Z'));
    expect(lateEvening).toEqual(earlyMorning);
  });

  it('produces a human label for each preset', () => {
    expect(resolveDateRange('7d', null, NOW).label).toBe('Last 7 days');
    expect(resolveDateRange('ytd', null, NOW).label).toBe('Year to date');
    expect(
      resolveDateRange('custom', { startDate: '2026-07-01', endDate: '2026-07-31' }, NOW).label,
    ).toBe('2026-07-01 – 2026-07-31');
  });
});
