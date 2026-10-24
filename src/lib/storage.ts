import type { DayResult, GoalConfig, PersistedState } from '../types';
import { localToday, validateConfig, moneyRound } from './math';

// localStorage is isolated by the browser origin. The path suffix also separates
// independent GitHub Pages projects hosted under one github.io origin.
export const STORAGE_KEY = `yieldpilot-plan-v1:${typeof window === 'undefined' ? '/' : window.location.pathname.replace(/\/+$|^\/+|\/index\.html$/g, '') || '/'}`;

export const defaultConfig: GoalConfig = {
  startAmount: 100000,
  targetAmount: 150000,
  days: 30,
  startDate: localToday(),
  mode: 'adaptive',
};

function isObject(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }

export function parseState(v: unknown): PersistedState | null {
  if (!isObject(v) || v.version !== 1 || !isObject(v.config) || !isObject(v.results)) return null;
  // Backward compatibility: existing backups may include an old 'currency' field.
  // It is intentionally ignored and will not be written into new saves.
  const c = v.config;
  const config: GoalConfig = {
    startAmount: Number(c.startAmount), targetAmount: Number(c.targetAmount),
    days: Number(c.days), startDate: String(c.startDate),
    mode: c.mode === 'fixed' ? 'fixed' : 'adaptive',
  };
  if (validateConfig(config)) return null;
  const results: Record<number, DayResult> = {};
  // Reject impossible values and retain only a valid, sequential set of completed days.
  let balance = config.startAmount;
  for (let day = 1; day <= config.days; day++) {
    const entry = v.results[String(day)];
    if (!isObject(entry) || typeof entry.profit !== 'number' || !Number.isFinite(entry.profit) || Math.abs(entry.profit) > 1e12 || typeof entry.recordedAt !== 'string') break;
    const profit = moneyRound(entry.profit);
    balance = moneyRound(balance + profit);
    if (balance < 0) break; // debt is outside the scope of this balance planner
    results[day] = { profit, recordedAt: entry.recordedAt };
  }
  return { version: 1, config, results };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const valid = parseState(JSON.parse(raw));
      if (valid) return valid;
    }
  } catch { /* storage may be unavailable in private contexts */ }
  return { version: 1, config: defaultConfig, results: {} };
}

export function saveState(v: PersistedState): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); return true; }
  catch { return false; } // Storage disabled, full, or blocked by browser policy.
}
