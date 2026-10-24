import {create} from 'zustand';
import {collection,doc,getDoc,getDocs,writeBatch} from 'firebase/firestore';
import type {DocumentReference} from 'firebase/firestore';
import type {DataState} from '../domain/types';
import {initialData} from '../state/initial';
import {getSnapshot,sanitizeData,usePlanner} from '../state/store';
import {firestore} from './firebase';

type CloudPhase='loading'|'saved'|'saving'|'error'|'disconnected';
type CloudStatus={phase:CloudPhase;error:string|null;pending:boolean;set:(patch:Partial<Omit<CloudStatus,'set'>>)=>void};
export const useCloudStatus=create<CloudStatus>(set=>({phase:'disconnected',error:null,pending:false,set:patch=>set(patch)}));
const status=(p:Partial<Omit<CloudStatus,'set'>>)=>useCloudStatus.getState().set(p);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const safeId=(id:string):string=>{if(!id||id.includes('/')||id==='.'||id==='..'||id.length>200)throw new Error('Недопустимый идентификатор.');return id};
const clean=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const base=(uid:string)=>`users/${safeId(uid)}`;

export async function loadCloudData(uid:string):Promise<DataState>{
 if(!firestore)throw new Error('Firebase не настроен.');
 const root=base(uid);
 const [goals,notes,meta]=await Promise.all([
  getDocs(collection(firestore,root,'goals')),
  getDocs(collection(firestore,root,'journal')),
  getDoc(doc(firestore,root,'meta','preferences')),
 ]);
 const raw={
  goals:goals.docs.map(d=>({...d.data(),id:d.id})),
  journal:notes.docs.map(d=>({...d.data(),id:d.id})),
  activeGoalId:meta.data()?.activeGoalId??null,
  settings:meta.data()?.settings??initialData().settings,
 };
 const parsed=sanitizeData(raw);
 if(!parsed)throw new Error('В базе найдены некорректные данные. Автоматическое изменение остановлено; обратитесь к резервной копии.');
 return parsed;
}

type Change={path:DocumentReference;kind:'set'|'delete';data?:Record<string,unknown>};
function changes(uid:string,prev:DataState,next:DataState):Change[]{
 if(!firestore)return [];
 const root=base(uid),out:Change[]=[];
 const compare=(key:'goals'|'journal')=>{
  const oldMap=new Map(prev[key].map(item=>[item.id,item]));
  const newMap=new Map(next[key].map(item=>[item.id,item]));
  for(const [id,item] of newMap){if(!same(item,oldMap.get(id))){out.push({path:doc(firestore!,root,key,safeId(id)),kind:'set',data:clean(item) as unknown as Record<string,unknown>});}}
  for(const id of oldMap.keys()){if(!newMap.has(id))out.push({path:doc(firestore!,root,key,safeId(id)),kind:'delete'});}
 };
 compare('goals');compare('journal');
 if(!same(prev.settings,next.settings)||prev.activeGoalId!==next.activeGoalId){
  out.push({path:doc(firestore,root,'meta','preferences'),kind:'set',data:{settings:clean(next.settings),activeGoalId:next.activeGoalId}});
 }
 return out;
}

async function writeChanges(items:Change[]):Promise<void>{
 if(!firestore)throw new Error('Firebase не настроен.');
 // Chunk writes to avoid overly large Firestore batches on JSON import.
 for(let i=0;i<items.length;i+=300){
  const batch=writeBatch(firestore);
  for(const item of items.slice(i,i+300)){
   if(item.kind==='delete')batch.delete(item.path);
   else batch.set(item.path,item.data!);
  }
  await batch.commit();
 }
}

class Session {
 private uid:string;
 private last:DataState;
 private unsub:()=>void;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private running:Promise<void>|null=null;
 private closed=false;
 constructor(uid:string){
  this.uid=uid;this.last=getSnapshot();
  this.unsub=usePlanner.subscribe(()=>this.schedule());
  status({phase:'saved',error:null,pending:false});
 }
 private schedule(){
  if(this.closed)return;
  if(this.timer)clearTimeout(this.timer);
  status({phase:'saving',error:null,pending:true});
  this.timer=setTimeout(()=>{this.timer=null;void this.flush().catch(()=>{});},350);
 }
 async flush():Promise<void>{
  if(this.timer){clearTimeout(this.timer);this.timer=null;}
  if(this.closed)return;
  if(this.running){await this.running;return;}
  this.running=(async()=>{
   // Serialize changes; don't discard newer edits made during an earlier commit.
   while(!this.closed){
    const next=getSnapshot();
    const changeset=changes(this.uid,this.last,next);
    if(!changeset.length){status({phase:'saved',error:null,pending:false});return;}
    status({phase:'saving',error:null,pending:true});
    await writeChanges(changeset);
    this.last=next;
   }
  })();
  try{await this.running;}
  catch(err){const msg=err instanceof Error?err.message:'Ошибка синхронизации';status({phase:'error',error:msg,pending:true});throw err;}
  finally{this.running=null;}
 }
 async stop(flush=true){
  if(flush)await this.flush();
  this.closed=true;
  if(this.timer)clearTimeout(this.timer);
  this.unsub();
 }
 canRefresh(){return !this.running&&!this.timer&&!useCloudStatus.getState().pending;}
}
let active:Session|null=null;
let epoch=0;
export async function startCloud(uid:string):Promise<DataState>{
 await endCloud(false);
 const token=++epoch;
 status({phase:'loading',error:null,pending:false});
 const state=await loadCloudData(uid);
 if(token!==epoch)throw new Error('CANCELLED');
 usePlanner.getState().replaceData(state);
 active=new Session(uid);
 return state;
}
export async function endCloud(flush=true){
 epoch++;
 if(active){await active.stop(flush);active=null;}
 status({phase:'disconnected',error:null,pending:false});
}
export async function flushCloud(){await active?.flush();}
export async function refreshCloud(uid:string){
 if(!active||!active.canRefresh())return;
 const data=await loadCloudData(uid);
 await active.stop(false);
 active=null;
 usePlanner.getState().replaceData(data);
 active=new Session(uid);
}
