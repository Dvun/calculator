import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,BookOpen,CheckCircle2} from 'lucide-react';
import {usePlanner} from '../state/store';
import {buildGoalPlan,monthOf,num,shiftMonth,signed,today,shortDate} from '../domain/finance';
import {Empty,Section} from '../components/UI';
import {normalizeJournalTags,journalTagLabel} from '../domain/journalTags';
export default function Calendar(){
 const {goals,activeGoalId,setActiveGoal,journal}=usePlanner();
 const goal=goals.find(g=>g.id===activeGoalId)??goals[0];
 const [month,setMonth]=useState(monthOf(today()));const[selected,setSelected]=useState<string|null>(null);
 const plan=useMemo(()=>goal?buildGoalPlan(goal):null,[goal]);
 const completed=new Map((plan?.rows??[]).filter(r=>r.completed).map(r=>[r.date,r]));
 const scheduled=new Map((plan?.rows??[]).map(r=>[r.date,r]));
 const [year,mo]=month.split('-').map(Number),first=new Date(Date.UTC(year,mo-1,1)),daysInMonth=new Date(Date.UTC(year,mo,0)).getUTCDate(),offset=(first.getUTCDay()+6)%7;
 const cells=Array.from({length:Math.ceil((offset+daysInMonth)/7)*7},(_,idx)=>{const d=idx-offset+1;return d>0&&d<=daysInMonth?`${month}-${String(d).padStart(2,'0')}`:null});
 const selectedRow=selected?completed.get(selected):undefined;
 const records=journal.filter(j=>j.goalId===goal?.id&&j.date===selected);
 const journalDates=new Set(journal.filter(j=>j.goalId===goal?.id).map(j=>j.date));
 return <>
 {!goal?<Empty title="Нет торговых целей" description="Сначала создайте цель и запишите первый результат."/>:<>
 <div className="goal-switch workspace-toolbar calendar-toolbar">
  <div className="workspace-toolbar-primary">
   <label htmlFor="calendar-goal">Календарь цели</label>
   <select id="calendar-goal" value={goal.id} onChange={e=>{setActiveGoal(e.target.value);setSelected(null)}}>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
   <span className="workspace-toolbar-count">{plan?.completedDays??0} завершено</span>
  </div>
  <div className="month-nav" aria-label="Выбор месяца">
   <button type="button" aria-label="Прошлый месяц" onClick={()=>{setMonth(m=>shiftMonth(m,-1));setSelected(null)}}><ArrowLeft size={17}/></button>
   <input type="month" value={month} onChange={e=>{setMonth(e.target.value);setSelected(null)}} aria-label="Месяц"/>
   <button type="button" aria-label="Следующий месяц" onClick={()=>{setMonth(m=>shiftMonth(m,1));setSelected(null)}}><ArrowRight size={17}/></button>
  </div>
 </div>
 <div className="calendar-layout"><Section title="Торговые дни" subtitle="Нажать можно только на день с фактическим результатом"><div className="calendar-weekdays">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=><div key={d}>{d}</div>)}</div><div className="calendar-grid">{cells.map((date,i)=>date?<button key={date} type="button" disabled={!completed.has(date)} title={completed.has(date)?'Открыть результат':scheduled.has(date)?'Торговый день ещё не завершён':'Нет результата'} className={`calendar-cell ${selected===date?'selected':''} ${date===today()?'today':''} ${completed.has(date)?'traded':scheduled.has(date)?'planned':''}`} onClick={()=>setSelected(date)}><span>{Number(date.slice(-2))}</span>{completed.has(date)&&<strong className={(completed.get(date)?.actualProfit??0)<0?'negative':'positive'}>{signed(completed.get(date)!.actualProfit!)}</strong>}{journalDates.has(date)&&<span className="calendar-dot"/>}</button>:<div key={`empty-${i}`} className="calendar-cell placeholder"/>)}</div><div className="calendar-legend"><span><i className="legend-green"/> Прибыль</span><span><i className="legend-red"/> Убыток</span><span><i className="legend-blue"/> План без результата</span></div></Section>
 <Section title={selectedRow?`Торговый день · ${shortDate(selectedRow.date)}`:'Результат выбранного дня'} subtitle="Факт и дневниковые записи только по этой цели">{selectedRow?<><div className="day-overview two"><div><span>Факт дня</span><strong className={(selectedRow.actualProfit??0)<0?'negative':'positive'}>{signed(selectedRow.actualProfit!)}</strong></div><div><span>Баланс после дня</span><strong>{num(selectedRow.actualClose!)}</strong></div></div><div className="day-events"><div className="day-event"><CheckCircle2 size={18}/><div><strong>День {selectedRow.day} завершён</strong><small>{goal.results[selectedRow.day]?.note||'Без комментария к результату'}</small></div></div>{records.map(j=><div className="day-event" key={j.id}><BookOpen size={17}/><div><strong>{j.title}</strong><small>{j.note}</small>{normalizeJournalTags(j.tags).length>0&&<small className="journal-calendar-tags">{normalizeJournalTags(j.tags).map(journalTagLabel).join(' · ')}</small>}</div></div>)}</div></>:<div className="day-empty"><CalendarDays size={26}/><p>Выберите отмеченный торговый день в календаре.</p></div>}</Section></div></>}
 </>;
}
