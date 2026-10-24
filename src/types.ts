export type PlanMode = 'adaptive' | 'fixed';

export interface GoalConfig {
  startAmount: number;
  targetAmount: number;
  days: number;
  startDate: string;
  mode: PlanMode;
}

export interface DayResult {
  profit: number;
  recordedAt: string;
}

export interface PersistedState {
  version: 1;
  config: GoalConfig;
  results: Record<number, DayResult>;
}

export interface PlanRow {
  day: number;
  date: string;
  openingBalance: number;
  targetProfit: number | null;
  targetRate: number | null;
  targetClose: number | null;
  baselineClose: number;
  actualProfit: number | null;
  actualClose: number | null;
  completed: boolean;
  active: boolean;
}

export interface PlanSummary {
  rows: PlanRow[];
  baseRate: number;
  requiredRate: number | null;
  nextProfit: number | null;
  currentBalance: number;
  completedDays: number;
  remainingDays: number;
  actualProfit: number;
  remainingProfit: number;
  progress: number;
  planFinalBalance: number | null;
  goalReached: boolean;
  viable: boolean;
}
