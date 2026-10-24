import {useEffect,useMemo,useState} from 'react';
import {Plus,PenLine,Trash2,BookOpen,CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {usePlanner,makeId} from '../state/store';
import {buildGoalPlan,monthOf,shiftMonth,today,shortDate,signed} from '../domain/finance';
import type {Goal,JournalEntry} from '../domain/types';
import {Button,Confirm,Empty,Field,Form,Modal,Pill,Section,useNotify} from '../components/UI';


const moodLabels={
 great: 'Отлично',
 good: 'Хорошо',
 neutral: 'Нормально',
 low: 'Сложный день'
};

function CompletedDatePicker({goal, date, onChange}:{goal:Goal; date:string; onChange:(date:string) => void}){
 const available=new Set(buildGoalPlan(goal).rows.filter(r=>r.completed).map(r=> r.date));
 const [month,setMonth]=useState(monthOf(date||today()));
 useEffect(()=>setMonth(monthOf(date||today())),[goal.id,date]);
 const [year,m]=month.split('-').map(Number);const first=new Date(Date.UTC(year,m-1,1)),offset=(first.getUTCDay()+6)%7,length=new Date(Date.UTC(year,m,0)).getUTCDate();
 return <div className="date-picker-trading"><div className="date-picker-head"><strong>{new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(first)}</strong><div><button type="button" aria-label="Назад" onClick={()=>setMonth(v=>shiftMonth(v,-1))}><ChevronLeft size={17}/></button><button type="button" aria-label="Вперёд" onClick={()=>setMonth(v=>shiftMonth(v,1))}><ChevronRight size={17}/></button></div></div><div className="mini-calendar">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(n=><span className="mini-weekday" key={n}>{n}</span>)}{Array.from({length:offset},(_,i)=><span key={`gap-${i}`}/>)}{Array.from({length:length},(_,i)=>{const day=`${month}-${String(i+1).padStart(2,'0')}`;return <button key={day} type="button" className={`${date===day?'chosen':''} ${available.has(day)?'traded':''}`} disabled={!available.has(day)} title={available.has(day)?'Есть торговый результат':'Нет отчёта о результате'} onClick={()=>onChange(day)}>{i+1}</button>})}</div><small>Активны только даты, по которым внесён фактический результат этой цели.</small></div>;
}


function JournalForm({goal, existing, onClose} : {goal:Goal; existing? : JournalEntry; onClose:() => void}){
 const upsertJournal= usePlanner(s=> s.upsertJournal), notify= useNotify();
 const available= buildGoalPlan(goal).rows.filter(r=> r.completed);
 const [v,setV] = useState<JournalEntry>(existing ??
     {
      id:makeId(),
      goalId:goal.id,
      date:available.at(-1)?.date ?? today(),
      title: '',
      note: '',
      mood: 'neutral',
      discipline: 3,
      createdAt: new Date().toISOString()
     });
 const change= <K extends keyof JournalEntry>(key:K,value:JournalEntry[K])=> setV(s=> ({...s, [key]: value}));
 const save= ()=> {
  const err= upsertJournal({...v, goalId: goal.id});
  if(err) {
   notify(err,'error');
   return;
  }
  notify('Запись сохранена.');
  onClose();
 };



 return (
     <Modal
         title = {existing ? 'Редактировать запись' : 'Новая запись'}
         onClose={onClose} wide>
      <Form onSubmit={save}>
       <Field label="Дата завершённого торгового дня">
        <CompletedDatePicker goal={goal} date={v.date} onChange={date=> change('date',date)}/>
       </Field>
       <Field label = "Заголовок">
        <input
            maxLength={200}
            value={v.title}
            onChange={e=> change('title', e.target.value)}
            placeholder = "Что произошло во время торговли?"/>
       </Field>
       <Field label = "Подробности">
    <textarea
        rows={5}
        maxLength={20000}
        value={v.note}
        onChange={e=> change('note',e.target.value)}
        placeholder="Входы, решения, ошибки, выводы..."/>
       </Field>
       <div className="form-grid">
        <Field label="Самочувствие">
         <select
             value={v.mood}
             onChange={e=> change('mood', e.target.value as JournalEntry['mood'])}>
          {Object.entries(moodLabels).map(([k, l])=>
              <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Следование плану">
         <select
             value={v.discipline}
             onChange={e=> change('discipline', Number(e.target.value) as JournalEntry['discipline'])}>
          {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n} / 5</option>)}</select>
        </Field>
       </div>
       <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button type="submit">Сохранить запись</Button>
       </div>
      </Form>
     </Modal>
 );
}



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
 <Section title="История торговых записей" subtitle={`${visible.length} записей для выбранной цели`} action={<input className="standalone-search" value={query} placeholder="Поиск по дневнику" onChange={e=>setQuery(e.target.value)}/>}>{visible.length?<div className="journal-list">{visible.map(j=><article className="journal-card" key={j.id}><div className="journal-top"><div><span className="eyebrow"><CalendarDays size={13}/> {shortDate(j.date)} · {signed(completed.find(r=>r.date===j.date)?.actualProfit??0)}</span><h3>{j.title}</h3></div><div className="table-actions"><button title="Редактировать" onClick={()=>setForm(j)}><PenLine size={17}/></button><button title="Удалить" onClick={()=>setConfirmDel(j)}><Trash2 size={17}/></button></div></div><p>{j.note}</p><div className="journal-foot"><Pill tone="blue">{moodLabels[j.mood]}</Pill><Pill>Следование плану: {j.discipline}/5</Pill></div></article>)}</div>:<Empty title={completed.length?'Записей пока нет':'Сначала внесите торговый результат'} description={completed.length?'Добавьте заметку к любому завершённому дню.':'Дневник станет доступен после закрытия первого дня выбранной цели.'} action={goal&&completed.length?<Button icon={BookOpen} onClick={()=>setForm(true)}>Создать запись</Button>:undefined}/>}</Section>
 {form&&goal&&<JournalForm key={form===true?'new':form.id} goal={goal} existing={form===true?undefined:form} onClose={()=>setForm(null)}/>}
 {confirmDel&&<Confirm message={`Удалить запись «${confirmDel.title}»?`} onCancel={()=>setConfirmDel(null)} onConfirm={()=>{deleteJournal(confirmDel.id);setConfirmDel(null);notify('Запись удалена.')}}/>}
 </>;
}
