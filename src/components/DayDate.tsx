import {useRef,useState} from 'react';
import {CalendarDays,Clock3} from 'lucide-react';
import type {GoalRow} from '../domain/types';
import {canChangeDate,shortDate,validDate,type DateWindow} from '../domain/finance';

const FORECAST_HINT='Прогноз по плановым дням недели. Если пропустить день, даты сдвинутся вперёд, а сам план не изменится.';

interface DayDateLabelProps{
 row:GoalRow;
 today:string;
}

/** Date under the day number: when a closed day was traded, otherwise when the day is expected. */
export function DayDateLabel({row,today}:DayDateLabelProps){
 if(row.completed)return <small>{shortDate(row.date)}</small>;
 if(row.date===today)return <small className="day-date-today" title={FORECAST_HINT}>сегодня</small>;
 return <small className="day-date-forecast" title={FORECAST_HINT}>≈ {shortDate(row.date)}</small>;
}

interface DayDateFieldProps{
 day:number;
 /** Draft date of the day being edited (YYYY-MM-DD). */
 value:string;
 /** Dates the day may take; the field is locked when none differs from `value`. */
 range:DateWindow;
 today:string;
 onChange:(date:string)=>void;
}

/** Date of the day being edited: a compact chip opening the native date picker, limited to the dates the day may take. */
export function DayDateField({day,value,range,today,onChange}:DayDateFieldProps){
 const input=useRef<HTMLInputElement>(null);
 // Fallback for browsers that refuse showPicker(): the plain date input replaces the chip.
 const [plainInput,setPlainInput]=useState(false);
 const locked=!canChangeDate(range,value);
 const openPicker=()=>{
  try{input.current?.showPicker();}
  catch{setPlainInput(true);requestAnimationFrame(()=>input.current?.focus());}
 };
 return <span className={`day-date-field${plainInput?' is-plain':''}`}>
  {!plainInput&&<button type="button" className="day-date-chip" disabled={locked} onClick={openPicker}
   title={locked?'Другой даты у этого дня быть не может':'Изменить дату торгового дня'}
   aria-label={`Дата дня ${day}: ${shortDate(value)}${locked?'':', изменить'}`}>
   <CalendarDays size={11} aria-hidden/>{value===today?'сегодня':shortDate(value)}
  </button>}
  <input ref={input} type="date" name={`day-${day}-date`} className="day-date-native" aria-label={`Дата дня ${day}`}
   value={value} min={range.min} max={range.max} disabled={locked} tabIndex={plainInput?undefined:-1} aria-hidden={plainInput?undefined:true}
   onChange={e=>{if(validDate(e.target.value))onChange(e.target.value);}}/>
 </span>;
}

interface FactOpensOnProps{
 day:number;
 /** First date the day can be closed with. */
 opensOn:string;
 /** Date of the previous trading day; absent while the plan has not started. */
 previousDate:string|undefined;
 today:string;
}

/** Shown instead of the balance input while the next trading day cannot be closed yet.
 *  Short Russian month names may end with a period ("нояб.") or not ("мая"), so a date never ends a sentence here. */
export function FactOpensOn({day,opensOn,previousDate,today}:FactOpensOnProps){
 const reason=!previousDate
  ?`План стартует ${shortDate(opensOn)} — до этого баланс вносить нельзя.`
  :previousDate>today
   // Days closed ahead of the old fixed schedule keep its (future) date after migration.
   ?`У дня ${day-1} дата из прежнего расписания (${shortDate(previousDate)}), и она ещё не наступила. Если день был раньше, нажмите на его баланс и исправьте дату.`
   :`День ${day-1} закрыт ${shortDate(previousDate)}, а в одну дату закрывается только один торговый день. День ${day} можно закрыть с ${shortDate(opensOn)} или позже.`;
 return <span className="fact-opens" title={reason}><Clock3 size={12} aria-hidden/>Внести с {shortDate(opensOn)}</span>;
}
