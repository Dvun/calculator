import {Blocks,Cloud,LineChart,LockKeyhole,Shield,Webhook} from 'lucide-react';
import {PageHeading,Pill,Section} from '../components/UI';
const roadmap=[
 {icon:LineChart,name:'TradingView',subtitle:'Рыночные графики и инструменты',description:'Будущий отдельный модуль графиков, символов и технических индикаторов. Сейчас реальные котировки и сигналы не подключены.'},
 {icon:Webhook,name:'Интеграции с брокерами',subtitle:'Импорт торговой истории',description:'Возможный будущий адаптер для импорта закрытых сделок и результатов по дням. Клиентские секреты не храним в браузере.'},
 {icon:LockKeyhole,name:'Полноценная авторизация',subtitle:'Серверная проверка доступа',description:'В будущем можно добавить отдельный backend и защищённые сессии. Сейчас входа в приложение нет.'},
 {icon:Cloud,name:'Синхронизация',subtitle:'Общий профиль на нескольких устройствах',description:'Потребует серверной базы данных, прав доступа и безопасного переноса существующих локальных записей.'},
];
export default function Integrations(){return <><PageHeading eyebrow="БУДУЩИЕ ПОДКЛЮЧЕНИЯ" title="Интеграции" description="Точки расширения именно торгового планировщика."/><div className="integration-grid">{roadmap.map(({icon:Icon,name,subtitle,description})=><Section key={name}><div className="integration-card"><div className="integration-card-head"><div className="integration-icon"><Icon size={21}/></div><Pill tone="amber">Запланировано</Pill></div><h3>{name}</h3><strong>{subtitle}</strong><p>{description}</p></div></Section>)}</div><div className="note-block inline-icon"><Shield size={18}/> Интеграции не активированы: YieldPilot не получает торговые котировки и не отправляет результаты третьим лицам.</div><div className="architecture-line"><Blocks size={16}/> Торговая модель → Zustand → страницы → будущие адаптеры/API</div></>;
}
