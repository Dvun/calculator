import {describe,it,expect} from 'vitest';
import {DEFAULT_STAKE_CONFIG,evaluateStakePlan,makeStakeRows,maxFirstStakeWithinBudget,normalizeStakeConfig} from './stakes';
const c=DEFAULT_STAKE_CONFIG;
const calc=(changes:Partial<typeof c>={},balance=1000,startAmount=1000,dailyTarget=20)=>evaluateStakePlan({balance,startAmount,dailyTarget,baseDailyTarget:20,config:{...c,...changes}});
describe('Калькулятор ставок · адаптивный риск',()=>{
 it('дефолты: 92%, x2, 5% риск и вход 0,25–1%',()=>{
  expect(c.payout).toBe(92);expect(c.multiplier).toBe(2);expect(c.riskPercent).toBe(5);
  expect(c.autoMinEntryPercent).toBe(0.25);expect(c.autoMaxEntryPercent).toBe(1);expect(c.minStake).toBe(1);
 });
 it('баланс 5110 после старта 100: старт 12,78, серия 191,70, нужно 6 WIN',()=>{
  const plan=calc({attempts:4},5110,100,60.55);
  expect(plan.firstStake).toBe(12.78);expect(plan.worstLoss).toBe(191.70);expect(plan.feasible).toBe(true);
  expect(plan.winsNeeded).toBe(6);expect(plan.totalLossPercent).toBeLessThan(5);
 });
 it('рост капитала снижает долю ставки, но сумма ставки может вырасти',()=>{
  const before=calc({attempts:2},1000,1000,200);
  const after=calc({attempts:2},2000,1000,200);
  expect(after.firstStake!).toBeGreaterThan(before.firstStake!);
  expect(after.autoTargetPercent).toBeLessThan(before.autoTargetPercent);
  expect(after.totalLossPercent).toBeLessThan(before.totalLossPercent);
 });
 it('рисковый потолок сокращает первую ставку без превышения 5%',()=>{
  const plan=calc({attempts:4},1000,1000,200);
  expect(plan.constrainedByRisk).toBe(true);expect(plan.worstLoss).toBeLessThanOrEqual(50);
 });
 it('не увеличивает лимит ради обязательного минимума 1',()=>{
  const plan=calc({attempts:4},100,100,30);
  expect(plan.minSeriesCost).toBe(15);expect(plan.firstStake).toBeNull();expect(plan.feasible).toBe(false);
 });
 it('при выплате 92% и x2 пятая ступень не компенсирует прошлые потери',()=>{
  const rows=makeStakeRows(1,{...c,attempts:5});expect(rows.map(r=>r.bet)).toEqual([1,2,4,8,16]);
  expect(rows[4].totalLossIfLose).toBe(31);expect(rows[4].netIfWin).toBe(-0.28);
 });
 it('ручной режим допускает отдельную ставку, но показывает риск',()=>{
  const plan=calc({mode:'manual',manualFirstStake:5,attempts:3,manualOverrides:{2:15}},100,100);
  expect(plan.rows.map(x=>x.bet)).toEqual([5,15,30]);expect(plan.feasible).toBe(false);
 });
 it('состояние свернутости и старые настройки безопасно мигрируют',()=>{
  const cfg=normalizeStakeConfig({collapsed:true,payout:88,riskPercent:3,desiredWins:4,deRiskPerDouble:20});
  expect(cfg.collapsed).toBe(true);expect(cfg.riskPercent).toBe(3);expect(cfg.autoMinEntryPercent).toBe(0.25);
  expect(cfg).not.toHaveProperty('desiredWins');expect(cfg).not.toHaveProperty('deRiskPerDouble');
 });
 it('максимум стартовой ставки для 3 попыток при лимите 20 равен 2,85',()=>{
  expect(maxFirstStakeWithinBudget(20,{...c,attempts:3})).toBe(2.85);
 });
});
