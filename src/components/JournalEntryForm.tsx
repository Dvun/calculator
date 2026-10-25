import {useMemo,useState} from 'react';
import {Activity,CalendarDays,CheckCircle2,Target,Tag,Check,Zap,TrendingUp,TrendingDown,ArrowLeftRight,ChartNoAxesColumn,FileCheck2,X,Brain,Hourglass,ShieldCheck,Layers3} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {Goal,JournalEntry} from '../domain/types';
import {buildGoalPlan,num,signed,shortDate} from '../domain/finance';
import {JOURNAL_TAGS,normalizeJournalTags} from '../domain/journalTags';
import {usePlanner,makeId} from '../state/store';
import {Button,Modal,useNotify} from './UI';
import {CompletedTradeDatePicker} from './CompletedTradeDatePicker';

const icons:Record<string,LucideIcon>={check:Check,zap:Zap,'trending-up':TrendingUp,'trending-down':TrendingDown,'arrow-left-right':ArrowLeftRight,'bar-chart':ChartNoAxesColumn,'file-check':FileCheck2,x:X,brain:Brain,hourglass:Hourglass,shield:ShieldCheck,layers:Layers3};
const moodLabels={great:'Отлично',good:'Хорошо',neutral:'Нормально',low:'Сложный день'};
const DEFAULT_TITLE=(date:string)=>`Торговый день · ${shortDate(date)}`;
const NEW_NOTE_LIMIT=2000;

export function JournalEntryForm({goal,existing,onClose}:{goal:Goal;existing?:JournalEntry;onClose:()=>void}){
 const upsertJournal=usePlanner(s=>s.upsertJournal);
 const notify=useNotify();
 const completed=useMemo(()=>buildGoalPlan(goal).rows.filter(r=>r.completed),[goal]);
 const availableDates=completed.map(row=>row.date);
 const [v,setV]=useState<JournalEntry>(()=>existing??{
  id:makeId(),goalId:goal.id,date:completed.at(-1)?.date??'',title:'',note:'',mood:'neutral',discipline:3,tags:[],createdAt:new Date().toISOString()
 });
 const change=<K extends keyof JournalEntry>(key:K,value:JournalEntry[K])=>setV(prev=>({...prev,[key]:value}));
 const selected=completed.find(row=>row.date===v.date);
 const tags=normalizeJournalTags(v.tags);
 const noteLimit=Math.max(NEW_NOTE_LIMIT,existing?.note.length??0);
 const toggleTag=(id:(typeof JOURNAL_TAGS)[number]['id'])=>change('tags',tags.includes(id)?tags.filter(tag=>tag!==id):[...tags,id]);
 const save=()=>{
  const entry:JournalEntry={...v,title:v.title.trim()||(existing?.title||DEFAULT_TITLE(v.date)),note:v.note.trim(),tags};
  const error=upsertJournal(entry);
  if(error){notify(error,'error');return;}
  notify('Запись сохранена.');onClose();
 };
 return <Modal title={existing?'Редактировать запись':'Новая запись'} subtitle="Добавьте детали о вашей торговой сессии" onClose={onClose} wide className="journal-entry-modal">
  <form className="journal-entry-form" onSubmit={e=>{e.preventDefault();save();}}>
   <div className="journal-entry-top">
    <section className="journal-entry-panel journal-entry-calendar-panel" aria-label="Дата завершённого торгового дня">
     <h3>Дата завершённого торгового дня</h3>
     <CompletedTradeDatePicker goalId={goal.id} dates={availableDates} date={v.date} onChange={date=>change('date',date)}/>
    </section>
    <div className="journal-entry-side">
     <section className="journal-entry-panel journal-day-panel" aria-label="Выбранный торговый день">
      <div className="journal-section-head"><h3><CalendarDays size={17}/> Выбранный день</h3><span>{v.date?new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${v.date}T12:00:00Z`)):'—'}</span></div>
      <div className="journal-day-metrics">
       <div className="journal-day-metric"><Activity size={15}/><span>Факт</span><strong className={(selected?.actualProfit??0)<0?'negative':'positive'}>{selected?.actualProfit==null?'—':signed(selected.actualProfit)}</strong></div>
       <div className="journal-day-metric"><CheckCircle2 size={15}/><span>Статус</span><strong className="journal-day-status">{selected?'Выполнено':'Нет результата'}</strong></div>
       <div className="journal-day-metric"><Target size={15}/><span>Цель дня</span><strong>{selected?.targetProfit==null?'—':`+${num(selected.targetProfit)}`}</strong></div>
      </div>
     </section>
     <section className="journal-entry-panel journal-tags-panel" aria-label="Быстрые теги">
      <div className="journal-section-head"><h3><Tag size={17}/> Быстрые теги</h3><span>Можно выбрать несколько</span></div>
      <div className="journal-tags-grid">
       {JOURNAL_TAGS.map(tag=>{const Icon=icons[tag.icon];const chosen=tags.includes(tag.id);return <button key={tag.id} type="button" className={`journal-tag-chip ${chosen?'is-active':''}`} aria-pressed={chosen} onClick={()=>toggleTag(tag.id)}><Icon size={14}/><span>{tag.label}</span></button>;})}
      </div>
     </section>
     <div className="journal-entry-selects">
      <label><span>Самочувствие</span><select value={v.mood} onChange={e=>change('mood',e.target.value as JournalEntry['mood'])}>{Object.entries(moodLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label><span>Следование плану</span><select value={v.discipline} onChange={e=>change('discipline',Number(e.target.value) as JournalEntry['discipline'])}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
     </div>
    </div>
   </div>
   <section className="journal-entry-panel journal-details-panel">
    <div className="journal-section-head"><label htmlFor="journal-entry-details">Подробности</label><span>{v.note.length} / {noteLimit}</span></div>
    <textarea id="journal-entry-details" required value={v.note} maxLength={noteLimit} onChange={e=>change('note',e.target.value)} rows={12} placeholder="Опишите, как прошёл торговый день: входы, решения, ошибки, выводы…"/>
   </section>
   <div className="journal-entry-actions"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit">Сохранить запись</Button></div>
  </form>
 </Modal>;
}
