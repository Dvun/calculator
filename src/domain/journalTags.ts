/** Stable IDs for journal tags: labels may change without breaking saved Firestore data. */
export const JOURNAL_TAGS = [
 {id:'discipline',label:'Дисциплина',icon:'check'},
 {id:'fomo',label:'FOMO',icon:'zap'},
 {id:'good-entry',label:'Хороший вход',icon:'trending-up'},
 {id:'bad-entry',label:'Плохой вход',icon:'trending-down'},
 {id:'early-exit',label:'Ранний выход',icon:'arrow-left-right'},
 {id:'overtrading',label:'Переторговка',icon:'bar-chart'},
 {id:'followed-plan',label:'Следовал плану',icon:'file-check'},
 {id:'broke-plan',label:'Нарушил план',icon:'x'},
 {id:'emotions',label:'Эмоции',icon:'brain'},
 {id:'patience',label:'Терпение',icon:'hourglass'},
 {id:'risk-management',label:'Риск-менеджмент',icon:'shield'},
 {id:'position-size',label:'Объём позиции',icon:'layers'},
] as const;
export type JournalTagId = (typeof JOURNAL_TAGS)[number]['id'];
const supported = new Set<string>(JOURNAL_TAGS.map(tag=>tag.id));
export function normalizeJournalTags(value:unknown): JournalTagId[] {
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter((id):id is JournalTagId=>typeof id==='string'&&supported.has(id)))].slice(0,JOURNAL_TAGS.length);
}
export function journalTagLabel(id:string):string{return JOURNAL_TAGS.find(tag=>tag.id===id)?.label??id;}
