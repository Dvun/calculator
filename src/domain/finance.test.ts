import {describe,it,expect} from 'vitest';
import {buildGoalPlan,completedGoalDates,dailyRate,goalDates,validateGoal} from './finance';
import type {Goal} from './types';
const goal=(patch:Partial<Goal>={}):Goal=>({id:'g',name:'Тест',startAmount:100,targetAmount:1000,days:30,startDate:'2026-10-24',mode:'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:'2026-10-24T00:00:00.000Z',...patch});
describe('Расчёт торговой цели',()=>{
 it('30 дней сложного процента достигают цели',()=>{expect(dailyRate(100,1000,30)).toBeCloseTo(.0797751623277096,9);const p=buildGoalPlan(goal());expect(p.rows).toHaveLength(30);expect(p.rows.at(-1)?.targetClose).toBe(1000);});
 it('успешный день уменьшает требуемую доходность',()=>{const p=buildGoalPlan(goal({results:{1:{value:13,recordedAt:'2026-10-24T12:00:00.000Z'}}}));expect(p.currentBalance).toBe(113);expect(p.requiredRate).toBeLessThan(dailyRate(100,1000,30)!);expect(p.remainingDays).toBe(29);expect(p.rows.at(-1)?.targetClose).toBe(1000);});
 it('убыток повышает требуемую доходность',()=>{const p=buildGoalPlan(goal({results:{1:{value:-10,recordedAt:''}}}));expect(p.currentBalance).toBe(90);expect(p.requiredRate).toBeGreaterThan(dailyRate(100,1000,30)!);});
 it('нулевой баланс не создаёт невозможную доходность',()=>{const p=buildGoalPlan(goal({results:{1:{value:-100,recordedAt:''}}}));expect(p.viable).toBe(false);expect(p.requiredRate).toBeNull();expect(p.nextProfit).toBeNull();});
 it('выбранные рабочие дни задают даты',()=>{expect(goalDates(goal({days:3,startDate:'2026-10-24',weekdays:[1,2,3,4,5]}))).toEqual(['2026-10-26','2026-10-27','2026-10-28']);});
 it('фиксированный режим не меняет исходные дневные задачи',()=>{const p=buildGoalPlan(goal({mode:'fixed',results:{1:{value:13,recordedAt:''}}}));expect(p.rows[1].targetProfit).toBe(buildGoalPlan(goal({mode:'fixed'})).rows[1].targetProfit);});
 it('завершённые даты относятся только к фактам',()=>{expect(completedGoalDates(goal({days:3,results:{1:{value:3,recordedAt:''}}}))).toEqual(['2026-10-24']);});
 it('трейдерский план не позволяет нулевой стартовый баланс',()=>{expect(validateGoal(goal({startAmount:0}))).not.toBeNull();});
});
