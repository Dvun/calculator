import {useEffect,useRef,useState} from 'react';
import {Check,PencilLine,Plus,X} from 'lucide-react';
import type {GoalRow} from '../domain/types';
import {num,parseMoney} from '../domain/finance';

interface InlineDayFactProps{
 row:GoalRow;
 editing:boolean;
 /** Id of the element showing the derived day outcome, announced as the input's description. */
 describedBy:string;
 onEdit:()=>void;
 onCancel:()=>void;
 /** Called on every keystroke with the parsed balance (null while the draft is not a valid amount). */
 onDraftChange:(closeBalance:number|null)=>void;
 onSave:(closeBalance:number)=>boolean;
}

/** Inline editor for the account balance at the end of a day. No modal and no implicit save on blur. */
export function InlineDayFact({row,editing,describedBy,onEdit,onCancel,onDraftChange,onSave}:InlineDayFactProps){
 const [draft,setDraft]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!editing)return;
  setDraft(row.actualClose===null?'':num(row.actualClose));
  const id=requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});
  return()=>cancelAnimationFrame(id);
 },[editing,row.day]);
 const change=(value:string)=>{
  setDraft(value);
  input.current?.setCustomValidity('');
  onDraftChange(parseMoney(value));
 };
 const save=()=>{
  const amount=parseMoney(draft);
  if(amount===null){
   input.current?.setCustomValidity(draft.trim().startsWith('-')
    ?'Баланс не может быть отрицательным.'
    :'Введите баланс на конец дня, например 214,24.');
   input.current?.reportValidity();
   return;
  }
  if(onSave(amount))onCancel();
 };
 if(editing)return <div className="inline-fact-editor">
  <input ref={input} type="text" inputMode="decimal" aria-label={`Баланс на конец дня ${row.day}`}
   aria-describedby={describedBy} title="Баланс счёта после закрытия дня" value={draft} maxLength={20}
   placeholder={row.targetClose===null?'0,00':num(row.targetClose)}
   onChange={e=>change(e.target.value)}
   onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){e.preventDefault();onCancel();}}}/>
  <button type="button" className="fact-icon-save" aria-label={`Сохранить баланс дня ${row.day}`} title="Сохранить" onClick={save}><Check size={14}/></button>
  <button type="button" className="fact-icon-cancel" aria-label="Отменить ввод" title="Отмена" onClick={onCancel}><X size={14} strokeWidth={2}/></button>
 </div>;
 if(!row.active&&!row.completed)return <span className="muted">—</span>;
 if(row.actualClose===null)return <button type="button" className="fact-cell-trigger fact-empty"
  title="Укажите баланс после закрытия дня" aria-label={`Внести баланс на конец дня ${row.day}`} onClick={onEdit}>
  <Plus size={13}/> Внести баланс
 </button>;
 return <button type="button" className="fact-cell-trigger fact-balance"
  title="Нажмите, чтобы исправить баланс на конец дня" aria-label={`Изменить баланс на конец дня ${row.day}`} onClick={onEdit}>
  {num(row.actualClose)}<PencilLine size={12} className="fact-edit-icon" aria-hidden/>
 </button>;
}
