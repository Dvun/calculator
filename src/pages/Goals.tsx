import {useEffect,useMemo,useState} from 'react';
import {Plus,Target,Calendar,Check,Edit3,RotateCcw,Trash2,Search,ArrowUpRight,MessageSquare} from 'lucide-react';
import {usePlanner} from '../state/store';
import {buildGoalPlan,dayDelta,num,pct,shortDate,signed,signedPct} from '../domain/finance';
import type {Goal} from '../domain/types';
import {GoalForm} from '../components/GoalForm';
import {InlineDayFact} from '../components/InlineDayFact';
import {DayOutcome} from '../components/DayOutcome';
import {DayCommentPopover,type CommentAnchor} from '../components/DayCommentPopover';
import {GoalGrowthChart} from '../components/Charts';
import {Button,Confirm,DownloadTable,Empty,Metric,Pill,Section,useNotify} from '../components/UI';


export default function Goals(){
 const {goals, activeGoalId, setActiveGoal, upsertGoal, deleteGoal, undoDay, recordDayBalance, updateDayNote} = usePlanner();
 const notify= useNotify();
 const [editing, setEditing] = useState<Goal|null>(null);
 const [createOpen, setCreateOpen] = useState(false);
 const [editingDay,setEditingDay] = useState<number|null>(null);
 const [draftClose,setDraftClose] = useState<number|null>(null);
 const [commentAnchor,setCommentAnchor] = useState<CommentAnchor|null>(null);
 const [confirmDel, setConfirmDel] = useState<Goal|null>(null);
 const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
 const [search, setSearch] = useState('');
 const selected= goals.find(g=> g.id === activeGoalId) ?? goals[0];

 const plan= useMemo(()=> selected ? buildGoalPlan(selected) : null, [selected]);
 /** The draft starts from the saved balance, so the outcome cell always mirrors what is in the input. */
 const startEditing=(day:number,savedClose:number|null)=>{setCommentAnchor(null);setDraftClose(savedClose);setEditingDay(day);};
 const stopEditing=()=>{setEditingDay(null);setDraftClose(null);};
 useEffect(()=>{stopEditing();setCommentAnchor(null);},[selected?.id]);
 const saveDayBalance=(day:number,closeBalance:number):boolean=>{
  const row=plan?.rows[day-1];
  if(!selected||!row)return false;
  const wasCompleted=row.completed,nextCompleted=plan.rows[day]?.completed===true;
  const err=recordDayBalance(selected.id,day,closeBalance);
  if(err){notify(err,'error');return false;}
  const {profit,rate}=dayDelta(row.openingBalance,closeBalance);
  const outcome=`${signed(profit)} (${signedPct(rate)})`;
  notify(wasCompleted
   ?`День ${day} исправлен: ${outcome}.${nextCompleted?` Итог дня ${day+1} пересчитан.`:''}`
   :`День ${day} закрыт: ${outcome}.`,profit<0?'info':'success');
  return true;
 };
 const saveDayComment=(day:number,note:string):boolean=>{
  if(!selected)return false;
  const err=updateDayNote(selected.id,day,note);
  if(err){notify(err,'error');return false;}
  notify(note.trim()?'Комментарий обновлён. Ожидайте синхронизации.':'Комментарий удалён. Ожидайте синхронизации.');
  return true;
 };
 const visible= plan?.rows.filter(r=>
     (filter === 'all' || (filter === 'pending' ?! r.completed:r.completed)) &&
     (String(r.day).includes(search.trim()) || r.date.includes(search.trim()))) ?? [];



 return <>
  {selected && plan ? <>
  <div className="goal-workspace-head">
   <div className="goal-workspace-title">
    {goals.length>1 ? <div className="goal-selector-compact"><label htmlFor="goal-choice">Торговая цель</label><select id="goal-choice" value={selected.id} onChange={e=>setActiveGoal(e.target.value)}>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div> : <h1>{selected.name}</h1>}
    <p>{shortDate(selected.startDate)} · {selected.days} плановых дней · {selected.mode==='adaptive'?'адаптивный план':'фиксированный план'}</p>
   </div>
   <div className="goal-header-actions" role="group" aria-label="Управление торговой целью">
    <Button className="goal-action-new" onClick={()=>setCreateOpen(true)} icon={Plus}>Новая цель</Button>
    <Button variant="secondary" icon={Edit3} onClick={()=>setEditing(selected)}>Изменить</Button>
    <Button variant="ghost" icon={Trash2} onClick={()=>setConfirmDel(selected)}>Удалить</Button>
   </div>
  </div>
 <div className="metrics-grid goal-metrics-grid">
  <Metric label="Текущий баланс" value={num(plan.currentBalance)} hint={`Старт ${num(selected.startAmount)}`} icon={Target}/>
  <Metric label="Осталось до цели" value={num(plan.remainingProfit)} hint={`${plan.remainingDays} дней осталось`} icon={Calendar} tone="blue"/>
  <Metric label="Нужно в день" value={pct(plan.requiredRate,3)} hint={plan.viable ? 'Динамический расчёт' : 'Рост невозможен с нулевого баланса'} icon={ArrowUpRight} tone={plan.viable ? 'green' : 'red'}/>
  <Metric label="Фактический результат" value={signed(plan.actualProfit)} hint={`${plan.completedDays} выполнено · ${plan.winDays} прибыльных`} icon={Check} tone={plan.actualProfit < 0 ? 'red' : 'green'}/>
 </div>
 <div className="goals-charts">
  <Section title="Путь к цели" subtitle="План, прогноз и фактические результаты">
   <GoalGrowthChart rows={plan.rows} start={selected.startAmount}/>
  </Section><Section title="Состояние цели" subtitle="Прогресс и скорость достижения">
  <div className="goal-progress-big">
   <div className="circle-progress" style={{'--value' : `${plan.progress * 100}%`} as React.CSSProperties}>
    <div>
     <strong>{pct(plan.progress,0)}</strong>
     <span>от цели</span>
    </div>
   </div>
   <div className="progress-stats">
    <div>
     <span>Цель</span>
     <strong>{num(selected.targetAmount)}</strong>
    </div>
    <div>
     <span>Текущий баланс</span>
     <strong>{num(plan.currentBalance)}</strong>
    </div>
    <div>
     <span>Выполнено дней</span>
     <strong>{plan.completedDays} / {selected.days}</strong>
    </div>
    <div>
     <span>Максимальная просадка</span>
     <strong>{pct(plan.drawdown)}</strong>
    </div>
    <div>
     <span>Прогноз на финише</span>
     <strong>{plan.planFinalBalance === null ? 'Недоступен' : num(plan.planFinalBalance)}</strong>
    </div>
   </div>
  </div>
 </Section>
 </div>

 <Section
     className="daily-plan"
     title="План по дням"
     subtitle="Вносите баланс на конец дня — прибыль или убыток посчитаются автоматически"
     action={<DownloadTable
         filename="yieldpilot-goal.csv"
         rows={[["День", "Дата", "Баланс в начале", "Цель дня", "Дневной %", "Баланс по плану", "Баланс на конец дня", "Итог дня", "Итог дня %", "Комментарий", "Статус"], ...plan.rows.map(r=> [r.day, r.date, r.openingBalance, r.targetProfit, r.targetRate === null ? '' : (r.targetRate * 100).toFixed(5), r.targetClose, r.actualClose, r.actualProfit, r.actualProfit !== null && r.openingBalance > 0 ? (r.actualProfit / r.openingBalance * 100).toFixed(2) : '', selected.results[r.day]?.note??'', r.completed ? 'Выполнено' : r.active ? 'В работе' : 'Ожидает'])]}/>}>
  <div className="table-filters">
   <div className="segmented">{([['all', 'Все дни'], ['pending', 'Ожидают'], ['done', 'Выполнено']] as const).map(([v, l])=>
       <button key={v} className={filter === v ? 'active' : ''} onClick={()=> setFilter(v)}>{l}</button>)}
   </div>
   <div className="search-wrap">
    <Search size={16}/>
    <input value={search} placeholder="Поиск дня или даты" onChange={e=> setSearch(e.target.value)}/>
   </div>
  </div>
  <div className="table-scroll">
   <table className="goal-plan-table">
    {/* Stable widths: inline editing the fact must never resize neighboring columns. */}
    <colgroup>
     <col className="goal-col-day" />
     <col className="goal-col-start" />
     <col className="goal-col-target" />
     <col className="goal-col-rate" />
     <col className="goal-col-plan" />
     <col className="goal-col-fact" />
     <col className="goal-col-outcome" />
     <col className="goal-col-comment" />
     <col className="goal-col-status" />
    </colgroup>
    <thead>
    <tr>
     <th>ДЕНЬ / ДАТА</th>
     <th>НАЧАЛО</th>
     <th>ЦЕЛЬ ДНЯ</th>
     <th>РОСТ</th>
     <th>ПО ПЛАНУ</th>
     <th title="Фактический баланс после закрытия дня">КОНЕЦ ДНЯ</th>
     <th title="Прибыль или убыток: конец дня минус начало">ИТОГ ДНЯ</th>
     <th className="comment-th">КОММЕНТАРИЙ</th>
     <th className="status-th">СТАТУС</th>
    </tr>
    </thead>
    <tbody>{visible.map(r=>
        <tr key={r.day} className={r.active ? 'current-row' : r.completed ? 'completed-row' : ''}>
         <td> <strong>День {String(r.day).padStart(2,'0')}</strong>
          <small>{shortDate(r.date)}</small>
         </td>
         <td>{num(r.openingBalance)}</td>
         <td className="positive" > {r.targetProfit === null ? '—' : `+${num(r.targetProfit)}`}</td>
         <td>{pct(r.targetRate,2)}</td>
         <td>{r.targetClose === null ? '—' : num(r.targetClose)}</td>
         <td className="day-fact-cell"><InlineDayFact row={r} editing={editingDay===r.day}
           describedBy={`day-outcome-${r.day}`}
           onEdit={()=>startEditing(r.day,r.actualClose)}
           onCancel={stopEditing}
           onDraftChange={setDraftClose}
           onSave={value=>saveDayBalance(r.day,value)}/></td>
         <td className="day-outcome-cell"><DayOutcome id={`day-outcome-${r.day}`} row={r} editing={editingDay===r.day} draftClose={draftClose}/></td>
         <td className="day-comment-cell">
          {r.completed?<button type="button" className={`day-comment-trigger ${selected.results[r.day]?.note?'has-note':''}`}
           title={selected.results[r.day]?.note?'Просмотреть или изменить комментарий':'Добавить комментарий'}
           aria-label={`Комментарий к дню ${r.day}`}
           onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();stopEditing();setCommentAnchor({day:r.day,date:r.date,rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}});}}>
           <MessageSquare size={14}/>{selected.results[r.day]?.note&&<span className="comment-dot"/>}
          </button>:<span className="muted">—</span>}
         </td>
         <td className="day-status-cell"><Pill tone={r.completed ? 'green' : r.active ? 'amber' : 'muted'}>
           {r.completed ? 'Выполнено' : r.active ? 'В работе' : 'Ожидает'}</Pill></td>
        </tr>)}
    </tbody>
   </table>{!visible.length && <Empty title="Ничего не найдено" description="Попробуйте другой фильтр."/>}
  </div>
  <div className="table-foot">
   <span>Всего {plan.rows.length} дней · показано {visible.length}</span>
   {plan.completedDays > 0 &&
       <button className="link-btn" onClick={()=> {if(confirm(`Отменить последний завершённый день ${plan.completedDays}?`)){const err= undoDay(selected.id, plan.completedDays);
        notify(err ?? 'Последний результат удалён.', err ? 'error' : 'success')}}}>
        <RotateCcw size={14}/> Отменить последний день
       </button>}
  </div>
 </Section>
 </>:<div className="goal-empty-layout"><Empty title="Пока нет торговых целей" description="Создайте первую цель, чтобы увидеть ежедневный план и калькулятор ставок в боковой панели." action={<Button onClick={()=>setCreateOpen(true)} icon={Plus}>Создать цель</Button>}/></div>}
 {createOpen&&<GoalForm onClose={()=>setCreateOpen(false)} onSave={g=>{upsertGoal(g);setActiveGoal(g.id);notify('Новая цель создана.')}}/>}
 {editing&&<GoalForm existing={editing} onClose={()=>setEditing(null)} onSave={g=>{upsertGoal(g);notify('Цель обновлена.')}}/>}
 {commentAnchor&&selected&&<DayCommentPopover key={`${selected.id}:${commentAnchor.day}`} anchor={commentAnchor}
   initial={selected.results[commentAnchor.day]?.note??''} onClose={()=>setCommentAnchor(null)}
   onSave={note=>saveDayComment(commentAnchor.day,note)}/>} 
 {confirmDel&&<Confirm message={`Удалить цель «${confirmDel.name}» вместе с результатами, календарём и записями дневника? Это действие нельзя отменить.`} onCancel={()=>setConfirmDel(null)} onConfirm={()=>{deleteGoal(confirmDel.id);setConfirmDel(null);notify('Цель удалена.')}}/>}
 </>;
}
