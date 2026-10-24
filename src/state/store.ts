import {create} from 'zustand';
import {persist,createJSONStorage} from 'zustand/middleware';
import type {DataState,Goal,JournalEntry,Settings,StakeConfig} from '../domain/types';
import {normalizeStakeConfig} from '../domain/stakes';
import {buildGoalPlan,completedGoalDates,round,validDate,validateGoal} from '../domain/finance';
import {initialData,uuid} from './initial';

const scoped=typeof window==='undefined'?'/':window.location.pathname.replace(/\/+$/,'').replace(/\/index\.html$/,'')||'/';
// Keep the same key as v2.0: migration happens in place, preserving users' goal results.
export const STORE_KEY=`yieldpilot-v2:${scoped}`;
export const LEGACY_KEY=`yieldpilot-plan-v1:${scoped==='/'?'/':scoped.replace(/^\//,'')}`;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown,min=-1e12,max=1e12):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;

// Whitelist only trading data. Old accounts, transactions, budgets and orphan notes are dropped.
export function sanitizeData(raw:unknown):DataState|null{
 if(!object(raw)||!Array.isArray(raw.goals)||!Array.isArray(raw.journal)||raw.goals.length>500||raw.journal.length>10000)return null;
 const goals:Goal[]=[];
 for(const v of raw.goals){
  if(!object(v)||typeof v.id!=='string'||typeof v.name!=='string'||!finite(v.startAmount,0)||!finite(v.targetAmount,0)||!Number.isInteger(v.days)||!finite(v.days,1,730)||typeof v.startDate!=='string'||!Array.isArray(v.weekdays)||!object(v.results))return null;
  // Non-trading savings plans are outside the new product; retained only in old backup.
  if(v.kind==='savings')continue;
  const g:Goal={id:v.id.slice(0,100),name:v.name.slice(0,120),startAmount:v.startAmount,targetAmount:v.targetAmount,days:v.days,startDate:v.startDate,mode:v.mode==='fixed'?'fixed':'adaptive',weekdays:v.weekdays.filter(n=>Number.isInteger(n)&&n>=0&&n<=6),results:{},createdAt:typeof v.createdAt==='string'?v.createdAt:new Date().toISOString(),stakeConfig:normalizeStakeConfig(v.stakeConfig)};
  if(validateGoal(g))continue;
  let bal=g.startAmount,continuous=true;
  for(let d=1;d<=g.days;d++){const r=v.results[String(d)];if(!continuous||r===undefined){continuous=false;continue;}if(!object(r)||!finite(r.value)||typeof r.recordedAt!=='string'){continuous=false;continue;}const next=round(bal+r.value);if(next<0){continuous=false;continue;}bal=next;g.results[d]={value:round(r.value),note:typeof r.note==='string'?r.note.slice(0,3000):undefined,recordedAt:r.recordedAt};}
  goals.push(g);
 }
 const dateSets=new Map(goals.map(g=>[g.id,new Set(completedGoalDates(g))]));
 const journal:JournalEntry[]=[];
 for(const j of raw.journal){if(!object(j)||typeof j.id!=='string'||typeof j.goalId!=='string'||typeof j.date!=='string'||!validDate(j.date)||!dateSets.get(j.goalId)?.has(j.date)||typeof j.title!=='string'||typeof j.note!=='string')continue;
  journal.push({id:j.id.slice(0,100),goalId:j.goalId,date:j.date,title:j.title.slice(0,200),note:j.note.slice(0,20000),mood:['great','good','neutral','low'].includes(String(j.mood))?j.mood as JournalEntry['mood']:'neutral',discipline:([1,2,3,4,5].includes(Number(j.discipline))?j.discipline:3) as JournalEntry['discipline'],createdAt:typeof j.createdAt==='string'?j.createdAt:new Date().toISOString()});
 }
 const settings:Settings=object(raw.settings)?{compact:raw.settings.compact!==false,firstDayMonday:raw.settings.firstDayMonday!==false}:initialData().settings;
 const activeGoalId=typeof raw.activeGoalId==='string'&&goals.some(g=>g.id===raw.activeGoalId)?raw.activeGoalId:goals[0]?.id??null;
 return {goals,activeGoalId,journal,settings};
}
export function legacyData():DataState|null{try{const raw=localStorage.getItem(LEGACY_KEY);if(!raw)return null;const data=JSON.parse(raw) as unknown;if(!object(data)||data.version!==1||!object(data.config)||!object(data.results))return null;const c=data.config;const g:Goal={id:uuid(),name:'Цель из YieldPilot 1.x',startAmount:Number(c.startAmount),targetAmount:Number(c.targetAmount),days:Number(c.days),startDate:String(c.startDate),mode:c.mode==='fixed'?'fixed':'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:new Date().toISOString()};if(validateGoal(g))return null;let bal=g.startAmount;for(let d=1;d<=g.days;d++){const r=data.results[String(d)];if(!object(r)||!finite(r.profit)||typeof r.recordedAt!=='string')break;bal=round(bal+r.profit);if(bal<0)break;g.results[d]={value:round(r.profit),recordedAt:r.recordedAt};}return {...initialData(),goals:[g],activeGoalId:g.id};}catch{return null;}}
function boot():DataState{if(typeof localStorage==='undefined')return initialData();try{if(localStorage.getItem(STORE_KEY))return initialData();return legacyData()??initialData();}catch{return initialData();}}
interface Actions{
 setActiveGoal:(id:string|null)=>void;upsertGoal:(g:Goal)=>void;deleteGoal:(id:string)=>void;updateStakeConfig:(goalId:string,patch:Partial<StakeConfig>)=>void;
 recordDay:(goalId:string,day:number,value:number,note?:string)=>string|null;undoDay:(goalId:string,day:number)=>string|null;
 upsertJournal:(j:JournalEntry)=>string|null;deleteJournal:(id:string)=>void;
 updateSettings:(patch:Partial<Settings>)=>void;replaceData:(next:DataState)=>void;resetEverything:()=>void;
}
export type PlannerStore=DataState&Actions;
const data=boot();
export const usePlanner=create<PlannerStore>()(persist((set,get)=>({...data,
 setActiveGoal:id=>set(s=>({activeGoalId:s.goals.some(g=>g.id===id)?id:s.activeGoalId})),
 updateStakeConfig:(goalId,patch)=>set(s=>({goals:s.goals.map(g=>g.id!==goalId?g:{...g,stakeConfig:normalizeStakeConfig({...normalizeStakeConfig(g.stakeConfig),...patch})})})),
 upsertGoal:g=>set(s=>{const goals=s.goals.some(x=>x.id===g.id)?s.goals.map(x=>x.id===g.id?g:x):[...s.goals,g];const validDates=new Set(completedGoalDates(g));return {goals,activeGoalId:s.activeGoalId??g.id,journal:s.journal.filter(j=>j.goalId!==g.id||validDates.has(j.date))};}),
 deleteGoal:id=>set(s=>({goals:s.goals.filter(g=>g.id!==id),journal:s.journal.filter(j=>j.goalId!==id),activeGoalId:s.activeGoalId===id?s.goals.find(g=>g.id!==id)?.id??null:s.activeGoalId})),
 recordDay:(goalId,day,value,note)=>{const g=get().goals.find(x=>x.id===goalId);if(!g)return 'Цель не найдена.';if(!Number.isFinite(value)||Math.abs(value)>1e12)return 'Некорректная сумма.';const plan=buildGoalPlan(g);if(day>plan.completedDays+1||day<1||day>g.days)return 'Дни необходимо заполнять по порядку.';const next={...g.results,[day]:{value:round(value),note:note?.slice(0,3000),recordedAt:new Date().toISOString()}};let bal=g.startAmount;for(let d=1;d<=g.days&&next[d];d++){bal=round(bal+next[d].value);if(bal<0)return 'Баланс не может стать отрицательным.';}get().upsertGoal({...g,results:next});return null;},
 undoDay:(goalId,day)=>{const g=get().goals.find(x=>x.id===goalId);if(!g)return 'Цель не найдена.';if(day!==buildGoalPlan(g).completedDays)return 'Можно отменить только последний завершённый день.';const results={...g.results};delete results[day];get().upsertGoal({...g,results});return null;},
 upsertJournal:j=>{const g=get().goals.find(x=>x.id===j.goalId);if(!g||!completedGoalDates(g).includes(j.date))return 'Запись можно создать только для завершённого торгового дня выбранной цели.';if(!j.title.trim()||!j.note.trim())return 'Заполни заголовок и описание.';set(s=>({journal:s.journal.some(x=>x.id===j.id)?s.journal.map(x=>x.id===j.id?j:x):[...s.journal,j]}));return null;},
 deleteJournal:id=>set(s=>({journal:s.journal.filter(j=>j.id!==id)})),
 updateSettings:patch=>set(s=>({settings:{...s.settings,...patch}})),
 replaceData:next=>set(sanitizeData(next)??initialData()),resetEverything:()=>set(initialData()),
}),{name:STORE_KEY,version:4,storage:createJSONStorage(()=>localStorage),partialize:s=>({goals:s.goals,activeGoalId:s.activeGoalId,journal:s.journal,settings:s.settings}),migrate:persisted=>sanitizeData(persisted)??initialData(),merge:(persisted,current)=>({...current,...(sanitizeData(persisted)??initialData())})}));
export const getSnapshot=():DataState=>{const s=usePlanner.getState();return {goals:s.goals,activeGoalId:s.activeGoalId,journal:s.journal,settings:s.settings};};
export const makeBackup=():string=>JSON.stringify({format:'yieldpilot-trading-backup',version:4,exportedAt:new Date().toISOString(),data:getSnapshot()},null,2);
export function readBackup(value:unknown):DataState|null{if(!object(value))return null;if((value.format==='yieldpilot-trading-backup'&&(value.version===3||value.version===4))||(value.format==='yieldpilot-backup'&&value.version===2))return sanitizeData(value.data);if('goals'in value)return sanitizeData(value);if(value.version===1&&object(value.config)&&object(value.results)){const c=value.config;const g:Goal={id:uuid(),name:'Импортированная торговая цель',startAmount:Number(c.startAmount),targetAmount:Number(c.targetAmount),days:Number(c.days),startDate:String(c.startDate),mode:c.mode==='fixed'?'fixed':'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:new Date().toISOString()};if(validateGoal(g))return null;let bal=g.startAmount;for(let d=1;d<=g.days;d++){const r=value.results[String(d)];if(!object(r)||!finite(r.profit)||typeof r.recordedAt!=='string')break;bal=round(bal+r.profit);if(bal<0)break;g.results[d]={value:round(r.profit),recordedAt:r.recordedAt};}return {...initialData(),goals:[g],activeGoalId:g.id};}return null;}
export const saveFile=(name:string,contents:string,mime='application/json'):void=>{const blob=new Blob([contents],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export const makeId=uuid;
