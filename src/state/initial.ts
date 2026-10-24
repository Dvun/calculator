import type {DataState,Goal} from '../domain/types';
import {today} from '../domain/finance';
export const uuid=():string=>typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const newGoal=():Goal=>({id:uuid(),name:'Моя торговая цель',startAmount:100,targetAmount:1000,days:30,startDate:today(),mode:'adaptive',weekdays:[0,1,2,3,4,5,6],results:{},createdAt:new Date().toISOString()});
export const initialData=():DataState=>({goals:[],activeGoalId:null,journal:[],settings:{compact:true,firstDayMonday:true}});
