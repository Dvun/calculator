import {describe,it,expect} from 'vitest';
import {buildGoalPlan,canChangeDate,completedGoalDates,dailyRate,dayDelta,factDateWindow,goalDates,parseMoney,validateFactDate,validateGoal} from './finance';
import type {DayResult,Goal} from './types';
const goal=(patch:Partial<Goal>={}):Goal=>({id:'g',name:'Тест',startAmount:100,targetAmount:1000,days:30,startDate:'2026-10-24',mode:'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:'2026-10-24T00:00:00.000Z',...patch});
const fact=(value:number,date='2026-10-24'):DayResult=>({value,recordedAt:'',date});
describe('Расчёт торговой цели',()=>{
 it('30 дней сложного процента достигают цели',()=>{expect(dailyRate(100,1000,30)).toBeCloseTo(.0797751623277096,9);const p=buildGoalPlan(goal());expect(p.rows).toHaveLength(30);expect(p.rows.at(-1)?.targetClose).toBe(1000);});
 it('успешный день уменьшает требуемую доходность',()=>{const p=buildGoalPlan(goal({results:{1:fact(13)}}));expect(p.currentBalance).toBe(113);expect(p.requiredRate).toBeLessThan(dailyRate(100,1000,30)!);expect(p.remainingDays).toBe(29);expect(p.rows.at(-1)?.targetClose).toBe(1000);});
 it('убыток повышает требуемую доходность',()=>{const p=buildGoalPlan(goal({results:{1:fact(-10)}}));expect(p.currentBalance).toBe(90);expect(p.requiredRate).toBeGreaterThan(dailyRate(100,1000,30)!);});
 it('нулевой баланс не создаёт невозможную доходность',()=>{const p=buildGoalPlan(goal({results:{1:fact(-100)}}));expect(p.viable).toBe(false);expect(p.requiredRate).toBeNull();expect(p.nextProfit).toBeNull();});
 it('выбранные рабочие дни задают даты',()=>{expect(goalDates(goal({days:3,startDate:'2026-10-24',weekdays:[1,2,3,4,5]}))).toEqual(['2026-10-26','2026-10-27','2026-10-28']);});
 it('фиксированный режим не меняет исходные дневные задачи',()=>{const p=buildGoalPlan(goal({mode:'fixed',results:{1:fact(13)}}));expect(p.rows[1].targetProfit).toBe(buildGoalPlan(goal({mode:'fixed'})).rows[1].targetProfit);});
 it('завершённые даты — это даты фактов, а не расписания',()=>{expect(completedGoalDates(goal({days:3,results:{1:fact(3,'2026-10-25')}}))).toEqual(['2026-10-25']);});
 it('трейдерский план не позволяет нулевой стартовый баланс',()=>{expect(validateGoal(goal({startAmount:0}))).not.toBeNull();});
});
describe('Ввод баланса на конец дня',()=>{
 it('принимает запятую, точку и пробелы-разделители тысяч',()=>{expect(parseMoney('214,24')).toBe(214.24);expect(parseMoney(' 207.35 ')).toBe(207.35);expect(parseMoney('1 000,5')).toBe(1000.5);expect(parseMoney('1 250,00')).toBe(1250);expect(parseMoney('0')).toBe(0);});
 it('отклоняет пустой, отрицательный и слишком точный ввод',()=>{expect(parseMoney('')).toBeNull();expect(parseMoney('-5')).toBeNull();expect(parseMoney('12,345')).toBeNull();expect(parseMoney('abc')).toBeNull();expect(parseMoney('1e3')).toBeNull();});
 it('считает прибыль дня и доходность от баланса на начало',()=>{const d=dayDelta(200,214.24);expect(d.profit).toBe(14.24);expect(d.rate).toBeCloseTo(.0712,6);});
 it('считает убыток дня',()=>{const d=dayDelta(214.24,207.35);expect(d.profit).toBe(-6.89);expect(d.rate).toBeCloseTo(-6.89/214.24,9);});
 it('ровный день даёт ноль без отрицательного нуля',()=>{expect(Object.is(dayDelta(150,150).profit,0)).toBe(true);expect(dayDelta(0,10).rate).toBeNull();});
});
describe('Даты торговых дней: факт и прогноз',()=>{
 // 23.11.2026 — понедельник; план на 5 торговых дней по будням.
 const weekdaysPlan=(patch:Partial<Goal>={}):Goal=>goal({days:5,startDate:'2026-11-23',weekdays:[1,2,3,4,5],...patch});
 const dates=(g:Goal,now:string)=>buildGoalPlan(g,now).rows.map(r=>r.date);
 it('пропущенный день сдвигает прогноз дат, а не ломает план',()=>{
  const g=weekdaysPlan({results:{1:fact(10,'2026-11-23')}});
  // Вторник пропущен: в среду второй день плана ожидается сегодня, срок — те же 5 торговых дней.
  expect(dates(g,'2026-11-25')).toEqual(['2026-11-23','2026-11-25','2026-11-26','2026-11-27','2026-11-30']);
 });
 it('после закрытия дня сегодня следующий ожидается не раньше завтра',()=>{
  expect(dates(weekdaysPlan({results:{1:fact(10,'2026-11-23')}}),'2026-11-23')[1]).toBe('2026-11-24');
 });
 it('до старта плана прогноз идёт от даты начала',()=>{
  expect(dates(weekdaysPlan(),'2026-11-20')[0]).toBe('2026-11-23');
 });
 it('закрытый день хранит дату факта, даже вне плановых дней недели',()=>{
  const g=weekdaysPlan({results:{1:fact(10,'2026-11-28')}});
  expect(dates(g,'2026-11-28').slice(0,2)).toEqual(['2026-11-28','2026-11-30']);
 });
 it('новый день закрывается после предыдущего и не будущей датой',()=>{
  const g=weekdaysPlan({results:{1:fact(10,'2026-11-23')}});
  expect(factDateWindow(g,2,'2026-11-23')).toEqual({min:'2026-11-24',max:'2026-11-23'});
  expect(factDateWindow(g,2,'2026-11-26')).toEqual({min:'2026-11-24',max:'2026-11-26'});
  expect(validateFactDate(g,2,'2026-11-23','2026-11-26')).toMatch(/одна дата/);
  expect(validateFactDate(g,2,'2026-11-27','2026-11-26')).toMatch(/будущей/);
  expect(validateFactDate(g,2,'2026-11-25','2026-11-26')).toBeNull();
  expect(validateFactDate(g,2,'25.11.2026','2026-11-26')).toMatch(/Некорректная/);
 });
 it('дату прошлого дня можно менять только между соседними днями и не раньше старта',()=>{
  const g=weekdaysPlan({results:{1:fact(10,'2026-11-23'),2:fact(5,'2026-11-26')}});
  expect(factDateWindow(g,1,'2026-11-30')).toEqual({min:'2026-11-23',max:'2026-11-25'});
  expect(validateFactDate(g,1,'2026-11-26','2026-11-30')).toMatch(/раньше дня 2/);
  expect(validateFactDate(g,1,'2026-11-20','2026-11-30')).toMatch(/начинается/);
 });
 it('дату можно сменить, только если есть другая подходящая дата',()=>{
  expect(canChangeDate({min:'2026-11-24',max:'2026-11-26'},'2026-11-25')).toBe(true);
  expect(canChangeDate({min:'2026-11-24',max:'2026-11-24'},'2026-11-24')).toBe(false);
  // Единственная подходящая дата отличается от текущей (например, дата из старого расписания в будущем).
  expect(canChangeDate({min:'2026-11-24',max:'2026-11-24'},'2026-11-26')).toBe(true);
  expect(canChangeDate({min:'2026-11-25',max:'2026-11-24'},'2026-11-26')).toBe(false);
 });
});
