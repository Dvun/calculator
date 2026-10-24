import type { GoalConfig, DayResult, PlanSummary, PlanRow } from '../types';

export function moneyRound(value: number): number {
  return Math.sign(value) * Math.round((Math.abs(value) + 1e-9) * 100) / 100;
}

export function dailyRate(start: number, target: number, days: number): number | null {
  if (start <= 0 || target <= 0 || days <= 0) return null;
  if (start >= target) return 0;
  return Math.expm1(Math.log(target / start) / days);
}

export function addDays(iso: string, offset: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

// All values are intentionally unitless: users may plan in any currency or other unit.
export function fmtAmount(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value);
}

export function fmtPercent(rate: number | null, digits = 2): string {
  if (rate === null || !Number.isFinite(rate)) return '—';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(rate * 100)}%`;
}

export function signedAmount(value: number): string {
  return `${value > 0 ? '+' : ''}${fmtAmount(value)}`;
}

export function validateConfig(config: GoalConfig): string | null {
  if (!Number.isFinite(config.startAmount) || config.startAmount <= 0 || config.startAmount > 1e12) return 'Начальная сумма должна быть больше нуля и не превышать 1 трлн.';
  if (!Number.isFinite(config.targetAmount) || config.targetAmount <= config.startAmount || config.targetAmount > 1e12) return 'Целевая сумма должна быть больше начальной и не превышать 1 трлн.';
  if (!Number.isInteger(config.days) || config.days < 1 || config.days > 730) return 'Укажите срок от 1 до 730 дней.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.startDate)) return 'Укажите корректную дату начала.';
  const parsedDate = new Date(`${config.startDate}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== config.startDate) return 'Укажите корректную дату начала.';
  return null;
}

// Completed days form a contiguous prefix. This makes actual capital and future targets unambiguous.
export function buildPlan(config: GoalConfig, results: Record<number, DayResult>): PlanSummary {
  const { startAmount: start, targetAmount: target, days, startDate, mode } = config;
  const baseRate = dailyRate(start, target, days) ?? 0;
  const baselineEnd: number[] = [start];
  for (let i = 1; i <= days; i++) {
    baselineEnd.push(i === days ? target : moneyRound(start * Math.exp(Math.log(target / start) * i / days)));
  }

  let completedDays = 0;
  while (completedDays < days && results[completedDays + 1] && Number.isFinite(results[completedDays + 1].profit)) completedDays++;

  let currentBalance = start;
  for (let i = 1; i <= completedDays; i++) currentBalance = moneyRound(currentBalance + results[i].profit);
  const actualProfit = moneyRound(currentBalance - start);
  const remainingDays = days - completedDays;
  const requiredRate = remainingDays === 0 ? null : dailyRate(currentBalance, target, remainingDays);
  const remainingProfit = Math.max(0, moneyRound(target - currentBalance));
  const progress = Math.max(0, Math.min(1, (currentBalance - start) / (target - start)));

  const rows: PlanRow[] = [];
  let balance = start;
  for (let day = 1; day <= days; day++) {
    const openingBalance = balance;
    const futureDays = days - day + 1;
    let targetProfit: number | null;
    let targetRate: number | null;
    if (mode === 'fixed') {
      targetProfit = moneyRound(baselineEnd[day] - baselineEnd[day - 1]);
      targetRate = openingBalance > 0 ? targetProfit / openingBalance : null;
    } else if (openingBalance <= 0) {
      targetProfit = null;
      targetRate = null;
    } else if (openingBalance >= target) {
      targetProfit = 0;
      targetRate = 0;
    } else {
      const rate = dailyRate(openingBalance, target, futureDays)!;
      const expectedClose = day === days
        ? target
        : moneyRound(openingBalance * (1 + rate));
      targetProfit = moneyRound(expectedClose - openingBalance);
      targetRate = rate;
    }
    const targetClose = targetProfit === null ? null : moneyRound(openingBalance + targetProfit);
    const completed = day <= completedDays;
    const actualProfitDay = completed ? results[day].profit : null;
    const actualClose = completed ? moneyRound(openingBalance + actualProfitDay!) : null;
    rows.push({
      day, date: addDays(startDate, day - 1), openingBalance,
      targetProfit, targetRate, targetClose, baselineClose: baselineEnd[day],
      actualProfit: actualProfitDay, actualClose, completed, active: day === completedDays + 1,
    });
    if (completed) balance = actualClose!;
    else if (targetClose !== null) balance = targetClose;
  }
  const firstFuture = rows[completedDays];
  const viable = currentBalance > 0;
  return {
    rows, baseRate, requiredRate, nextProfit: firstFuture?.targetProfit ?? null,
    currentBalance, completedDays, remainingDays, actualProfit, remainingProfit, progress,
    planFinalBalance: rows[rows.length - 1]?.actualClose ?? rows[rows.length - 1]?.targetClose ?? null,
    goalReached: currentBalance >= target,
    viable,
  };
}
