import { describe, expect, it } from 'vitest';
import { buildCSV, escapeCSVValue } from './csvExport';

describe('escapeCSVValue', () => {
  it('quotes plain values', () => {
    expect(escapeCSVValue('Montgomery')).toBe('"Montgomery"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCSVValue('The "Big" Pantry')).toBe('"The ""Big"" Pantry"');
  });

  it('renders null and undefined as empty cells', () => {
    expect(escapeCSVValue(null)).toBe('""');
    expect(escapeCSVValue(undefined)).toBe('""');
  });

  it('serialises objects and arrays', () => {
    expect(escapeCSVValue(['36104', '36067'])).toBe('"[""36104"",""36067""]"');
  });

  it('neutralises a leading equals so Excel does not evaluate it', () => {
    expect(escapeCSVValue('=1+1')).toBe(`"'=1+1"`);
  });

  it('neutralises the other formula triggers', () => {
    expect(escapeCSVValue('+SUM(A1)')).toBe(`"'+SUM(A1)"`);
    expect(escapeCSVValue('-2+3')).toBe(`"'-2+3"`);
    expect(escapeCSVValue('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  });

  it('neutralises the classic command-execution payload', () => {
    const payload = '=cmd|\' /C calc\'!A0';
    expect(escapeCSVValue(payload).startsWith(`"'=`)).toBe(true);
  });

  it('leaves negative numbers readable while still neutralising them', () => {
    // A leading minus is a formula trigger, so it is prefixed. Excel shows the
    // literal text; correctness of the value beats silent evaluation.
    expect(escapeCSVValue(-12.5)).toBe(`"'-12.5"`);
    expect(escapeCSVValue(12.5)).toBe('"12.5"');
  });
});

describe('buildCSV', () => {
  const rows = [
    { name: 'Montgomery Pantry', visits: 1200 },
    { name: 'Prattville Central', visits: 940 },
  ];

  it('returns an empty string for no data', () => {
    expect(buildCSV([])).toBe('');
  });

  it('uses the raw keys as headers when no columns are given', () => {
    expect(buildCSV(rows).split('\r\n')[0]).toBe('"name","visits"');
  });

  it('uses supplied column labels and order', () => {
    const csv = buildCSV(rows, [
      { key: 'visits', label: 'Total Visits' },
      { key: 'name', label: 'Pantry Name' },
    ]);
    const [header, first] = csv.split('\r\n');
    expect(header).toBe('"Total Visits","Pantry Name"');
    expect(first).toBe('"1200","Montgomery Pantry"');
  });

  it('separates records with CRLF as RFC 4180 requires', () => {
    expect(buildCSV(rows).split('\r\n')).toHaveLength(3);
    expect(buildCSV(rows)).not.toMatch(/[^\r]\n/);
  });
});
