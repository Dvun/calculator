import {beforeEach,describe,it,expect} from 'vitest';
import type {Goal,JournalEntry} from '../domain/types';
import {sanitizeData,usePlanner} from './store';
const goal:Goal={id:'g1',name:'Тестовая торговля',startAmount:100,targetAmount:200,days:3,startDate:'2026-10-24',mode:'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:'2026-10-24T00:00:00.000Z'};
const journal:JournalEntry={id:'j1',goalId:'g1',date:'2026-10-24',title:'Сделка',note:'Описание результата',mood:'good',discipline:5,createdAt:'2026-10-24T12:00:00.000Z'};
beforeEach(()=>usePlanner.getState().resetEverything());
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
