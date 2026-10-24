import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CircleHelp, RotateCcw, Settings2, Target, Wallet } from 'lucide-react';
import type { GoalConfig, PlanMode } from '../types';
import { fmtPercent, dailyRate, validateConfig } from '../lib/math';

interface Props {
  config: GoalConfig;
  onApply: (next: GoalConfig) => void;
  onResetResults: () => void;
  hasResults: boolean;
}

export function GoalForm({ config, onApply, onResetResults, hasResults }: Props) {
  const [startAmount, setStartAmount] = useState(String(config.startAmount));
  const [targetAmount, setTargetAmount] = useState(String(config.targetAmount));
  const [days, setDays] = useState(String(config.days));
  const [date, setDate] = useState(config.startDate);
  const [mode, setMode] = useState<PlanMode>(config.mode);
  const [error, setError] = useState('');

  useEffect(() => {
    setStartAmount(String(config.startAmount)); setTargetAmount(String(config.targetAmount));
    setDays(String(config.days)); setDate(config.startDate);
    setMode(config.mode); setError('');
  }, [config]);

  const nextConfig: GoalConfig = {
    startAmount: Number(startAmount.replace(',', '.')),
    targetAmount: Number(targetAmount.replace(',', '.')),
    days: Number(days), startDate: date, mode,
  };
  const quickRate = validateConfig(nextConfig) ? null : dailyRate(nextConfig.startAmount, nextConfig.targetAmount, nextConfig.days);

  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validateConfig(nextConfig);
    if (problem) { setError(problem); return; }
    setError('');
    onApply(nextConfig);
  }

  return <aside className="sidebar">
    <div className="sidebar-brand">
      <div className="brand-mark"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 20L9 14L13 17L23 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 6H23V12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
      <div><div className="brand-name">Yield<span>Pilot</span></div><div className="brand-desc">FINANCIAL GOAL PLANNER</div></div>
    </div>
    <div className="sidebar-separator" />
    <div className="settings-heading"><div className="section-icon"><Settings2 size={17}/></div><div><h2>Настройки цели</h2><p>Сформируйте свой план</p></div></div>
    <form className="settings-form" onSubmit={apply}>
      <label className="field"><span className="field-label"><Wallet size={15}/> Начальная сумма</span><div className="input-wrap"><input aria-label="Начальная сумма" type="number" min="0.01" max="1000000000000" step="any" value={startAmount} onChange={e=>setStartAmount(e.target.value)} /></div></label>
      <label className="field"><span className="field-label"><Target size={15}/> Целевая сумма</span><div className="input-wrap"><input aria-label="Целевая сумма" type="number" min="0.01" max="1000000000000" step="any" value={targetAmount} onChange={e=>setTargetAmount(e.target.value)} /></div></label>
      <label className="field"><span className="field-label"><CalendarDays size={15}/> Срок (дней)</span><div className="input-wrap"><input aria-label="Количество дней" type="number" min="1" max="730" step="1" value={days} onChange={e=>setDays(e.target.value)} /><span>дней</span></div></label>
      <label className="field"><span className="field-label"><CalendarDays size={15}/> Начало плана</span><div className="input-wrap"><input aria-label="Дата начала" type="date" value={date} onChange={e=>setDate(e.target.value)} /></div></label>
      <div className="mode-group"><span className="field-label"><RotateCcw size={15}/> Режим пересчёта</span><div className="mode-control" role="group" aria-label="Режим пересчёта"><button type="button" className={mode==='adaptive'?'selected':''} onClick={()=>setMode('adaptive')}>Адаптивный</button><button type="button" className={mode==='fixed'?'selected':''} onClick={()=>setMode('fixed')}>Фиксированный</button></div><p className="field-hint">{mode === 'adaptive' ? 'После результата дня цель на оставшиеся дни пересчитается.' : 'Дневные суммы остаются из первоначального плана.'}</p></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="primary-btn full">Рассчитать план <ArrowRight size={17}/></button>
      <div className="form-preview"><span>Расчётный рост за день</span><strong>{quickRate === null ? '—' : fmtPercent(quickRate, 4)}</strong></div>
    </form>
    <div className="sidebar-separator lower" />
    <div className="tip-card"><div className="tip-icon"><CircleHelp size={17}/></div><div><h3>Как работает план?</h3><p>Каждый день фиксируйте фактическую прибыль или убыток. Адаптивный план пересчитает необходимую доходность для оставшихся дней.</p></div></div>
    {hasResults && <button className="reset-inline" type="button" onClick={onResetResults}><RotateCcw size={15}/> Сбросить результаты дней</button>}
    <div className="sidebar-bottom"><span className="online-dot"/> Данные сохраняются в этом браузере <span className="version">v1.0.1</span></div>
  </aside>;
}
