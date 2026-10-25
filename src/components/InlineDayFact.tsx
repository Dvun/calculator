import {useEffect,useRef,useState} from 'react';
import {Check,Plus,X} from 'lucide-react';
import type {GoalRow} from '../domain/types';
import {signed} from '../domain/finance';

/** Inline editor: no modal and no implicit save on blur. Zero and negative results are supported. */
export function InlineDayFact({row,editing,onEdit,onCancel,onSave}:{
 row:GoalRow;
 editing:boolean;
 onEdit:()=>void;
 onCancel:()=>void;
 onSave:(value:number)=>boolean;
}){
 const [draft,setDraft]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!editing)return;
  setDraft(row.actualProfit===null?'':String(row.actualProfit));
  const id=requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});
  return()=>cancelAnimationFrame(id);
 },[editing,row.day]);
 const save=()=>{
  const cleaned=draft.trim().replace(',','.');
  if(!/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)){
   input.current?.setCustomValidity('Введите число с точностью до сотых, например -12,50 или 0.');
   input.current?.reportValidity();
   return;
  }
  const amount=Number(cleaned);
  if(!Number.isFinite(amount))return;
  if(onSave(amount))onCancel();
 };
 if(editing)return <div className="inline-fact-editor">
  <input ref={input} type="text" inputMode="decimal" aria-label={`Факт за день ${row.day}`} value={draft}
   placeholder="±0,00" maxLength={20} onChange={e=>{setDraft(e.target.value);e.target.setCustomValidity('');}}
   onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){e.preventDefault();onCancel();}}}/>
  <button type="button" className="fact-icon-save" aria-label={`Сохранить факт дня ${row.day}`} title="Сохранить" onClick={save}><Check size={14}/></button>
  <button type="button" className="fact-icon-cancel" aria-label="Отменить ввод" title="Отмена" onClick={onCancel}><X size={14} strokeWidth={2}/></button>
 </div>;
 if(!row.active&&!row.completed)return <span className="muted">—</span>;
 return <button type="button" className={`fact-cell-trigger ${row.actualProfit===null?'fact-empty':row.actualProfit<0?'fact-loss':'fact-win'}`}
  title={row.completed?'Нажмите, чтобы изменить фактический результат':'Нажмите, чтобы внести результат'}
  aria-label={row.completed?`Изменить факт дня ${row.day}`:`Внести факт дня ${row.day}`}
  onClick={onEdit}>{row.actualProfit===null?<><Plus size={13}/> Внести факт</>:signed(row.actualProfit)}</button>;
}
