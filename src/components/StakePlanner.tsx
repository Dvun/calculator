import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Calculator,ChevronDown,ChevronUp,Info,LockKeyhole,RotateCcw,ShieldAlert} from 'lucide-react';
import type {Goal,GoalPlan,StakeConfig} from '../domain/types';
import {num,pct} from '../domain/finance';
import {DEFAULT_STAKE_CONFIG,ceilStake,evaluateStakePlan,normalizeStakeConfig} from '../domain/stakes';
import {usePlanner} from '../state/store';
import {Pill,Section} from './UI';

function NumberSetting({label,value,commit,min,max,hint}:{label:string;value:number;commit:(n:number)=>void;min:number;max:number;hint?:string}){
 const [draft,setDraft]=useState(String(value));
 useEffect(()=>setDraft(String(value)),[value]);
 const save=()=>{const n=Number(draft.trim().replace(',','.'));if(draft.trim()!==''&&Number.isFinite(n)&&n>=min&&n<=max){commit(n);}else setDraft(String(value));};
 return <label className="stake-field"><span>{label}</span><input inputMode="decimal" type="text" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/>{hint&&<small>{hint}</small>}</label>;
}

export function StakePlanner({goal,plan,variant='full'}:{goal:Goal;plan:GoalPlan;variant?:'full'|'sidebar'}){
 const sidebar=variant==='sidebar';
 const update=usePlanner(s=>s.updateStakeConfig);
 const config=useMemo(()=>normalizeStakeConfig(goal.stakeConfig),[goal.stakeConfig]);
 const [details,setDetails]=useState(false);
 const currentTarget=Math.max(0,plan.nextProfit??0);
 const result=useMemo(()=>evaluateStakePlan({balance:plan.currentBalance,startAmount:goal.startAmount,dailyTarget:currentTarget,baseDailyTarget:0,config}),[config,plan.currentBalance,goal.startAmount,currentTarget]);
 const patch=(v:Partial<StakeConfig>)=>update(goal.id,v);
 const switchMode=(mode:'auto'|'manual')=>{
  if(mode==='manual'&&config.mode==='auto')patch({mode,manualFirstStake:Math.max(config.minStake,result.firstStake??config.minStake),manualOverrides:{}});
  else patch({mode});
 };
 const updateRow=(i:number,value:number)=>patch({manualOverrides:{...config.manualOverrides,[i]:ceilStake(value,config.stakeStep)}});
 const resetRow=(i:number)=>{const v={...config.manualOverrides};delete v[i];patch({manualOverrides:v});};
 const toggle=<button type="button" className="stake-collapse" aria-expanded={!config.collapsed} aria-controls={`stake-body-${goal.id}`} onClick={()=>patch({collapsed:!config.collapsed})}>{config.collapsed?<ChevronDown size={16}/>:<ChevronUp size={16}/>} {config.collapsed?'Развернуть':'Свернуть'}</button>;
 return <Section className={`stake-planner ${sidebar?'stake-planner-sidebar':''} ${config.collapsed?'stake-collapsed':''}`} title="Калькулятор ставок и риска" subtitle={sidebar?undefined:"Расчёт для текущего депозита и дневной цели. Настройки сохраняются для этой цели."} action={<div className="stake-header-actions">{!sidebar&&<Pill tone={result.feasible?'green':'red'}>{result.feasible?'В пределах лимита':'Риск превышен'}</Pill>}{toggle}</div>}>
  {config.collapsed?(sidebar?null:<div className="stake-compact-line"><span>Баланс: <b>{num(plan.currentBalance)}</b></span><span>Первая ставка: <b>{result.firstStake===null?'Недоступна':num(result.firstStake)}</b></span><span>Попыток: <b>{config.attempts}</b></span><span>Риск серии: <b>{num(result.totalLossPercent,2)}%</b></span><span>WIN для цели: <b>{result.feasible?result.winsNeeded:'—'}</b></span></div>):<div id={`stake-body-${goal.id}`}>
   <div className="stake-head"><div className="stake-modes" role="group" aria-label="Режим расчёта"><button type="button" className={config.mode==='auto'?'active':''} onClick={()=>switchMode('auto')}>Автоматически</button><button type="button" className={config.mode==='manual'?'active':''} onClick={()=>switchMode('manual')}>Вручную</button></div>{!sidebar&&<span className="stake-caption"><LockKeyhole size={13}/> Настройки только для «{goal.name}»</span>}</div>
   <div className="stake-input-grid">
    <NumberSetting label="Выплата, %" value={config.payout} min={1} max={100} commit={payout=>patch({payout})}/>
    <NumberSetting label="Попыток в серии" value={config.attempts} min={1} max={10} commit={attempts=>patch({attempts:Math.floor(attempts)})}/>
    <NumberSetting label="Множитель после LOSS" value={config.multiplier} min={1} max={4} commit={multiplier=>patch({multiplier})}/>
    <NumberSetting label="Максимальная потеря за день, %" value={config.riskPercent} min={0.1} max={20} commit={riskPercent=>patch({riskPercent})} hint="Одна полная серия не должна превышать этот предел"/>
   </div>
   {!sidebar&&<div className="stake-head stake-advanced-trigger"><button type="button" className="link-btn" onClick={()=>setDetails(v=>!v)}>{details?'Скрыть':'Показать'} дополнительные параметры</button><button type="button" className="link-btn" onClick={()=>patch({...DEFAULT_STAKE_CONFIG,collapsed:config.collapsed,manualOverrides:{}})}><RotateCcw size={14}/> Сбросить настройки</button></div>}
   {details&&!sidebar&&<div className="stake-input-grid stake-input-grid-small">
    <NumberSetting label="Минимальная ставка" value={config.minStake} min={1} max={1e8} commit={minStake=>patch({minStake})}/>
    <label className="stake-field"><span>Шаг округления</span><select value={config.stakeStep} onChange={e=>patch({stakeStep:Number(e.target.value)})}><option value={0.01}>0,01</option><option value={0.1}>0,10</option><option value={1}>1,00</option></select></label>
    <NumberSetting label="Нижняя доля входа, %" value={config.autoMinEntryPercent} min={0.05} max={2} commit={autoMinEntryPercent=>patch({autoMinEntryPercent})}/>
    <NumberSetting label="Верхняя доля входа, %" value={config.autoMaxEntryPercent} min={0.05} max={5} commit={autoMaxEntryPercent=>patch({autoMaxEntryPercent})}/>
   </div>}
   {!sidebar&&<div className="stake-explain">Авто: первая ставка от <strong>{num(config.autoMinEntryPercent,2)}% до {num(config.autoMaxEntryPercent,2)}%</strong> баланса. При росте капитала доля снижается, но ставка может увеличиваться в абсолютной сумме. Если полная серия не укладывается в дневной лимит {num(config.riskPercent,2)}%, ставка дополнительно уменьшается. Минимум — <strong>{num(config.minStake)}</strong>.</div>}
   <div className="stake-summary">
    <div><small>Текущий депозит</small><strong>{num(plan.currentBalance)}</strong></div>
    <div><small>Дневная цель</small><strong>{num(currentTarget)}</strong></div>
    <div><small>Стартовая ставка</small><strong className={result.firstStake===null?'negative':''}>{result.firstStake===null?'Недоступна':num(result.firstStake)}</strong></div>
    <div><small>Убыток всей серии</small><strong className="negative">−{num(result.worstLoss)}</strong></div>
    <div><small>Риск от депозита</small><strong className={!result.feasible?'negative':'positive'}>{num(result.totalLossPercent,2)}%</strong></div>
    <div><small>Нужно WIN с первой попытки*</small><strong>{result.feasible?result.winsNeeded:'—'}</strong></div>
   </div>
   {!sidebar&&<div className="stake-risk-strip"><ShieldAlert size={17}/><span>Дневной лимит потери: <b>{num(result.riskBudget)}</b> · Расчётная доля первой ставки: <b>{num(result.autoTargetPercent,2)}%</b> · По доле: <b>{num(result.autoTargetStake)}</b> · Максимум первой ставки с учётом серии: <b>{result.maxFit===null?'Недоступен':num(result.maxFit)}</b></span></div>}
   {config.mode==='manual'&&<div className="stake-manual"><NumberSetting label="Первая ставка (ручная)" value={config.manualFirstStake} min={config.minStake} max={1e10} commit={manualFirstStake=>patch({manualFirstStake:ceilStake(manualFirstStake,config.stakeStep)})}/><span>Следующие ставки растут по множителю. Отдельную ступень можно изменить в таблице. Превышение лимита будет показано, но не скрыто.</span></div>}
   <div className="stake-table-scroll"><table className="stake-table"><thead><tr><th>ПОПЫТКА</th><th>СТАВКА</th><th>УБЫТОК ДО</th><th>ЧИСТЫЙ WIN</th><th>УБЫТОК ПРИ LOSS</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.attempt}><td><b>№ {row.attempt}</b></td><td>{config.mode==='manual'?<div className="stake-manual-cell"><NumberSetting label={`Ставка № ${row.attempt}`} value={row.attempt===1?config.manualFirstStake:config.manualOverrides[row.attempt]??row.bet} min={config.minStake} max={1e10} commit={v=>row.attempt===1?patch({manualFirstStake:ceilStake(v,config.stakeStep)}):updateRow(row.attempt,v)}/>{config.manualOverrides[row.attempt]!==undefined&&<button type="button" onClick={()=>resetRow(row.attempt)} title="Вернуть множитель"><RotateCcw size={13}/></button>}</div>:num(row.bet)}</td><td className="muted">{num(row.lossBefore)}</td><td className={row.netIfWin>0?'positive':'negative'}>{row.netIfWin>0?'+':''}{num(row.netIfWin)}</td><td className="negative">−{num(row.totalLossIfLose)}</td></tr>)}</tbody></table></div>
   {sidebar&&<>
    <div className={`stake-sidebar-alert ${result.feasible?'ok':'danger'}`} role="status">
     {result.feasible?<ShieldAlert size={15}/>:<AlertTriangle size={15}/>}
     <span>{result.feasible?'Риск серии: ':'Риск превышен: '}<b>{num(result.totalLossPercent,2)}%</b> (лимит {num(config.riskPercent,2)}%)</span>
    </div>
    <details className="stake-sidebar-extra">
     <summary>Дополнительные параметры и пояснения</summary>
     <div className="stake-input-grid stake-input-grid-small">
      <NumberSetting label="Минимальная ставка" value={config.minStake} min={1} max={1e8} commit={minStake=>patch({minStake})}/>
      <label className="stake-field"><span>Шаг ставки</span><select value={config.stakeStep} onChange={e=>patch({stakeStep:Number(e.target.value)})}><option value={0.01}>0,01</option><option value={0.1}>0,10</option><option value={1}>1,00</option></select></label>
      <NumberSetting label="Нижняя доля входа, %" value={config.autoMinEntryPercent} min={0.05} max={2} commit={autoMinEntryPercent=>patch({autoMinEntryPercent})}/>
      <NumberSetting label="Верхняя доля входа, %" value={config.autoMaxEntryPercent} min={0.05} max={5} commit={autoMaxEntryPercent=>patch({autoMaxEntryPercent})}/>
     </div>
     <p>Автоподбор: {num(config.autoMinEntryPercent,2)}–{num(config.autoMaxEntryPercent,2)}% баланса, минимум {num(config.minStake)}. Лимит применяется к одной полной серии, а не ко всем сериям за день.</p>
     <p>Математическая оценка не гарантирует прибыль. При выплате {num(config.payout,2)}% безубыточный Win Rate фиксированной ставки выше {pct(1/(1+config.payout/100),2)}.</p>
     {result.warnings.map((warning,i)=><p key={i} className="stake-extra-warning">{warning}</p>)}
     <button type="button" className="link-btn stake-sidebar-reset" onClick={()=>patch({...DEFAULT_STAKE_CONFIG,collapsed:config.collapsed,manualOverrides:{}})}><RotateCcw size={13}/> Сбросить настройки</button>
    </details>
   </>}
   {!sidebar&&result.feasible&&currentTarget>0&&<div className="stake-scenarios"><div><small>Победы на первой попытке</small><strong>{result.winsNeeded} WIN / {result.winsNeeded} сделок</strong></div><div><small>Успешные серии только на последней попытке</small><strong>{result.lastStepWinsNeeded===null?'Не окупается':`${result.lastStepWinsNeeded} WIN / ${result.lastStepTradesNeeded} сделок`}</strong></div><div><small>После одной полностью проигранной серии</small><strong>{result.winsToRecoverFullLoss} WIN с первой попытки для выхода к цели</strong></div></div>}
   {!sidebar&&result.warnings.length>0&&<div className="stake-warnings" role="status">{result.warnings.map((w,i)=><p key={i}><AlertTriangle size={15}/>{w}</p>)}</div>}
   {!sidebar&&<div className="stake-footer"><Info size={16}/><span>*Число WIN рассчитано математически для указанных сценариев и не является прогнозом. Между ними могут быть убытки; тогда потребуется больше успешных сделок. Дневной лимит учитывается для <strong>одной серии</strong>; несколько проигранных серий могут превысить его без отдельного журнала сделок. При выплате {num(config.payout,2)}% безубыточный Win Rate фиксированной ставки — более {pct(1/(1+config.payout/100),2)}. Увеличение ставки после LOSS не улучшает математическое ожидание стратегии.</span></div>}
   {!sidebar&&!result.feasible&&<p className="stake-unavailable"><Calculator size={15}/> Выбранные параметры не помещаются в риск. Нельзя достичь цели за счёт скрытого повышения лимита.</p>}
  </div>}
 </Section>;
}
