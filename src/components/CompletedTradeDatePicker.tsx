import {useEffect,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {monthOf,shiftMonth,today} from '../domain/finance';

const WEEKDAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export function CompletedTradeDatePicker({goalId,dates,date,onChange}:{goalId:string;dates:string[];date:string;onChange:(date:string)=>void}){
 const available=new Set(dates);
 const [month,setMonth]=useState(monthOf(date||today()));
 useEffect(()=>setMonth(monthOf(date||today())),[goalId,date]);
 const [year,m]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,m-1,1));
 const offset=(first.getUTCDay()+6)%7;
 const length=new Date(Date.UTC(year,m,0)).getUTCDate();
 // Always render six calendar weeks so month navigation cannot change modal height.
 const trailingCells=42-offset-length;
 const monthTitle=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
 return <div className="journal-date-picker">
  <div className="journal-month-header">
   <strong>{monthTitle}</strong>
   <div className="journal-month-actions">
    <button type="button" aria-label="Предыдущий месяц" onClick={()=>setMonth(v=>shiftMonth(v,-1))}><ChevronLeft size={17}/></button>
    <button type="button" aria-label="Следующий месяц" onClick={()=>setMonth(v=>shiftMonth(v,1))}><ChevronRight size={17}/></button>
   </div>
  </div>
  <div className="journal-month-grid" role="group" aria-label="Выбор завершённого торгового дня">
   {WEEKDAYS.map(day=><span className="journal-weekday" key={day}>{day}</span>)}
   {Array.from({length:offset},(_,i)=><span key={`gap-${i}`} aria-hidden="true"/>)}
   {Array.from({length},(_,i)=>{
    const day=`${month}-${String(i+1).padStart(2,'0')}`;
    const traded=available.has(day);
    return <button key={day} type="button" disabled={!traded} className={`${traded?'is-traded':''} ${day===date?'is-selected':''}`} onClick={()=>onChange(day)} title={traded?'Есть торговый результат':'Нет завершённого торгового дня'} aria-pressed={day===date}>{i+1}</button>;
   })}
   {Array.from({length:trailingCells},(_,i)=><span key={`tail-${i}`} aria-hidden="true"/>)}
  </div>
  <small className="journal-calendar-caption"><CalendarDays size={13}/> Активны только даты с фактическим результатом этой цели.</small>
 </div>;
}
