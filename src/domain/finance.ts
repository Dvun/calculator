import type {Goal,GoalPlan,GoalRow} from './types';
export const round=(n:number):number=>Math.sign(n)*Math.round((Math.abs(n)+1e-9)*100)/100;
export const today=():string=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const monthOf=(date:string):string=>date.slice(0,7);
export const shiftMonth=(month:string,amount:number):string=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+amount,1)).toISOString().slice(0,7);};
export const toDate=(date:string):Date=>new Date(`${date}T12:00:00Z`);
export const isoDate=(date:Date):string=>date.toISOString().slice(0,10);
export const plusDays=(date:string,offset:number):string=>{const d=toDate(date);d.setUTCDate(d.getUTCDate()+offset);return isoDate(d);};
export const validDate=(s:string):boolean=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(toDate(s).getTime())&&isoDate(toDate(s))===s;
export const num=(x:number,digits=2):string=>Number.isFinite(x)?new Intl.NumberFormat('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(x):'—';
export const signed=(x:number):string=>`${x>0?'+':''}${num(x)}`;
export const pct=(x:number|null,digits=2):string=>x===null||!Number.isFinite(x)?'—':`${num(x*100,digits)}%`;
export const signedPct=(x:number|null,digits=2):string=>x===null||!Number.isFinite(x)?'—':`${x>0?'+':''}${pct(x,digits)}`;
export const MAX_AMOUNT=1e12;
const MONEY_PATTERN=/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
/** Parses a non-negative amount typed by the user: comma or dot decimals, any spaces (incl. NBSP from ru-RU formatting) as thousands separators, at most 2 decimals. */
export const parseMoney=(input:string):number|null=>{
 const cleaned=input.trim().replace(/\s/g,'').replace(',','.');
 if(!MONEY_PATTERN.test(cleaned))return null;
 const amount=Number(cleaned);
 return Number.isFinite(amount)&&amount<=MAX_AMOUNT?amount:null;
};
export interface DayDelta{profit:number;rate:number|null}
/** Day result derived from the balances at the start and at the end of the day. */
export const dayDelta=(opening:number,close:number):DayDelta=>{
 const profit=round(close-opening)||0;
 return {profit,rate:opening>0?profit/opening:null};
};
export const shortDate=(s:string):string=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(toDate(s));
const ALL_WEEKDAYS=[0,1,2,3,4,5,6];
/** The first `count` dates from `from` (inclusive) that fall on the given weekdays; every weekday counts when none are given. */
export const tradingDates=(from:string,weekdays:number[],count:number):string[]=>{const days:string[]=[];const wd=weekdays.length?weekdays:ALL_WEEKDAYS;for(let i=0;i<count*8+10&&days.length<count;i++){const date=plusDays(from,i);if(wd.includes(toDate(date).getUTCDay()))days.push(date);}return days;};
/** The original fixed schedule from the start date. Now only used to date results saved before days carried their own date. */
export const goalDates=(g:Pick<Goal,'startDate'|'days'|'weekdays'>):string[]=>tradingDates(g.startDate,g.weekdays,g.days);
export const dailyRate=(start:number,end:number,days:number):number|null=>{if(days<=0||start<=0||end<=0)return null;return start>=end?0:Math.expm1(Math.log(end/start)/days);};
export function validateGoal(g:Pick<Goal,'name'|'startAmount'|'targetAmount'|'days'|'startDate'|'weekdays'>):string|null{
 if(!g.name.trim())return 'Укажи название цели.';
 if(!Number.isFinite(g.startAmount)||g.startAmount<=0||g.startAmount>1e12)return 'Начальная сумма должна быть больше нуля.';
 if(!Number.isFinite(g.targetAmount)||g.targetAmount<=g.startAmount||g.targetAmount>1e12)return 'Целевая сумма должна превышать начальную.';
 if(!Number.isInteger(g.days)||g.days<1||g.days>730)return 'Количество торговых дней должно быть от 1 до 730.';
 if(!validDate(g.startDate))return 'Некорректная дата начала.';
 if(!g.weekdays.length||g.weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))return 'Выбери хотя бы один день недели.';
 return null;
}
// ISO dates (YYYY-MM-DD) order correctly as plain strings.
const laterOf=(a:string,b:string):string=>a>b?a:b;
const earlierOf=(a:string,b:string):string=>a<b?a:b;
export interface DateWindow{min:string;max:string}
/** Dates a day may be closed with: after the previous trading day and not before the plan start, before the next trading day and never in the future. Empty (min > max) when, for example, the previous day was closed today. */
export function factDateWindow(g:Goal,day:number,now:string=today()):DateWindow{
 const prev=g.results[day-1]?.date,next=g.results[day+1]?.date;
 return {min:prev?laterOf(g.startDate,plusDays(prev,1)):g.startDate,max:next?earlierOf(now,plusDays(next,-1)):now};
}
/** Whether a day's date can be changed: some allowed date differs from the one it has (which may lie outside the window, e.g. a future date from the old fixed schedule). */
export const canChangeDate=(range:DateWindow,current:string):boolean=>range.min<range.max||(range.min===range.max&&range.min!==current);
/** Why a day cannot carry this date, or null when it fits: one trading day per date, in order, never in the future. */
export function validateFactDate(g:Goal,day:number,date:string,now:string=today()):string|null{
 if(!validDate(date))return 'Некорректная дата торгового дня.';
 if(date>now)return 'Нельзя закрыть день будущей датой.';
 if(date<g.startDate)return `План начинается ${shortDate(g.startDate)} — более ранняя дата не подходит.`;
 const prev=g.results[day-1]?.date,next=g.results[day+1]?.date;
 if(prev&&date<=prev)return `Один торговый день — одна дата: день ${day} должен быть позже дня ${day-1} (${shortDate(prev)}).`;
 if(next&&date>=next)return `День ${day} должен быть раньше дня ${day+1} (${shortDate(next)}).`;
 return null;
}
/** Expected dates of the days not closed yet: the plan's weekdays from the first date that can still be closed, so a skipped day moves them forward instead of breaking the plan. */
export function forecastDates(g:Goal,completedDays:number,now:string=today()):string[]{
 const last=g.results[completedDays]?.date;
 const from=laterOf(laterOf(g.startDate,now),last?plusDays(last,1):g.startDate);
 return tradingDates(from,g.weekdays,g.days-completedDays);
}
export function completedGoalDates(g:Goal):string[]{const result:string[]=[];for(let d=1;d<=g.days&&g.results[d];d++)result.push(g.results[d].date);return result;}
/** `now` is today's date: it anchors the forecast dates of the days not closed yet. */
export function buildGoalPlan(g:Goal,now:string=today()):GoalPlan{
 const {startAmount:start,targetAmount:target,days,mode}=g;
 const baseRate=dailyRate(start,target,days);
 const baseline:number[]=[start];
 for(let i=1;i<=days;i++)baseline.push(i===days?target:round(start*Math.exp(Math.log(target/start)*i/days)));
 let completedDays=0;
 while(completedDays<days&&g.results[completedDays+1]&&Number.isFinite(g.results[completedDays+1].value))completedDays++;
 let currentBalance=start,peak=start,drawdown=0,best:number|null=null,worst:number|null=null,winDays=0,lossDays=0;
 for(let i=1;i<=completedDays;i++){const p=g.results[i].value;currentBalance=round(currentBalance+p);peak=Math.max(peak,currentBalance);if(peak>0)drawdown=Math.max(drawdown,(peak-currentBalance)/peak);best=best===null?p:Math.max(best,p);worst=worst===null?p:Math.min(worst,p);if(p>0)winDays++;if(p<0)lossDays++;}
 const remainingDays=days-completedDays,requiredRate=remainingDays>0?dailyRate(currentBalance,target,remainingDays):null;
 const forecast=forecastDates(g,completedDays,now);
 const rows:GoalRow[]=[];let balance=start;
 for(let d=1;d<=days;d++){
  const openingBalance=balance,remaining=days-d+1;
  let targetProfit:number|null,targetRate:number|null;
  if(mode==='fixed'){targetProfit=round(baseline[d]-baseline[d-1]);targetRate=openingBalance>0?targetProfit/openingBalance:null;}
  else if(openingBalance>=target){targetProfit=0;targetRate=0;}
  else {const r=dailyRate(openingBalance,target,remaining);targetRate=r;targetProfit=r===null?null:round((d===days?target:openingBalance*(1+r))-openingBalance);}
  const targetClose=targetProfit===null?null:round(openingBalance+targetProfit);
  const completed=d<=completedDays,actualProfit=completed?g.results[d].value:null,actualClose=actualProfit!==null?round(openingBalance+actualProfit):null;
  rows.push({day:d,date:completed?g.results[d].date:forecast[d-completedDays-1],openingBalance,targetProfit,targetRate,targetClose,baselineClose:baseline[d],actualProfit,actualClose,completed,active:d===completedDays+1});balance=actualClose??targetClose??balance;
 }
 const last=rows[days-1];
 return {rows,baseRate,requiredRate,nextProfit:rows[completedDays]?.targetProfit??null,currentBalance,completedDays,remainingDays,actualProfit:round(currentBalance-start),remainingProfit:Math.max(0,round(target-currentBalance)),progress:Math.min(1,Math.max(0,(currentBalance-start)/(target-start))),planFinalBalance:last?.actualClose??last?.targetClose??null,goalReached:currentBalance>=target,viable:currentBalance>0,drawdown,best,worst,winDays,lossDays};
}
