import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';
import type { PlanSummary } from '../types';
import { fmtAmount } from '../lib/math';

interface Props { plan: PlanSummary; startAmount: number; }

function shortNumber(value: number): string {
  return fmtAmount(value, 0);
}

export function GrowthChart({ plan, startAmount }: Props) {
  const data = [
    { day: 0, baseline: startAmount, projection: startAmount, actual: startAmount },
    ...plan.rows.map(row => ({ day: row.day, baseline: row.baselineClose, projection: row.completed ? row.actualClose : row.targetClose, actual: row.completed ? row.actualClose : null })),
  ];
  return <section className="panel chart-panel">
    <div className="panel-heading"><div><div className="heading-eyebrow"><Activity size={14}/> ПРОГНОЗ КАПИТАЛА</div><h2>Динамика достижения цели</h2><p>Сравнение первоначального плана, факта и нового прогноза</p></div><span className="head-icon"><TrendingUp size={19}/></span></div>
    <div className="chart-legend"><span><i className="legend-key projection"/> Факт + прогноз</span><span><i className="legend-key baseline"/> Исходный план</span><span><i className="legend-key actual"/> Фактический баланс</span></div>
    <div className="chart-holder">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 9, bottom: 5, left: 0 }}>
          <defs><linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ce88b" stopOpacity={0.26}/><stop offset="96%" stopColor="#0ce88b" stopOpacity={0.005}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#25333c" strokeDasharray="4 6" opacity={0.7}/>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6f8490', fontSize: 11 }} minTickGap={25} tickFormatter={(v:number)=>`${v} дн.`}/>
          <YAxis width={61} domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#6f8490', fontSize: 11 }} tickFormatter={shortNumber}/>
          <Tooltip cursor={{ stroke: '#395b58', strokeDasharray: '3 5' }} contentStyle={{ background: '#111d24', border: '1px solid #2d484a', borderRadius: 12, color: '#dbe9ea' }} labelFormatter={(v)=>`День ${v}`} formatter={(value, name) => [fmtAmount(Number(value)), name === 'projection' ? 'Факт + прогноз' : name === 'baseline' ? 'Исходный план' : 'Фактический баланс']}/>
          <Area connectNulls={false} type="monotone" dataKey="projection" stroke="#0ce88b" strokeWidth={2.7} fill="url(#projectionFill)" dot={false} activeDot={{ r: 5, stroke: '#07130e', strokeWidth: 3 }} />
          <Line type="monotone" dataKey="baseline" stroke="#7895a1" strokeWidth={1.5} strokeDasharray="5 5" dot={false}/>
          <Line type="monotone" dataKey="actual" stroke="#4ad0ff" strokeWidth={2.7} dot={false} connectNulls={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
