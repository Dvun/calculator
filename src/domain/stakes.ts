import type {StakeConfig,StakeRow,StakeEvaluation} from './types';
import {round} from './finance';

export const DEFAULT_STAKE_CONFIG:StakeConfig={
 payout:92,multiplier:2,attempts:2,minStake:1,stakeStep:0.01,
 riskPercent:5,autoMinEntryPercent:0.25,autoMaxEntryPercent:1,
 collapsed:false,mode:'auto',manualFirstStake:1,manualOverrides:{}
};


const asObj= (value:unknown):Record<string, unknown > => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
const bounded=(value:unknown, fallback:number, min:number, max:number)=> typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max,value)):fallback;
const cents=(n:number)=> Math.round(n*100) / 100;


export function normalizeStakeConfig(value:unknown):StakeConfig{
 const raw= asObj(value), def= DEFAULT_STAKE_CONFIG;
 const overrides:Record<number, number> = {};
 for(const [key,v] of Object.entries(asObj(raw.manualOverrides))) {
  const step= Number(key);
  if(Number.isInteger(step) && step >= 2 && step <= 10 && typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 1e10)
   overrides[step] = cents(v);
 }
 const min= bounded(raw.autoMinEntryPercent, def.autoMinEntryPercent,0.05,2);
 const max= Math.max(min, bounded(raw.autoMaxEntryPercent, def.autoMaxEntryPercent,0.05,5));


 return {
  payout:bounded(raw.payout, def.payout,1,100),
  multiplier:bounded(raw.multiplier, def.multiplier,1,4),
  attempts:Math.trunc(bounded(raw.attempts, def.attempts,1,10)),
  minStake:cents(bounded(raw.minStake, def.minStake,1,1e8)),
  stakeStep:[0.01,0.1,1].includes(Number(raw.stakeStep)) ? Number(raw.stakeStep):def.stakeStep,
  riskPercent:bounded(raw.riskPercent, def.riskPercent,0.1,20),
  autoMinEntryPercent:min,autoMaxEntryPercent:max,
  collapsed:raw.collapsed === true,
  mode:raw.mode === 'manual' ? 'manual' : 'auto',
  manualFirstStake:cents(bounded(raw.manualFirstStake, def.manualFirstStake,1,1e10)),
  manualOverrides:overrides
 };
}


export function ceilStake(amount:number,step:number):number {
 return cents(Math.ceil((amount-1e-10) / step) * step);
}


export function makeStakeRows(firstStake:number,config:StakeConfig):StakeRow[]{
 const rows:StakeRow[]=[];let losses=0,previous=0;
 for(let i=1;i<=config.attempts;i++){
  const raw=i===1?firstStake:(config.mode==='manual'&&config.manualOverrides[i]!==undefined?config.manualOverrides[i]:previous*config.multiplier);
  const bet=ceilStake(raw,config.stakeStep);previous=bet;
  const net=round(bet*config.payout/100-losses);losses=round(losses+bet);
  rows.push({attempt:i,bet,lossBefore:round(losses-bet),netIfWin:net,totalLossIfLose:losses});
 }
 return rows;
}


export function maxFirstStakeWithinBudget(budget:number,config:StakeConfig):number|null{
 if(!Number.isFinite(budget)||budget<config.minStake)return null;
 const normalized={...config,mode:'auto' as const};
 const minimum=ceilStake(config.minStake,config.stakeStep);
 if(makeStakeRows(minimum,normalized).at(-1)!.totalLossIfLose>budget+0.00001)return null;
 const unit=config.stakeStep;
 let low=Math.ceil(minimum/unit-1e-9),high=Math.floor(budget/unit+1e-9),answer=low;
 while(low<=high){const mid=Math.floor((low+high)/2),bet=cents(mid*unit);
  const total=makeStakeRows(bet,normalized).at(-1)!.totalLossIfLose;
  if(total<=budget+0.00001){answer=mid;low=mid+1;}else high=mid-1;
 }
 return cents(answer*unit);
}


export function evaluateStakePlan(input:{balance:number;startAmount:number;dailyTarget:number;baseDailyTarget:number;config:StakeConfig}):StakeEvaluation{
 const {balance,startAmount,dailyTarget}=input,config=normalizeStakeConfig(input.config);
 const safeBalance=Math.max(0,Number.isFinite(balance)?balance:0),payout=config.payout/100;
 const riskBudget=cents(safeBalance*config.riskPercent/100);
 const hardMax=maxFirstStakeWithinBudget(riskBudget,config);
 const minRows=makeStakeRows(ceilStake(config.minStake,config.stakeStep),{...config,mode:'auto'});
 const minSeriesCost=minRows.at(-1)?.totalLossIfLose??0;
 const growth=Math.max(1,safeBalance/Math.max(startAmount,0.01));
 const autoTargetPercent=Math.max(config.autoMinEntryPercent,config.autoMaxEntryPercent/Math.sqrt(growth));
 const autoTargetStake=ceilStake(Math.max(config.minStake,safeBalance*autoTargetPercent/100),config.stakeStep);
 const constrainedByRisk=hardMax!==null&&autoTargetStake>hardMax+0.00001;
 const recommendedStake=hardMax===null?null:Math.max(config.minStake,Math.min(autoTargetStake,hardMax));
 const firstStake=config.mode==='manual'?config.manualFirstStake:(recommendedStake??ceilStake(config.minStake,config.stakeStep));
 const rows=makeStakeRows(firstStake,config),worstLoss=rows.at(-1)?.totalLossIfLose??0;
 const affordable=worstLoss<=safeBalance+0.00001,withinLimit=worstLoss<=riskBudget+0.00001;
 const feasible=(config.mode==='auto'?recommendedStake!==null:true)&&affordable&&withinLimit;
 const initialWin=round(firstStake*payout);
 const winsNeeded=initialWin>0&&dailyTarget>0?Math.ceil((dailyTarget-1e-8)/initialWin):0;
 const finalWin=rows.at(-1)?.netIfWin??0;
 const lastStepWinsNeeded=finalWin>0&&dailyTarget>0?Math.ceil((dailyTarget-1e-8)/finalWin):dailyTarget<=0?0:null;
 const lastStepTradesNeeded=lastStepWinsNeeded===null?null:lastStepWinsNeeded*config.attempts;
 const winsToRecoverFullLoss=initialWin>0?Math.ceil((Math.max(0,dailyTarget)+worstLoss-1e-8)/initialWin):null;
 const warnings:string[]=[];
 if(hardMax===null)warnings.push(`Минимальная серия ${minSeriesCost.toFixed(2)} больше дневного лимита ${riskBudget.toFixed(2)}. Необходимо уменьшить число попыток или изменить риск.`);
 if(!affordable)warnings.push('Полная серия превышает текущий депозит.');
 if(!withinLimit&&hardMax!==null)warnings.push('Полная серия превышает допустимую дневную потерю.');
 if(rows.some(r=>r.netIfWin<=0))warnings.push('На отдельных ступенях выигрыш не компенсирует прошлые проигрыши при этом множителе и выплате.');
 if(config.mode==='auto'&&constrainedByRisk)warnings.push('Первая ставка снижена относительно расчёта по проценту баланса, чтобы вся серия укладывалась в дневной лимит.');

 return {
  rows,
  firstStake:config.mode === 'auto' && recommendedStake === null ? null:firstStake,
  maxFit:hardMax,
  riskBudget,
  minSeriesCost,
  worstLoss,
  totalLossPercent:safeBalance > 0 ? worstLoss / safeBalance * 100 : 0,
  feasible,
  affordable,
  withinLimit,
  initialWin,
  winsNeeded,
  autoTargetPercent,
  autoTargetStake,
  constrainedByRisk,
  lastStepWinsNeeded,
  lastStepTradesNeeded,
  winsToRecoverFullLoss,
  warnings
 };
}
