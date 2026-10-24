import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Activity, ArrowRight, BadgeCheck, CheckCircle2, ChevronRight,
  Download, FileUp, Flag, Info, Layers3, LockKeyhole,
  MoreHorizontal, ShieldCheck, Sparkles, Target, TrendingDown,
  TrendingUp, Wallet, X,
} from 'lucide-react';
import { GoalForm } from './components/GoalForm';
import { GrowthChart } from './components/GrowthChart';
import { DailyTable } from './components/DailyTable';
import { ResultModal } from './components/ResultModal';
import { buildPlan, fmtAmount, fmtPercent, signedAmount, moneyRound } from './lib/math';
import { loadState, parseState, saveState, STORAGE_KEY } from './lib/storage';
import type { GoalConfig, PersistedState, PlanRow } from './types';

function MetricCard({ label, value, hint, icon: Icon, accent = false, down = false }: {
  label: string; value: string; hint: string; icon: typeof Activity; accent?: boolean; down?: boolean;
}) {
  return <article className={`metric-card ${accent?'metric-accent':''}`}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18}/></span></div>
    <div className={`metric-value ${down?'text-negative':''}`}>{value}</div>
    <div className="metric-hint"><span className="metric-mini-dot"/>{hint}</div>
  </article>;
}

function saveBlob(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadState);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const plan = useMemo(() => buildPlan(state.config, state.results), [state]);
  const { startAmount, targetAmount, days, mode } = state.config;

  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { if (!saveState(state)) setStorageAvailable(false); }, [state]);
  // Synchronise multiple tabs belonging to the same visitor; other devices never share data.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const updated = parseState(JSON.parse(event.newValue));
        if (updated) setState(old => JSON.stringify(old) === JSON.stringify(updated) ? old : updated);
      } catch { /* Ignore malformed external writes. */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => () => { if (timeoutRef.current!==null) window.clearTimeout(timeoutRef.current); }, []);

  function inform(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    if (timeoutRef.current!==null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(()=>setToast(null), 4000);
  }

  function applyConfig(next: GoalConfig) {
    const old = state.config;
    if (JSON.stringify(next) === JSON.stringify(old)) { inform('Параметры уже актуальны.'); return; }
    const destructive = next.startAmount !== old.startAmount || next.targetAmount !== old.targetAmount || next.days !== old.days || next.startDate !== old.startDate;
    if (destructive && plan.completedDays && !window.confirm('Изменение суммы, срока или даты создаст новый план и удалит отметки выполненных дней. Продолжить?')) return;
    setState({ version: 1, config: next, results: destructive ? {} : state.results });
    inform(destructive ? 'Новый план рассчитан и сохранён.' : 'Режим пересчёта обновлён.');
  }

  function saveActual(day: number, profit: number) {
    const updated = { ...state.results, [day]: { profit: moneyRound(profit), recordedAt: new Date().toISOString() } };
    let bal = startAmount;
    for (let i=1; i<=days && updated[i]; i++) {
      bal = moneyRound(bal + updated[i].profit);
      if (bal < 0) { inform('Изменение привело к отрицательному балансу в одном из следующих дней.', 'error'); return; }
    }
    setState(s => ({ ...s, results: updated }));
    setEditing(null);
    inform(`День ${day} отработан · ${signedAmount(profit)}. Прогноз обновлён.`);
  }

  function undoDay(row: PlanRow) {
    if (row.day !== plan.completedDays) { inform('Чтобы снять более раннюю отметку, сначала снимите последние дни.', 'error'); return; }
    if (!window.confirm(`Снять отметку выполнения дня ${row.day} и удалить его результат?`)) return;
    setState(s => { const results = { ...s.results }; delete results[row.day]; return { ...s, results }; });
    inform(`День ${row.day} снова ожидает выполнения.`);
  }

  function resetResults() {
    if (!window.confirm('Удалить все фактические результаты? Параметры плана останутся без изменений.')) return;
    setState(s => ({ ...s, results: {} })); inform('Результаты сброшены. План начинается заново.');
  }

  function exportJson() {
    saveBlob('yieldpilot-backup.json', JSON.stringify(state, null, 2), 'application/json;charset=utf-8');
    setMenuOpen(false); inform('Резервная копия плана экспортирована.');
  }

  function exportCsv() {
    const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const lines = [
      ['День','Дата','Баланс на старте','Цель дня','Процент дня','Баланс по плану','Факт прибыль','Факт баланс','Завершён'],
      ...plan.rows.map(r => [r.day,r.date,r.openingBalance,r.targetProfit,r.targetRate===null?'':(r.targetRate*100).toFixed(6),r.targetClose,r.actualProfit,r.actualClose,r.completed?'Да':'Нет']),
    ];
    saveBlob('yieldpilot-plan.csv', '\uFEFF' + lines.map(row => row.map(escape).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    setMenuOpen(false); inform('Таблица плана экспортирована в CSV.');
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const incoming = parseState(JSON.parse(await file.text()));
      if (!incoming) { inform('Файл не похож на корректную резервную копию YieldPilot.', 'error'); return; }
      if (!window.confirm('Импорт заменит текущий план и результаты. Продолжить?')) return;
      setState(incoming); setEditing(null); setMenuOpen(false); inform('План и результаты восстановлены из файла.');
    } catch { inform('Не удалось прочитать JSON-файл.', 'error'); }
    finally { if (fileRef.current) fileRef.current.value=''; }
  }

  const positive = plan.actualProfit >= 0;
  const gainPct = ((targetAmount / startAmount) - 1) * 100;
  const forecastDifferent = mode==='fixed' && plan.remainingDays>0 && Math.abs((plan.planFinalBalance??0)-targetAmount)>0.009;
  const currentDay = plan.rows[plan.completedDays];

  return <div className="app-shell">
    <GoalForm config={state.config} onApply={applyConfig} onResetResults={resetResults} hasResults={plan.completedDays>0}/>
    <main className="dashboard">
      <header className="main-header"><div className="breadcrumb"><span className="breadcrumb-mark"><Layers3 size={15}/></span> ДАШБОРД <ChevronRight size={14}/><span>Обзор цели</span></div><div className="header-tools"><span className="local-label"><LockKeyhole size={13}/> {storageAvailable ? 'Сохранено в этом браузере' : 'Хранение браузером заблокировано'}</span><div className="menu-box"><button className="top-icon-button" aria-label="Меню экспорта и импорта" aria-expanded={menuOpen} onClick={()=>setMenuOpen(x=>!x)}><MoreHorizontal size={21}/></button>{menuOpen && <div className="popup-menu"><button onClick={exportJson}><Download size={15}/> Экспорт JSON</button><button onClick={exportCsv}><Download size={15}/> Скачать таблицу CSV</button><button onClick={()=>{fileRef.current?.click();setMenuOpen(false);}}><FileUp size={15}/> Импорт JSON</button></div>}</div><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>void importJson(e.target.files?.[0])}/><div className="header-avatar">YP</div></div></header>

      <div className="dashboard-inner">
        <div className="welcome"><div><div className="welcome-overline"><span className="green-dot"/> FINANCIAL GROWTH TRACKER <span className="tiny-sep">/</span> ПЛАНИРОВАНИЕ</div><h1>Ваш путь к <span>финансовой цели<span className="headline-period">.</span></span></h1><p>Установите цель, следуйте плану и отслеживайте каждый шаг.</p></div><div className="welcome-decoration"><div className="outer-glow"><Target size={29}/></div></div></div>

        <section className="goal-strip"><div className="goal-data"><div className="strip-title"><Flag size={15}/> АКТИВНАЯ ЦЕЛЬ <span className="active-tag"><span/> АКТИВЕН</span></div><div className="goal-equation"><strong>{fmtAmount(startAmount,0)}</strong><ArrowRight size={20}/><strong className="goal-sum">{fmtAmount(targetAmount,0)}</strong></div><div className="strip-caption">Рост капитала на <span>+{new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(gainPct)}%</span> за {days} дней <span className="separator-dot">•</span> {mode==='adaptive'?'Адаптивный план':'Фиксированный план'}</div></div><div className="goal-strip-decoration"><svg width="216" height="78" viewBox="0 0 216 78" fill="none"><path d="M0 69L25 62L48 65L77 49L98 53L126 31L149 36L170 16L194 26L216 4" stroke="#00db83" strokeWidth="2"/><path d="M0 69L25 62L48 65L77 49L98 53L126 31L149 36L170 16L194 26L216 4V78H0V69Z" fill="url(#slope)"/><defs><linearGradient id="slope" x1="108" y1="4" x2="108" y2="78"><stop stopColor="#00db83" stopOpacity=".25"/><stop offset="1" stopColor="#00db83" stopOpacity="0"/></linearGradient></defs></svg></div></section>

        <div className="metric-grid">
          <MetricCard label="ТРЕБУЕТСЯ В ДЕНЬ" value={fmtPercent(plan.requiredRate,4)} hint={plan.remainingDays ? `Для достижения цели за ${plan.remainingDays} дн.` : 'Плановый срок завершён'} icon={TrendingUp} accent />
          <MetricCard label="ЦЕЛЬ СЛЕДУЮЩЕГО ДНЯ" value={plan.nextProfit===null?'Недоступно':fmtAmount(plan.nextProfit)} hint={plan.remainingDays ? `День ${plan.completedDays+1} · ${mode==='adaptive'?'пересчитывается':'по исходному плану'}`:'Все дни завершены'} icon={Target}/>
          <MetricCard label="ФАКТИЧЕСКАЯ ПРИБЫЛЬ" value={signedAmount(plan.actualProfit)} hint={`${plan.completedDays} из ${days} дней отработано`} icon={positive?Wallet:TrendingDown} down={!positive}/>
          <MetricCard label="ОСТАЛОСЬ ДО ЦЕЛИ" value={fmtAmount(plan.remainingProfit)} hint={plan.goalReached?'Цель достигнута!':'Сумма, которую ещё нужно заработать'} icon={Flag}/>
        </div>

        <div className="analysis-grid">
          <GrowthChart plan={plan} startAmount={startAmount}/>
          <section className="panel progress-panel"><div className="panel-heading"><div><div className="heading-eyebrow"><Target size={14}/> СТАТУС ЦЕЛИ</div><h2>Прогресс к цели</h2></div><span className="head-icon"><Activity size={19}/></span></div><div className="ring-zone"><div className="progress-ring" style={{'--progress': `${plan.progress * 100}%`} as CSSProperties}><div className="ring-inner"><strong>{Math.round(plan.progress*100)}<small>%</small></strong><span>от цели</span></div></div><div className="ring-caption">{plan.goalReached ? <span className="ring-result"><BadgeCheck size={15}/> Цель достигнута</span> : <span className="ring-result"><span className="pulse-dot"/> Двигаемся к цели</span>}</div></div><div className="progress-divider"/><div className="balance-summary"><div><span>Текущий баланс</span><strong>{fmtAmount(plan.currentBalance)}</strong></div><div><span>Целевой баланс</span><strong>{fmtAmount(targetAmount)}</strong></div><div><span>Дней осталось</span><strong>{plan.remainingDays} <span>дн.</span></strong></div><div><span>Прогноз на финише</span><strong className={forecastDifferent?'warning-color':''}>{plan.planFinalBalance===null?'Недоступен':fmtAmount(plan.planFinalBalance)}</strong></div></div><div className="days-bar"><div className="days-label"><span>Выполнено дней</span><strong>{plan.completedDays}<span> / {days}</span></strong></div><div className="days-track"><span style={{ width: `${plan.completedDays / days * 100}%` }}/></div></div></section>
        </div>

        <div className="insight-strip"><div className="insight-leading"><div className="insight-illustration"><Sparkles size={19}/></div><div><strong>{plan.goalReached?'Цель достигнута раньше срока':!plan.viable?'План невозможно продолжить с нулевым балансом':plan.remainingDays===0?'Срок плана завершён — цель не достигнута':plan.completedDays===0?'План готов. Время действовать!':plan.requiredRate!==null&&plan.requiredRate>plan.baseRate?'Доходность на оставшиеся дни увеличилась':'План автоматически адаптирован'}</strong><p>{plan.goalReached?'Плановая цель выполнена. Вы можете продолжить фиксировать результаты.':!plan.viable?'Для расчёта сложного процента требуется положительный баланс. Пересмотрите параметры.':plan.remainingDays===0?`Фактический баланс: ${fmtAmount(plan.currentBalance)}. До цели не хватило ${fmtAmount(plan.remainingProfit)}. Чтобы продолжить, создайте новый план.`:plan.completedDays===0?'Зафиксируйте результат первого дня — следующие расчёты обновятся автоматически.':`До цели осталось ${fmtAmount(plan.remainingProfit)}. Требуемая доходность: ${fmtPercent(plan.requiredRate,4)} в день.`}</p></div></div>{currentDay && <button className="insight-action" onClick={()=>setEditing(currentDay)}>Внести результат <ArrowRight size={17}/></button>}</div>

        <DailyTable rows={plan.rows} completedDays={plan.completedDays} onRecord={setEditing} onUndo={undoDay} onLocked={()=>inform('Дни отмечаются последовательно. Сначала завершите текущий день.', 'error')}/>
        <footer className="dashboard-footer"><span><ShieldCheck size={15}/> {storageAvailable ? 'Результаты автоматически сохраняются на этом устройстве' : 'Внимание: браузер не сохраняет результаты. Экспортируйте JSON!'}</span><span><Info size={15}/> Расчётная доходность не является гарантией прибыли</span><span className="foot-credit">YieldPilot <span>© 2026</span></span></footer>
      </div>
    </main>
    <ResultModal row={editing} onClose={()=>setEditing(null)} onSave={saveActual}/>
    {toast && <div className={`toast ${toast.type==='error'?'toast-error':''}`} role="status">{toast.type==='error'?<X size={18}/>:<CheckCircle2 size={18}/>}<span>{toast.message}</span><button aria-label="Закрыть уведомление" onClick={()=>setToast(null)}><X size={15}/></button></div>}
  </div>;
}
