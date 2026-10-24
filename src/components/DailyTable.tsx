import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardList, Pencil, Plus, Search } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => rows.filter(row => {
    if (filter === 'done' && !row.completed) return false;
    if (filter === 'open' && row.completed) return false;
    const q = query.trim().toLowerCase();
    return !q || `${row.day} ${dayLabel(row.date)} ${row.date} день ${row.day}`.toLowerCase().includes(q);
  }), [rows, filter, query]);
  // Keep all rows available while constraining the list itself to 12 visible days.
  // When the user finishes day 12, day 13 is scrolled into view automatically.
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || filter !== 'all' || query.trim()) return;
    const active = scroll.querySelector<HTMLTableRowElement>('tr.row-current');
    if (!active) return;
    const viewport = scroll.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    const headerHeight = scroll.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    if (row.bottom > viewport.bottom) scroll.scrollTop += row.bottom - viewport.bottom + 4;
    else if (row.top < viewport.top + headerHeight) scroll.scrollTop -= viewport.top + headerHeight - row.top + 4;
  }, [completedDays, filter, query, filtered]);
  return <section className="panel table-panel" id="day-plan">
    <div className="table-topbar"><div className="table-title"><span className="table-title-icon"><ClipboardList size={18}/></span><div><h2>План на каждый день <span className="count-pill">{rows.length}</span></h2><p>Завершено {completedDays} из {rows.length} · Отметьте день и укажите фактический результат</p></div></div>
      <div className="table-controls"><div className="filter-tabs"><button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>Все дни</button><button className={filter==='open'?'on':''} onClick={()=>setFilter('open')}>Ожидают</button><button className={filter==='done'?'on':''} onClick={()=>setFilter('done')}>Выполнено</button></div><label className="search-box"><Search size={15}/><input aria-label="Поиск дня" placeholder="Найти день..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div></div>
    <div className="table-scroll" ref={scrollRef} role="region" tabIndex={0} aria-label="План по дням, прокручиваемая таблица"><table className="daily-table"><thead><tr><th>ДЕНЬ / ДАТА</th><th>БАЛАНС НА СТАРТЕ</th><th>ЦЕЛЬ НА ДЕНЬ</th><th>РОСТ</th><th>БАЛАНС ПО ПЛАНУ</th><th>ФАКТ + / −</th><th>СТАТУС</th><th className="check-cell">ГОТОВО</th></tr></thead><tbody>
      {filtered.map(row => <tr key={row.day} className={`${row.completed?'row-complete':''} ${row.active?'row-current':''}`}>
        <td><div className="day-cell"><span className="day-name">День {String(row.day).padStart(2,'0')}</span><span className="day-date">{dayLabel(row.date)}</span>{row.active && <span className="today-tag">СЛЕДУЮЩИЙ</span>}</div></td>
        <td>{fmtAmount(row.openingBalance)}</td>
        <td className="profit-target">{row.targetProfit === null ? '—' : `+${fmtAmount(row.targetProfit)}`}</td>
        <td className="growth-cell">{fmtPercent(row.targetRate)}</td>
        <td className="strong-cell">{row.targetClose===null?'—':fmtAmount(row.targetClose)}</td>
        <td>{row.completed ? <button className={`actual-value ${row.actualProfit!<0?'negative':''}`} onClick={()=>onRecord(row)} title="Изменить результат"><span>{signedAmount(row.actualProfit!)}</span><Pencil size={12}/></button> : row.active ? <button className="record-link" onClick={()=>onRecord(row)}><Plus size={14}/> Внести факт</button> : <span className="muted-dash">—</span>}</td>
        <td>{row.completed ? <span className="status-pill complete"><Check size={12}/> Отработан</span> : row.active ? <span className="status-pill active"><span className="pulse-dot"/> В работе</span> : <span className="status-pill pending">Ожидает</span>}</td>
        <td className="check-cell"><button type="button" aria-label={`Отметить день ${row.day} ${row.completed?'незавершённым':'завершённым'}`} aria-pressed={row.completed} className={`completion-check ${row.completed?'checked':''} ${!row.active && !row.completed?'locked':''}`} onClick={()=>row.completed?onUndo(row):row.active?onRecord(row):onLocked()}>{row.completed && <Check size={15} strokeWidth={3}/>}</button></td>
      </tr>)}
      {filtered.length===0 && <tr><td colSpan={8} className="empty-table">Дней по выбранному фильтру нет.</td></tr>}
    </tbody></table></div>
  </section>;
}
