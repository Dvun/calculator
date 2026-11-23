import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import type {Goal,JournalEntry} from '../domain/types';
import {sanitizeData,usePlanner} from './store';
import {buildGoalPlan,factDateWindow} from '../domain/finance';
const goal:Goal={id:'g1',name:'Тестовая торговля',startAmount:100,targetAmount:200,days:3,startDate:'2026-10-24',mode:'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:'2026-10-24T00:00:00.000Z'};
const journal:JournalEntry={id:'j1',goalId:'g1',date:'2026-10-24',title:'Сделка',note:'Описание результата',mood:'good',discipline:5,createdAt:'2026-10-24T12:00:00.000Z'};
/** Moves the clock to the evening of a calendar date: "today" for every action that follows. */
const at=(date:string)=>vi.setSystemTime(new Date(`${date}T18:00:00`));
/** Enters a day's closing balance on that date, as a trader does at the end of it. */
const closeOn=(date:string,day:number,balance:number)=>{at(date);return usePlanner.getState().recordDayBalance(goal.id,day,balance);};
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});at('2026-10-24');usePlanner.getState().resetEverything();});
afterEach(()=>{vi.useRealTimers();});
describe('Факт дня вносится балансом на конец дня',()=>{
 const balanceOf=()=>buildGoalPlan(usePlanner.getState().goals[0]).currentBalance;
 it('прибыль считается от баланса на начало дня',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.recordDayBalance(goal.id,1,114.24)).toBeNull();expect(usePlanner.getState().goals[0].results[1].value).toBe(14.24);expect(balanceOf()).toBe(114.24);});
 it('баланс ниже начального фиксируется как убыток',()=>{const s=usePlanner.getState();s.upsertGoal(goal);closeOn('2026-10-24',1,114.24);expect(closeOn('2026-10-25',2,107.35)).toBeNull();expect(usePlanner.getState().goals[0].results[2].value).toBe(-6.89);expect(balanceOf()).toBe(107.35);});
 it('исправление прошлого дня сохраняет введённые балансы и даты следующих дней',()=>{const s=usePlanner.getState();s.upsertGoal(goal);closeOn('2026-10-24',1,114.24);closeOn('2026-10-25',2,107.35);closeOn('2026-10-26',3,120);expect(s.recordDayBalance(goal.id,1,120)).toBeNull();const r=usePlanner.getState().goals[0].results;expect(r[1].value).toBe(20);expect(r[2].value).toBe(-12.65);expect(r[3].value).toBe(12.65);expect([r[1].date,r[2].date,r[3].date]).toEqual(['2026-10-24','2026-10-25','2026-10-26']);expect(balanceOf()).toBe(120);});
 it('нельзя пропускать дни и вводить отрицательный баланс',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.recordDayBalance(goal.id,2,110)).toMatch(/по порядку/);expect(s.recordDayBalance(goal.id,1,-1)).not.toBeNull();expect(usePlanner.getState().goals[0].results).toEqual({});});
 it('нулевой баланс допустим и не ломает план',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.recordDayBalance(goal.id,1,0)).toBeNull();expect(usePlanner.getState().goals[0].results[1].value).toBe(-100);});
 it('комментарий к дню сохраняется при исправлении баланса',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDayBalance(goal.id,1,110);s.updateDayNote(goal.id,1,'Пробой уровня');s.recordDayBalance(goal.id,1,108);const r=usePlanner.getState().goals[0].results[1];expect(r.value).toBe(8);expect(r.note).toBe('Пробой уровня');});
});
describe('Изоляция торговых целей',()=>{
 it('запрет записи дневника без завершённого дня',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.upsertJournal(journal)).toMatch(/завершённого/);expect(usePlanner.getState().journal).toHaveLength(0);});
 it('разрешает запись после фиксации результата',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.recordDay(goal.id,1,10)).toBeNull();expect(s.upsertJournal(journal)).toBeNull();expect(usePlanner.getState().journal).toHaveLength(1);});
 it('удаление цели очищает её дневник',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,10);s.upsertJournal(journal);s.deleteGoal(goal.id);expect(usePlanner.getState().journal).toHaveLength(0);expect(usePlanner.getState().goals).toHaveLength(0);});
 it('отмена завершённого дня очищает его заметки',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,10);s.upsertJournal(journal);s.undoDay(goal.id,1);expect(usePlanner.getState().journal).toHaveLength(0);});
 it('даты чужих целей нельзя использовать',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.upsertGoal({...goal,id:'g2',startDate:'2026-11-02'});s.recordDay(goal.id,1,10);expect(s.upsertJournal({...journal,goalId:'g2'})).not.toBeNull();});
 it('сохраняет старые цели и добавляет безопасные настройки ставок',()=>{const legacy={goals:[goal],activeGoalId:'g1',journal:[],settings:{compact:true,firstDayMonday:true}};const migrated=sanitizeData(legacy);expect(migrated?.goals[0]?.stakeConfig?.payout).toBe(92);expect(migrated?.goals[0]?.stakeConfig?.attempts).toBe(2);});
 it('при обновлении параметров ставок результаты дневника не меняются',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,10);s.upsertJournal(journal);s.updateStakeConfig(goal.id,{payout:88,attempts:3});const state=usePlanner.getState();expect(state.goals[0].results[1].value).toBe(10);expect(state.journal).toHaveLength(1);expect(state.goals[0].stakeConfig?.payout).toBe(88);});
 it('комментарий к факту сохраняется независимо от суммы и времени результата',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,-8);const before=usePlanner.getState().goals[0].results[1].recordedAt;expect(s.updateDayNote(goal.id,1,'Точка входа была ранней')).toBeNull();const after=usePlanner.getState().goals[0].results[1];expect(after.note).toBe('Точка входа была ранней');expect(after.value).toBe(-8);expect(after.recordedAt).toBe(before);});
 it('быстрые теги сохраняются и переживают восстановление из Firebase/JSON',()=>{
  const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,10);
  const tagged={...journal,tags:['discipline','fomo','good-entry']};
  expect(s.upsertJournal(tagged)).toBeNull();
  const restored=sanitizeData({goals:usePlanner.getState().goals,journal:usePlanner.getState().journal,activeGoalId:goal.id,settings:usePlanner.getState().settings});
  expect(restored?.journal[0].tags).toEqual(['discipline','fomo','good-entry']);
 });
 it('старые записи без тегов открываются, неизвестные теги игнорируются',()=>{
  const completed={...goal,results:{1:{value:10,recordedAt:'2026-10-24T12:00:00.000Z'}}};
  const base={goals:[completed],activeGoalId:'g1',settings:{compact:true,firstDayMonday:true}};
  expect(sanitizeData({...base,journal:[journal]})?.journal[0].tags).toEqual([]);
  expect(sanitizeData({...base,journal:[{...journal,tags:['fomo','unknown','fomo']} ]})?.journal[0].tags).toEqual(['fomo']);
 });
 it('комментарий нельзя записать к незавершённому дню',()=>{const s=usePlanner.getState();s.upsertGoal(goal);expect(s.updateDayNote(goal.id,1,'Нет сделки')).toMatch(/завершённому/);});
 it('после изменения факта комментарий не теряется',()=>{const s=usePlanner.getState();s.upsertGoal(goal);s.recordDay(goal.id,1,10);s.updateDayNote(goal.id,1,'Отскок от уровня');s.recordDay(goal.id,1,-5,usePlanner.getState().goals[0].results[1].note);const result=usePlanner.getState().goals[0].results[1];expect(result.value).toBe(-5);expect(result.note).toBe('Отскок от уровня');});
 it('миграция v2 отбрасывает счета и отвязанные записи',()=>{const old={goals:[{...goal,kind:'growth',archived:false,results:{1:{value:10,recordedAt:'2026-10-24T12:00:00Z'}}}],activeGoalId:'g1',accounts:[{id:'bank'}],categories:[],transactions:[],budgets:{},journal:[journal,{...journal,id:'orphan',goalId:'missing'}],settings:{compact:true,firstDayMonday:true}};const migrated=sanitizeData(old);expect(migrated?.goals).toHaveLength(1);expect(migrated?.journal).toHaveLength(1);expect(migrated).not.toHaveProperty('accounts');expect(migrated).not.toHaveProperty('transactions');});
});
describe('Дата торгового дня ставится по факту ввода баланса',()=>{
 const results=()=>usePlanner.getState().goals[0].results;
 it('день получает дату ввода баланса, а пропуск дней не сбивает план',()=>{
  usePlanner.getState().upsertGoal(goal);
  expect(closeOn('2026-10-24',1,110)).toBeNull();
  expect(closeOn('2026-10-27',2,120)).toBeNull();
  expect([results()[1].date,results()[2].date]).toEqual(['2026-10-24','2026-10-27']);
  expect(buildGoalPlan(usePlanner.getState().goals[0],'2026-10-27').rows.map(r=>r.date)).toEqual(['2026-10-24','2026-10-27','2026-10-28']);
 });
 it('в одну дату закрывается только один торговый день',()=>{
  usePlanner.getState().upsertGoal(goal);
  closeOn('2026-10-24',1,110);
  expect(usePlanner.getState().recordDayBalance(goal.id,2,120)).toMatch(/одна дата/);
  expect(results()[2]).toBeUndefined();
 });
 it('вчерашний баланс можно внести сегодня с его датой, но не будущей датой',()=>{
  const s=usePlanner.getState();s.upsertGoal(goal);at('2026-10-26');
  expect(s.recordDayBalance(goal.id,1,110,'2026-10-27')).toMatch(/будущей/);
  expect(s.recordDayBalance(goal.id,1,110,'2026-10-25')).toBeNull();
  expect(results()[1].date).toBe('2026-10-25');
 });
 it('исправление баланса не меняет дату дня',()=>{
  usePlanner.getState().upsertGoal(goal);
  closeOn('2026-10-24',1,110);
  at('2026-10-28');
  expect(usePlanner.getState().recordDayBalance(goal.id,1,115)).toBeNull();
  expect(results()[1]).toMatchObject({value:15,date:'2026-10-24'});
 });
 it('перенос даты дня переносит его записи дневника',()=>{
  const s=usePlanner.getState();s.upsertGoal(goal);
  closeOn('2026-10-24',1,110);
  expect(s.upsertJournal(journal)).toBeNull();
  at('2026-10-26');
  expect(s.recordDayBalance(goal.id,1,110,'2026-10-25')).toBeNull();
  expect(usePlanner.getState().journal.map(j=>j.date)).toEqual(['2026-10-25']);
 });
 it('дата прошлого дня не перескакивает соседний день',()=>{
  usePlanner.getState().upsertGoal(goal);
  closeOn('2026-10-24',1,110);closeOn('2026-10-26',2,120);
  expect(usePlanner.getState().recordDayBalance(goal.id,1,110,'2026-10-26')).toMatch(/раньше дня 2/);
  expect(results()[1].date).toBe('2026-10-24');
 });
 it('смена дней недели влияет только на прогноз: результаты и дневник остаются',()=>{
  const s=usePlanner.getState();s.upsertGoal(goal);
  closeOn('2026-10-24',1,110);
  s.upsertJournal(journal);
  // 24.10 — суббота: убираем выходные из плана, закрытая суббота остаётся субботой.
  s.upsertGoal({...usePlanner.getState().goals[0],weekdays:[1,2,3,4,5]});
  expect(results()[1]).toMatchObject({value:10,date:'2026-10-24'});
  expect(usePlanner.getState().journal).toHaveLength(1);
  expect(buildGoalPlan(usePlanner.getState().goals[0],'2026-10-24').rows[1].date).toBe('2026-10-26');
 });
});
describe('Даты результатов, сохранённых до появления дат факта',()=>{
 const stored=(results:Record<string,unknown>,patch:Partial<Goal>={})=>({goals:[{...goal,...patch,results}],activeGoalId:'g1',journal:[],settings:{compact:true,firstDayMonday:true}});
 it('получают даты прежнего расписания, и записи дневника к ним сохраняются',()=>{
  // 24.10.2026 — суббота, поэтому первый плановый будний день — понедельник 26.10.
  const legacy={...stored({1:{value:10,recordedAt:'2026-10-26T18:00:00.000Z'}},{weekdays:[1,2,3,4,5]}),journal:[{...journal,date:'2026-10-26'}]};
  const migrated=sanitizeData(legacy);
  expect(migrated?.goals[0].results[1].date).toBe('2026-10-26');
  expect(migrated?.journal).toHaveLength(1);
 });
 it('сохранённая дата факта не перезаписывается, а испорченная не ломает порядок дней',()=>{
  const migrated=sanitizeData(stored({1:{value:10,recordedAt:'',date:'2026-10-25'},2:{value:5,recordedAt:'',date:'не дата'}}));
  expect(migrated?.goals[0].results[1].date).toBe('2026-10-25');
  expect(migrated?.goals[0].results[2].date).toBe('2026-10-26');
 });
 it('валидные даты из базы не переписываются даже при нарушенном порядке: записи дневника к ним не теряются',()=>{
  const migrated=sanitizeData({...stored({1:{value:10,recordedAt:'',date:'2026-10-26'},2:{value:5,recordedAt:'',date:'2026-10-25'}}),journal:[{...journal,date:'2026-10-25'}]});
  expect([migrated?.goals[0].results[1].date,migrated?.goals[0].results[2].date]).toEqual(['2026-10-26','2026-10-25']);
  expect(migrated?.journal).toHaveLength(1);
 });
 it('день, внесённый раньше старого расписания, получает плановую дату, но его можно передатировать',()=>{
  // Расписание по будням: день 1 — пт 23.10, день 2 — пн 26.10, хотя баланс дня 2 внесли в субботу 24.10.
  at('2026-10-24');
  usePlanner.getState().replaceData(sanitizeData(stored({1:{value:10,recordedAt:'2026-10-23T18:00:00.000Z'},2:{value:5,recordedAt:'2026-10-24T18:00:00.000Z'}},{startDate:'2026-10-23',weekdays:[1,2,3,4,5]}))!);
  const current=()=>usePlanner.getState().goals[0];
  expect(current().results[2].date).toBe('2026-10-26');
  expect(factDateWindow(current(),3,'2026-10-24')).toEqual({min:'2026-10-27',max:'2026-10-24'});
  expect(usePlanner.getState().recordDayBalance(goal.id,2,115,'2026-10-24')).toBeNull();
  expect(current().results[2]).toMatchObject({value:5,date:'2026-10-24'});
  expect(factDateWindow(current(),3,'2026-10-25')).toEqual({min:'2026-10-25',max:'2026-10-25'});
 });
});
