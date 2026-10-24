export type GoalMode = 'adaptive' | 'fixed';
export type Page = 'goals' | 'calendar' | 'journal';
export interface DayResult { value: number; note?: string; recordedAt: string }
export interface StakeConfig { payout:number; multiplier:number; attempts:number; minStake:number; stakeStep:number; riskPercent:number; autoMinEntryPercent:number; autoMaxEntryPercent:number; collapsed:boolean; mode:'auto'|'manual'; manualFirstStake:number; manualOverrides:Record<number,number> }
export interface StakeRow { attempt:number; bet:number; lossBefore:number; netIfWin:number; totalLossIfLose:number }
export interface StakeEvaluation {rows:StakeRow[];firstStake:number|null;maxFit:number|null;riskBudget:number;minSeriesCost:number;worstLoss:number;totalLossPercent:number;feasible:boolean;affordable:boolean;withinLimit:boolean;initialWin:number;winsNeeded:number;autoTargetPercent:number;autoTargetStake:number;constrainedByRisk:boolean;lastStepWinsNeeded:number|null;lastStepTradesNeeded:number|null;winsToRecoverFullLoss:number|null;warnings:string[]}
export interface Goal { stakeConfig?:StakeConfig; id: string; name: string; startAmount: number; targetAmount: number; days: number; startDate: string; mode: GoalMode; weekdays: number[]; results: Record<number, DayResult>; createdAt: string }
export interface JournalEntry { id: string; goalId: string; date: string; title: string; note: string; mood: 'great' | 'good' | 'neutral' | 'low'; discipline: 1 | 2 | 3 | 4 | 5; createdAt: string }
export interface Settings { compact: boolean; firstDayMonday: boolean }
export interface DataState { goals: Goal[]; activeGoalId: string | null; journal: JournalEntry[]; settings: Settings }
export interface GoalRow { day: number; date: string; openingBalance: number; targetProfit: number | null; targetRate: number | null; targetClose: number | null; baselineClose: number; actualProfit: number | null; actualClose: number | null; completed: boolean; active: boolean }
export interface GoalPlan { rows: GoalRow[]; baseRate: number | null; requiredRate: number | null; nextProfit: number | null; currentBalance: number; completedDays: number; remainingDays: number; actualProfit: number; remainingProfit: number; progress: number; planFinalBalance: number | null; goalReached: boolean; viable: boolean; drawdown: number; best: number | null; worst: number | null; winDays: number; lossDays: number }
