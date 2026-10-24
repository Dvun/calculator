import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, CircleAlert, Coins, X } from 'lucide-react';
import type { PlanRow } from '../types';
import { fmtAmount, moneyRound, signedAmount } from '../lib/math';

interface Props {
  row: PlanRow | null;
  onClose: () => void;
  onSave: (day: number, profit: number) => void;
}

export function ResultModal({ row, onClose, onSave }: Props) {
  const [profit, setProfit] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setProfit(row?.actualProfit === null || !row ? '' : String(row.actualProfit)); setError(''); }, [row]);
  useEffect(() => {
    if (!row) return;
    function onKeyDown(e: KeyboardEvent) { if (e.key==='Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [row, onClose]);
  if (!row) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profit.trim()) { setError('Укажите фактическую прибыль или убыток. Нулевой результат тоже допустим.'); return; }
    const n = Number(profit.replace(',', '.'));
    if (!Number.isFinite(n) || Math.abs(n)>1e12) { setError('Укажите корректную сумму.'); return; }
    if (row!.openingBalance + n < -0.005) { setError('Убыток не может превышать доступный баланс.'); return; }
    setError(''); onSave(row!.day, moneyRound(n));
  }

  return <div className="modal-overlay" onMouseDown={onClose} role="presentation"><div className="result-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div className="modal-icon"><Coins size={22}/></div><button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={20}/></button></div><h2 id="modal-title">{row.completed ? 'Изменить результат' : 'Завершить день'} <span>#{row.day}</span></h2><p className="modal-subtitle">Введите фактический результат дня. Можно указать прибыль, 0 или отрицательную сумму при убытке.</p>
  <div className="modal-breakdown"><div><span>Баланс в начале дня</span><strong>{fmtAmount(row.openingBalance)}</strong></div><div><span>Плановая прибыль</span><strong className="lime">{row.targetProfit===null?'—':signedAmount(row.targetProfit)}</strong></div></div>
  <form onSubmit={submit}><label className="field"><span className="field-label">Фактическая прибыль / убыток</span><div className="input-wrap modal-input"><input autoFocus type="number" step="any" placeholder="Например, 1250 или -500" value={profit} onChange={e=>setProfit(e.target.value)}/></div></label>
  {profit.trim()!=='' && Number.isFinite(Number(profit.replace(',','.'))) && <div className="balance-preview"><span>Баланс после дня</span><strong>{fmtAmount(row.openingBalance + Number(profit.replace(',','.')))}</strong></div>}
  {error && <p className="form-error" role="alert"><CircleAlert size={16}/>{error}</p>}
  {row.targetProfit !== null && <button type="button" className="plan-shortcut" onClick={()=>{setProfit(String(row.targetProfit));setError('');}}>Подставить прибыль по плану <ArrowRight size={15}/></button>}
  <button type="submit" className="primary-btn full"><Check size={18}/> {row.completed?'Сохранить результат':'Завершить и сохранить день'}</button></form>
  </div></div>;
}
