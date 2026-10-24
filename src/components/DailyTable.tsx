import { useMemo, useState } from 'react';
import { Check, ChevronDown, ClipboardList, Pencil, Plus, Search } from 'lucide-react';
import type { PlanRow } from '../types';
import { dayLabel, fmtAmount, fmtPercent, signedAmount } from '../lib/math';

type Filter = 'all' | 'open' | 'done';
interface Props {
  rows: PlanRow[];
  completedDays: number;
  onRecord: (row: PlanRow) => void;
  onUndo: (row: PlanRow) => void;
  onLocked: () => void;
}

export function DailyTable({ rows, completedDays, onRecord, onUndo, onLocked }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => rows.filter(row => {
    if (filter === 'done' && !row.completed) return false;
    if (filter === 'open' && row.completed) return false;
    const q = query.trim().toLowerCase();
    return !q || `${row.day} ${dayLabel(row.date)} ${row.date} день ${row.day}`.toLowerCase().includes(q);
  }), [rows, filter, query]);
  const visible = showAll ? filtered : filtered.slice(0, 12);
  return <section className="panel table-panel" id="day-plan">
    <div className="table-heading"><div><div className="heading-eyebrow"><ClipboardList size={14}/> ЕЖЕДНЕВНЫЙ ТРЕКЕР</div><h2>План по дням <span className="count-pill">{rows.length}</span></h2><p>Отмечайте выполненные дни и вносите реальный финансовый результат</p></div><div className="table-heading-right"><span className="summary-check"><Check size={15}/> {completedDays} / {rows.length} завершено</span></div></div>
    <div className="table-controls"><div className="filter-tabs"><button className={filter==='all'?'on':''} onClick={()=>{setFilter('all');setShowAll(false)}}>Все дни</button><button className={filter==='open'?'on':''} onClick={()=>{setFilter('open');setShowAll(false)}}>Ожидают</button><button className={filter==='done'?'on':''} onClick={()=>{setFilter('done');setShowAll(false)}}>Выполнено</button></div><label className="search-box"><Search size={15}/><input aria-label="Поиск дня" placeholder="Найти день..." value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false)}}/></label></div>
    <div className="table-scroll"><table className="daily-table"><thead><tr><th>ДЕНЬ / ДАТА</th><th>БАЛАНС НА СТАРТЕ</th><th>ЦЕЛЬ НА ДЕНЬ</th><th>РОСТ</th><th>БАЛАНС ПО ПЛАНУ</th><th>ФАКТ + / −</th><th>СТАТУС</th><th className="check-cell">ГОТОВО</th></tr></thead><tbody>
      {visible.map(row => <tr key={row.day} className={`${row.completed?'row-complete':''} ${row.active?'row-current':''}`}>
        <td><div className="day-name">День {String(row.day).padStart(2,'0')}{row.active && <span className="today-tag">СЛЕДУЮЩИЙ</span>}</div><div className="day-date">{dayLabel(row.date)}</div></td>
        <td>{fmtAmount(row.openingBalance)}</td>
        <td className="profit-target">{row.targetProfit === null ? '—' : `+${fmtAmount(row.targetProfit)}`}</td>
        <td className="growth-cell">{fmtPercent(row.targetRate)}</td>
        <td className="strong-cell">{row.targetClose===null?'—':fmtAmount(row.targetClose)}</td>
        <td>{row.completed ? <button className={`actual-value ${row.actualProfit!<0?'negative':''}`} onClick={()=>onRecord(row)} title="Изменить результат"><span>{signedAmount(row.actualProfit!)}</span><Pencil size={12}/></button> : row.active ? <button className="record-link" onClick={()=>onRecord(row)}><Plus size={14}/> Внести факт</button> : <span className="muted-dash">—</span>}</td>
        <td>{row.completed ? <span className="status-pill complete"><Check size={12}/> Отработан</span> : row.active ? <span className="status-pill active"><span className="pulse-dot"/> В работе</span> : <span className="status-pill pending">Ожидает</span>}</td>
        <td className="check-cell"><button type="button" aria-label={`Отметить день ${row.day} ${row.completed?'незавершённым':'завершённым'}`} aria-pressed={row.completed} className={`completion-check ${row.completed?'checked':''} ${!row.active && !row.completed?'locked':''}`} onClick={()=>row.completed?onUndo(row):row.active?onRecord(row):onLocked()}>{row.completed && <Check size={15} strokeWidth={3}/>}</button></td>
      </tr>)}
      {visible.length===0 && <tr><td colSpan={8} className="empty-table">Дней по выбранному фильтру нет.</td></tr>}
    </tbody></table></div>
    {filtered.length>12 && <div className="table-footer"><span>Показано {visible.length} из {filtered.length} дней</span><button className="show-more" onClick={()=>setShowAll(x=>!x)}>{showAll?'Показать первые 12':'Показать все дни'} <ChevronDown size={16} className={showAll?'flipped':''}/></button></div>}
  </section>;
}
