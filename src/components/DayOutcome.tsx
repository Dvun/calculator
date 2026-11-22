import {ArrowDownRight,ArrowUpRight,Minus} from 'lucide-react';
import type {GoalRow} from '../domain/types';
import {dayDelta,num,signed,signedPct} from '../domain/finance';

interface DayOutcomeProps{
 id:string;
 row:GoalRow;
 /** True while this day's closing balance is being edited: the cell then reflects the draft, never the saved value. */
 editing:boolean;
 /** Parsed draft balance; null while the draft is empty or not a valid amount. */
 draftClose:number|null;
}

/** Profit or loss of the day, derived from the balances at the start and at the end of the day. */
export function DayOutcome({id,row,editing,draftClose}:DayOutcomeProps){
 const close=editing?draftClose:row.actualClose;
 if(close===null)return <span id={id} className="muted">—</span>;
 const {profit,rate}=dayDelta(row.openingBalance,close);
 const tone=profit>0?'win':profit<0?'loss':'flat';
 const Icon=profit>0?ArrowUpRight:profit<0?ArrowDownRight:Minus;
 const explanation=`${num(row.openingBalance)} → ${num(close)}${editing?' · предпросмотр, сохраните ввод':''}`;
 return <div id={id} className={`day-outcome day-outcome-${tone}${editing?' is-preview':''}`} title={explanation}>
  <span className="day-outcome-icon"><Icon size={13} strokeWidth={2.4} aria-hidden/></span>
  <strong>{signed(profit)}</strong>
  <small>{signedPct(rate)}</small>
 </div>;
}
