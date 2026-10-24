import {useState,type SyntheticEvent} from 'react';
import {createUserWithEmailAndPassword,sendPasswordResetEmail,setPersistence,browserLocalPersistence,signInWithEmailAndPassword} from 'firebase/auth';
import {ArrowRight,Eye,EyeOff,LockKeyhole,Mail,ShieldCheck,TrendingUp,UserPlus} from 'lucide-react';
import {firebaseAuth} from '../services/firebase';

const messages:Record<string,string>={
 'auth/email-already-in-use':'Этот email уже зарегистрирован.',
 'auth/invalid-email':'Некорректный email.',
 'auth/invalid-credential':'Неверный email или пароль.',
 'auth/weak-password':'Пароль слишком слабый.',
 'auth/too-many-requests':'Слишком много попыток. Попробуйте позднее.',
 'auth/operation-not-allowed':'В Firebase Console необходимо включить Email/Password.',
 'auth/network-request-failed':'Нет подключения к Firebase. Проверьте интернет.',
 'auth/unauthorized-domain':'Добавьте домен сайта в Firebase Authentication → Authorized domains.',
};
const describe=(err:unknown)=>{const code=typeof err==='object'&&err!==null&&'code'in err?String(err.code):'';return messages[code]??(err instanceof Error?err.message:'Не удалось выполнить операцию.');};
export function AuthGate(){
 const [mode,setMode]=useState<'signin'|'signup'>('signin');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [repeat,setRepeat]=useState('');
 const [visible,setVisible]=useState(false);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');
 const submit=async(e:SyntheticEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');setInfo('');
  if(!firebaseAuth){setError('Firebase не настроен.');return;}
  if(mode==='signup'&&password.length<8){setError('Для регистрации используйте пароль не короче 8 символов.');return;}
  if(mode==='signup'&&password!==repeat){setError('Пароли не совпадают.');return;}
  setWorking(true);
  try{
   await setPersistence(firebaseAuth,browserLocalPersistence);
   if(mode==='signup')await createUserWithEmailAndPassword(firebaseAuth,email.trim(),password);
   else await signInWithEmailAndPassword(firebaseAuth,email.trim(),password);
  }catch(err){setError(describe(err));}finally{setWorking(false);}
 };
 const reset=async()=>{
  if(!email.trim()){setError('Введите email, на который отправить ссылку восстановления.');return;}
  if(!firebaseAuth)return;
  setWorking(true);setError('');setInfo('');
  try{await sendPasswordResetEmail(firebaseAuth,email.trim());setInfo('Если аккаунт существует, на почту будет отправлена ссылка для восстановления.');}
  catch(err){setError(describe(err));}finally{setWorking(false);}
 };
 return <main className="auth-layout"><div className="auth-card">
  <div className="auth-brand"><span className="auth-brand-icon"><TrendingUp size={27}/></span><div><h1>Yield<span>Pilot</span></h1><p>TRADING PLANNER · CLOUD</p></div></div>
  <div className="auth-heading"><LockKeyhole size={21}/><div><h2>{mode==='signup'?'Создать аккаунт':'Войти в аккаунт'}</h2><p>Торговые цели, результаты и дневник будут доступны на всех ваших устройствах.</p></div></div>
  <form onSubmit={e=>void submit(e)} className="auth-form">
   <label htmlFor="auth-email">Email (логин)</label><div className="auth-input"><Mail size={17}/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
   <label htmlFor="auth-password">Пароль</label><div className="auth-input"><LockKeyhole size={17}/><input id="auth-password" type={visible?'text':'password'} minLength={mode==='signup'?8:undefined} autoComplete={mode==='signup'?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Введите пароль"/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Скрыть пароль':'Показать пароль'}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
   {mode==='signup'&&<><label htmlFor="auth-confirm">Подтверждение пароля</label><div className="auth-input"><ShieldCheck size={17}/><input id="auth-confirm" type={visible?'text':'password'} autoComplete="new-password" required value={repeat} onChange={e=>setRepeat(e.target.value)} placeholder="Повторите пароль"/></div></>}
   {error&&<p role="alert" className="auth-error">{error}</p>}{info&&<p role="status" className="auth-info">{info}</p>}
   <button type="submit" className="auth-submit" disabled={working}>{working?'Подключение…':mode==='signup'?'Зарегистрироваться':'Войти'} {mode==='signup'?<UserPlus size={17}/>:<ArrowRight size={17}/>}</button>
  </form>
  {mode==='signin'&&<button type="button" className="auth-link" disabled={working} onClick={()=>void reset()}>Забыли пароль?</button>}
  <div className="auth-switch">{mode==='signin'?'Нет аккаунта?':'Уже зарегистрированы?'} <button type="button" disabled={working} onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setInfo('');setPassword('');setRepeat('');}}>{mode==='signin'?'Создать аккаунт':'Войти'}</button></div>
  <p className="auth-privacy"><ShieldCheck size={15}/> Доступ к данным ограничен вашим аккаунтом правилами Firebase.</p>
 </div></main>;
}
