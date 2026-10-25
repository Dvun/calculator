import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,X} from 'lucide-react';
import {shortDate} from '../domain/finance';

export interface CommentAnchor {day:number; date:string; rect:{left:number;right:number;top:number;bottom:number}}

/** Small anchored editor rendered outside the scrollable table so it is never clipped. */
export function DayCommentPopover({anchor,initial,onClose,onSave}:{
 anchor:CommentAnchor;
 initial:string;
 onClose:()=>void;
 onSave:(note:string)=>boolean;
}){
 const [draft,setDraft]=useState(initial);
 const [position,setPosition]=useState<{left:number;top:number}|null>(null);
 const popover=useRef<HTMLDivElement>(null);
 const textarea=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{
  const place=()=>{
   const width=Math.min(310,window.innerWidth-24);
   const height=250;
   const left=Math.max(12,Math.min(anchor.rect.right-width,window.innerWidth-width-12));
   const top=anchor.rect.bottom+height+8>window.innerHeight?Math.max(10,anchor.rect.top-height-8):anchor.rect.bottom+8;
   setPosition({left,top});
  };
  place();
  const raf=requestAnimationFrame(()=>textarea.current?.focus());
  const outside=(e:PointerEvent)=>{if(!popover.current?.contains(e.target as Node))onClose();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',escape);
  window.addEventListener('resize',place);
  return()=>{cancelAnimationFrame(raf);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);};
 },[anchor,onClose]);
 return createPortal(<div ref={popover} className="day-comment-popover" role="dialog"
  aria-label={`Комментарий к дню ${anchor.day}`} style={position?{left:position.left,top:position.top}:{visibility:'hidden'}}>
  <div className="day-comment-head"><div><strong>Комментарий · день {anchor.day}</strong><small>{shortDate(anchor.date)}</small></div>
   <button type="button" title="Закрыть" aria-label="Закрыть комментарий" onClick={onClose}><X size={16}/></button></div>
  <textarea ref={textarea} rows={4} maxLength={3000} value={draft}
   placeholder="Как прошёл торговый день? (необязательно)" onChange={e=>setDraft(e.target.value)}/>
  <div className="day-comment-foot"><small>{draft.length}/3000</small>
   <button type="button" className="day-comment-save" onClick={()=>{if(onSave(draft))onClose();}}><Check size={14}/> Сохранить</button></div>
 </div>,document.body);
}
