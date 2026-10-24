import { describe, expect, it, vi } from 'vitest';
import { addDays, buildPlan, dailyRate, moneyRound, fmtAmount, signedAmount } from './math';
import { parseState, loadState, saveState, STORAGE_KEY } from './storage';
import type { GoalConfig, DayResult } from '../types';

const base: GoalConfig = { startAmount: 100000, targetAmount: 150000, days: 30, startDate: '2026-10-24', mode: 'adaptive' };
const result = (profit: number): DayResult => ({ profit, recordedAt: new Date('2026-10-24T10:00:00Z').toISOString() });

describe('math and plan', () => {
  it('uses compounded rate, not simple percent', () => {
    expect(dailyRate(100000, 150000, 30)).toBeCloseTo(0.01360725, 6);
    const p = buildPlan(base, {});
    expect(p.rows[29].targetClose).toBe(150000);
    expect(p.rows.reduce((acc, row) => acc + (row.targetProfit ?? 0), 0)).toBeCloseTo(50000, 2);
  });
  it('recalculates after an outperformance', () => {
    const p = buildPlan(base, { 1: result(8000) });
    expect(p.currentBalance).toBe(108000);
    expect(p.remainingDays).toBe(29);
    expect(p.requiredRate!).toBeLessThan(p.baseRate);
    expect(p.rows[29].targetClose).toBe(150000);
  });
  it('recalculates after loss and accepts zero actual profit', () => {
    const p = buildPlan(base, { 1: result(-3000), 2: result(0) });
    expect(p.currentBalance).toBe(97000);
    expect(p.requiredRate!).toBeGreaterThan(p.baseRate);
    expect(p.rows[29].targetClose).toBe(150000);
  });
  it('handles early target completion', () => {
    const p = buildPlan(base, { 1: result(60000) });
    expect(p.goalReached).toBe(true);
    expect(p.nextProfit).toBe(0);
    expect(p.rows[29].targetClose).toBe(160000);
  });
  it('does not promise an achievable daily rate when the period has ended', () => {
    const p = buildPlan({ ...base, days: 1 }, { 1: result(100) });
    expect(p.remainingDays).toBe(0);
    expect(p.goalReached).toBe(false);
    expect(p.requiredRate).toBeNull();
    expect(p.planFinalBalance).toBe(100100);
  });
  it('handles a zero balance as an impossible compound target', () => {
    const p = buildPlan(base, { 1: result(-100000) });
    expect(p.viable).toBe(false);
    expect(p.requiredRate).toBeNull();
    expect(p.rows[1].targetClose).toBeNull();
  });
  it('preserves non-trading plan when fixed', () => {
    const config = { ...base, mode: 'fixed' as const };
    const p = buildPlan(config, { 1: result(-1500) });
    expect(p.rows[1].targetProfit).toBe(moneyRound(buildPlan(config, {}).rows[1].targetProfit!));
    expect(p.planFinalBalance).toBe(150000 - 1500 - buildPlan(config, {}).rows[0].targetProfit!);
  });
  it('handles calendar boundaries and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
  });
  it('saves and reopens the same plan and completed days', () => {
    const entries = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    });
    try {
      const saved = { version: 1 as const, config: base, results: { 1: result(1800) } };
      expect(saveState(saved)).toBe(true);
      expect(entries.has(STORAGE_KEY)).toBe(true);
      expect(loadState()).toEqual(saved);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('formats numbers without any currency symbols or unit names', () => {
    expect(fmtAmount(123456.7)).toBe(new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(123456.7));
    expect(fmtAmount(1250)).not.toMatch(/[₽€$£¥]|RUB|USD|EUR|USDT/);
    expect(signedAmount(-350)).toMatch(/^-350/);
  });
  it('migrates old local plans and backups without losing completed days', () => {
    const old = { version: 1, config: { ...base, currency: 'RUB' }, results: { 1: result(1800) } };
    const restored = parseState(old);
    expect(restored).not.toBeNull();
    expect(restored?.config).toEqual(base);
    expect(restored?.results[1].profit).toBe(1800);
    expect(JSON.stringify(restored)).not.toContain('currency');
  });
  it('rejects impossible dates', () => {
    expect(parseState({ version: 1, config: { ...base, startDate: '2026-02-31' }, results: {} })).toBeNull();
  });
  it('rejects out-of-sequence results on restore', () => {
    const p = parseState({ version: 1, config: base, results: { 2: result(1000) } });
    expect(p?.results).toEqual({});
  });
});
