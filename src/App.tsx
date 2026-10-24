import {useEffect,useState} from 'react';
import {onAuthStateChanged,signOut,type User} from 'firebase/auth';
import {Activity,BookOpen,CalendarDays,ChartNoAxesCombined,ChevronLeft,ChevronRight,Cloud,CloudAlert,Download,LogOut,LockKeyhole,Menu,RefreshCw,ShieldCheck,Target} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {Page} from './domain/types';
import {NotifyProvider} from './components/UI';
import {AuthGate} from './components/AuthGate';
import {initialData} from './state/initial';
import {STORE_KEY, legacyLocalCandidate, usePlanner} from './state/store';
import {endCloud,flushCloud,refreshCloud,startCloud,useCloudStatus} from './services/cloudSync';
import {firebaseAuth,firebaseConfigured} from './services/firebase';
import Goals from './pages/Goals';
import Calendar from './pages/Calendar';
import Journal from './pages/Journal';
import './styles.css';

const NAV:{key:Page;label:string;icon:LucideIcon}[]=[
 {key:'goals',label:'Финансовые цели',icon:Target},
 {key:'calendar',label:'Календарь',icon:CalendarDays},
 {key:'journal',label:'Дневник трейдера',icon:BookOpen},
];
const titles=Object.fromEntries(NAV.map(n=>[n.key,n.label])) as Record<Page,string>;

function AppContent({user,showImport,onImport,onRejectImport}:{user:User;showImport:boolean;onImport:()=>void;onRejectImport:()=>void}){
 const [page,setPage]=useState<Page>('goals');
 const [compact,setCompact]=useState(false);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [actionError,setActionError]=useState('');
 const cloud=useCloudStatus();
 const dense=usePlanner(s=>s.settings.compact);
 const goalsCount=usePlanner(s=>s.goals.length);
 const navigate=(next:Page)=>{setPage(next);setMobileOpen(false);window.scrollTo({top:0,behavior:'instant'});};
 useEffect(()=>{document.title=`${titles[page]} · YieldPilot`;},[page]);
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{
   if(useCloudStatus.getState().pending){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[]);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')void refreshCloud(user.uid).catch(()=>{});};
  document.addEventListener('visibilitychange',refresh);
  return()=>document.removeEventListener('visibilitychange',refresh);
 },[user.uid]);
 const logOut=async()=>{
  if(!firebaseAuth)return;
  setBusy(true);setActionError('');
  try{await flushCloud();await signOut(firebaseAuth);}catch(e){setActionError(`Перед выходом не удалось сохранить данные: ${e instanceof Error?e.message:'Ошибка'}. Повторите попытку.`);}finally{setBusy(false);}
 };


 return <div className={`app-layout ${!dense?'density-relaxed':''} ${compact?'sidebar-small':''}`}>
  {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Закрыть меню"/>}
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
   <div className="brand"><div className="brand-identity">
    <span className="brand-mark"><ChartNoAxesCombined size={23}/></span>
    {!compact&&<span className="brand-text"><strong>Yield<span>Pilot</span></strong><small>TRADING · CLOUD</small></span>}
   </div><button type="button" className="sidebar-collapse" onClick={()=>setCompact(v=>!v)} title="Свернуть меню" aria-label={compact?'Развернуть меню':'Свернуть меню'}>{compact?<ChevronRight size={17}/>:<ChevronLeft size={17}/>}</button></div>
   <nav aria-label="Разделы приложения"><div className="nav-group">
    {!compact&&<div className="nav-label">ТРЕЙДИНГ</div>}
    {NAV.map(item=><button key={item.key} type="button" className={`nav-link ${page===item.key?'active':''}`} onClick={()=>navigate(item.key)}><item.icon size={19}/>{!compact&&<span>{item.label}</span>}{!compact&&item.key==='goals'&&goalsCount>0&&<span className="nav-count">{goalsCount}</span>}</button>)}
   </div></nav>
   <div className="sidebar-bottom"><div className="privacy-label"><ShieldCheck size={16}/>{!compact&&<span>Облачное хранение</span>}</div>{!compact&&<small>Цели и дневник изолированы по аккаунту. Сохраняются в Firebase Firestore.</small>}</div>
  </aside>
  <div className="app-body">
   <header className="topbar"><div className="topbar-left"><button type="button" className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)} aria-label="Открыть меню"><Menu size={20}/></button><Activity size={18} className="breadcrumb-logo"/><span className="topbar-muted">YieldPilot</span><ChevronRight size={15} className="topbar-chevron"/><strong>{titles[page]}</strong></div>
    <div className="topbar-right">
     <div className="cloud-actions"><span className="cloud-user" title={user.email??''}>
      <LockKeyhole size={15}/>{user.email}</span>
      {cloud.phase === 'error' &&
          <button onClick={()=> void flushCloud().catch(()=>{})} title="Повторить сохранение">
       <RefreshCw size={16}/></button>}<button disabled={busy} type="button" onClick={()=>void logOut()} title="Выход из аккаунта"><LogOut size={16}/>
       <span>Выйти</span>
      </button>
     </div>
    </div>
   </header>
   <main id="content" className="main-content">
    {showImport&&<div className="cloud-import"><ShieldCheck size={22}/><div><strong>Найдены данные старой локальной версии</strong><div>Можно перенести цели и дневник в этот аккаунт. Данные прежнего браузера останутся нетронутыми.</div></div><button onClick={onImport}>Перенести в облако</button><button type="button" onClick={onRejectImport} style={{background:'transparent',border:'1px solid #507460',color:'#b0dfc6'}}>Пропустить</button></div>}
    {(cloud.error||actionError)&&<p role="alert" className="auth-error">{cloud.error||actionError} {cloud.error&&'Изменения ещё не подтверждены облаком; не закрывайте вкладку до успешного сохранения.'}</p>}
    {page==='goals'&&<Goals/>}{page==='calendar'&&<Calendar/>}{page==='journal'&&<Journal/>}
   </main>
   <footer className="site-footer"><span>YieldPilot Cloud · Торговый планировщик</span>
   </footer>
  </div>
 </div>;
}

function CloudApplication(){
 const [authUser,setAuthUser]=useState<User|null>(null);
 const [state,setState]=useState<'loading'|'guest'|'ready'|'error'>('loading');
 const [bootError,setBootError]=useState('');
 const [showImport,setShowImport]=useState(false);
 useEffect(()=>{
  if(!firebaseAuth){setState('guest');return;}
  let alive=true;let seq=0;
  const unsubscribe=onAuthStateChanged(firebaseAuth,user=>{
   const ticket=++seq;
   setState('loading');setBootError('');
   void (async()=>{
    try{
     await endCloud(false);
     usePlanner.getState().replaceData(initialData());
     if(!user){if(alive&&ticket===seq){setAuthUser(null);setState('guest');setShowImport(false);}return;}
     const cloudData=await startCloud(user.uid);
     if(!alive||ticket!==seq)return;
     setAuthUser(user);setState('ready');
     setShowImport(cloudData.goals.length===0&&cloudData.journal.length===0&&!localStorage.getItem(`yieldpilot-cloud-migrated:${STORE_KEY}`)&&Boolean(legacyLocalCandidate()?.goals.length));
    }catch(err){if(alive&&ticket===seq){if(err instanceof Error&&err.message==='CANCELLED')return;setBootError(err instanceof Error?err.message:'Не удалось загрузить данные аккаунта.');setState('error');}}
   })();
  },err=>{if(alive){setBootError(err.message);setState('error');}});
  return()=>{alive=false;seq++;unsubscribe();void endCloud(false);};
 },[]);
 if(!firebaseConfigured)return <main className="auth-layout"><div className="auth-card"><h2>Firebase ещё не настроен</h2><p>Добавьте параметры Web SDK в <code>.env.local</code> и в Environment Variables Vercel, затем перезапустите сборку. Приватный JSON Firebase Admin SDK сюда не нужен.</p></div></main>;
 if(state==='loading')return <main className="auth-layout"><div className="auth-card"><div className="auth-brand"><Cloud size={26}/><strong>YieldPilot</strong></div><p>Подключение к аккаунту и загрузка торговых данных…</p></div></main>;
 if(state==='error')return <main className="auth-layout"><div className="auth-card"><h2>Не удалось подключить Firebase</h2><p role="alert" className="auth-error">{bootError}</p><p>Проверьте Firestore, правила доступа и настройки проекта. Данные аккаунта не изменены.</p><button className="auth-submit" onClick={()=>window.location.reload()}>Повторить подключение</button></div></main>;
 if(state==='guest'||!authUser)return <AuthGate/>;
 const importLegacy=()=>{
  const restored=legacyLocalCandidate();
  if(!restored||!restored.goals.length){setShowImport(false);return;}
  if(!window.confirm(`Перенести ${restored.goals.length} торговых целей из старой версии в текущий аккаунт?`))return;
  usePlanner.getState().replaceData(restored);setShowImport(false);
  void flushCloud().then(()=>localStorage.setItem(`yieldpilot-cloud-migrated:${STORE_KEY}`,authUser.uid)).catch(()=>{});
 };
 return <AppContent user={authUser} showImport={showImport} onImport={importLegacy} onRejectImport={()=>setShowImport(false)}/>;
}
export default function App(){return <NotifyProvider><CloudApplication/></NotifyProvider>}
