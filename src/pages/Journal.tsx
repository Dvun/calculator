import {useMemo,useState} from 'react';
import {Plus,PenLine,Trash2,BookOpen,CalendarDays} from 'lucide-react';
import {usePlanner} from '../state/store';
import {buildGoalPlan,shortDate,signed} from '../domain/finance';
import type {JournalEntry} from '../domain/types';
import {Button,Confirm,Empty,Pill,Section,useNotify} from '../components/UI';
import {JournalEntryForm} from '../components/JournalEntryForm';
import {normalizeJournalTags,journalTagLabel} from '../domain/journalTags';


const moodLabels={
 great: 'Отлично',
 good: 'Хорошо',
 neutral: 'Нормально',
 low: 'Сложный день'
};

export default function Journal(){
 const {journal,goals,activeGoalId,setActiveGoal,deleteJournal}=usePlanner();const goal=goals.find(g=>g.id===activeGoalId)??goals[0];
 const[form,setForm]=useState<JournalEntry|true|null>(null),[confirmDel,setConfirmDel]=useState<JournalEntry|null>(null),[query,setQuery]=useState('');const notify=useNotify();
 const completed=useMemo(()=>goal?buildGoalPlan(goal).rows.filter(r=>r.completed):[],[goal]);
 const visible=journal.filter(j=>j.goalId===goal?.id&&[j.title,j.note].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
 return <>
 {goal&&<div className="goal-switch workspace-toolbar journal-toolbar">
  <div className="workspace-toolbar-primary">
   <label htmlFor="journal-goal">Дневник цели</label>
   <select id="journal-goal" value={goal.id} onChange={e=>{setActiveGoal(e.target.value);setForm(null)}}>{goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
   <span className="workspace-toolbar-count">{completed.length} дней с результатами</span>
  </div>
  {completed.length>0&&<Button className="workspace-toolbar-button" icon={Plus} onClick={()=>setForm(true)}>Новая запись</Button>}
 </div>}
 <Section title="История торговых записей" subtitle={`${visible.length} записей для выбранной цели`} action={<input className="standalone-search" value={query} placeholder="Поиск по дневнику" onChange={e=>setQuery(e.target.value)}/>}>{visible.length?<div className="journal-list">{visible.map(j=><article className="journal-card" key={j.id}><div className="journal-top"><div><span className="eyebrow"><CalendarDays size={13}/> {shortDate(j.date)} · {signed(completed.find(r=>r.date===j.date)?.actualProfit??0)}</span><h3>{j.title}</h3></div><div className="table-actions"><button title="Редактировать" onClick={()=>setForm(j)}><PenLine size={17}/></button><button title="Удалить" onClick={()=>setConfirmDel(j)}><Trash2 size={17}/></button></div></div><p>{j.note}</p><div className="journal-foot"><Pill tone="blue">{moodLabels[j.mood]}</Pill><Pill>Следование плану: {j.discipline}/5</Pill>{normalizeJournalTags(j.tags).map(tag=><Pill key={tag}>{journalTagLabel(tag)}</Pill>)}</div></article>)}</div>:<Empty title={completed.length?'Записей пока нет':'Сначала внесите торговый результат'} description={completed.length?'Добавьте заметку к любому завершённому дню.':'Дневник станет доступен после закрытия первого дня выбранной цели.'} action={goal&&completed.length?<Button icon={BookOpen} onClick={()=>setForm(true)}>Создать запись</Button>:undefined}/>}</Section>
 {form&&goal&&<JournalEntryForm key={form===true?'new':form.id} goal={goal} existing={form===true?undefined:form} onClose={()=>setForm(null)}/>}
 {confirmDel&&<Confirm message={`Удалить запись «${confirmDel.title}»?`} onCancel={()=>setConfirmDel(null)} onConfirm={()=>{deleteJournal(confirmDel.id);setConfirmDel(null);notify('Запись удалена.')}}/>}
 </>;
}
