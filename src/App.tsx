import {useEffect,useState} from 'react';
import {Activity,BookOpen,CalendarDays,ChartNoAxesCombined,ChevronLeft,ChevronRight,CloudOff,LockKeyhole,Menu,ShieldCheck,Target} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {Page} from './domain/types';
import {NotifyProvider} from './components/UI';
import {usePlanner} from './state/store';
import Goals from './pages/Goals';
import Calendar from './pages/Calendar';
import Journal from './pages/Journal';
import './styles.css';

// Public trading pages only. System pages are intentionally not mounted or linked.
const NAV:{key:Page;label:string;icon:LucideIcon}[]=[
 {key:'goals',label:'Финансовые цели',icon:Target},
 {key:'calendar',label:'Календарь',icon:CalendarDays},
 {key:'journal',label:'Дневник трейдера',icon:BookOpen},
];
const titles=Object.fromEntries(NAV.map(n=>[n.key,n.label])) as Record<Page,string>;

function AppContent(){
 const [page,setPage]=useState<Page>('goals');
 const [compact,setCompact]=useState(false);
 const [mobileOpen,setMobileOpen]=useState(false);
 const dense=usePlanner(s=>s.settings.compact);
 const goalsCount=usePlanner(s=>s.goals.length);
 const navigate=(next:Page)=>{
  setPage(next);
  setMobileOpen(false);
  window.scrollTo({top:0,behavior:'instant'});
 };
 useEffect(()=>{document.title=`${titles[page]} · YieldPilot`;},[page]);
 useEffect(()=>{
  const handler=(event:StorageEvent)=>{
   if(event.key===usePlanner.persist.getOptions().name)void usePlanner.persist.rehydrate();
  };
  window.addEventListener('storage',handler);
  return()=>window.removeEventListener('storage',handler);
 },[]);

 return <div className={`app-layout ${!dense?'density-relaxed':''} ${compact?'sidebar-small':''}`}>
  {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Закрыть меню"/>}
  <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
   <div className="brand">
    <div className="brand-identity">
     <span className="brand-mark"><ChartNoAxesCombined size={23}/></span>
     {!compact&&<span className="brand-text"><strong>Yield<span>Pilot</span></strong><small>TRADING · 2.2.0</small></span>}
    </div>
    <button type="button" className="sidebar-collapse" onClick={()=>setCompact(v=>!v)} title="Свернуть меню" aria-label={compact?'Развернуть меню':'Свернуть меню'}>{compact?<ChevronRight size={17}/>:<ChevronLeft size={17}/>}</button>
   </div>
   <nav aria-label="Разделы приложения">
    <div className="nav-group">
     {!compact&&<div className="nav-label">ТРЕЙДИНГ</div>}
     {NAV.map(item=><button key={item.key} type="button" className={`nav-link ${page===item.key?'active':''}`} onClick={()=>navigate(item.key)}><item.icon size={19}/>{!compact&&<span>{item.label}</span>}{!compact&&item.key==='goals'&&goalsCount>0&&<span className="nav-count">{goalsCount}</span>}</button>)}
    </div>
   </nav>
   <div className="sidebar-bottom">
    <div className="privacy-label"><LockKeyhole size={16}/>{!compact&&<span>Хранение в браузере</span>}</div>
    {!compact&&<small>Каждый браузер хранит собственные цели, результаты и дневник. Регистрация не требуется.</small>}
   </div>
  </aside>
  <div className="app-body">
   <header className="topbar">
    <div className="topbar-left"><button type="button" className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)} aria-label="Открыть меню"><Menu size={20}/></button><Activity size={18} className="breadcrumb-logo"/><span className="topbar-muted">YieldPilot</span><ChevronRight size={15} className="topbar-chevron"/><strong>{titles[page]}</strong></div>
    <div className="topbar-right"><span className="save-indicator"><ShieldCheck size={16}/> Сохранено в этом браузере</span><span className="offline-chip"><CloudOff size={15}/> LOCAL FIRST</span></div>
   </header>
   <main id="content" className="main-content">
    {page==='goals'&&<Goals/>}
    {page==='calendar'&&<Calendar/>}
    {page==='journal'&&<Journal/>}
   </main>
   <footer className="site-footer"><span>YieldPilot 2.2.0 · Торговый планировщик</span><span>Каждая цель — отдельный календарь и дневник</span></footer>
  </div>
 </div>;
}

export default function App(){return <NotifyProvider><AppContent/></NotifyProvider>}
