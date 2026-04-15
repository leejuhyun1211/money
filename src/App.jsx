import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { supabase } from './supabase';

const C = ['#7C3AED','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#0EA5E9'];
const f = n => (n ?? 0).toLocaleString('ko-KR');
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const MONTHS = Array.from({length:12}, (_,i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 6 + i);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
});
const mLabel = m => m.replace('-', '년 ') + '월';

const PAYMENT_METHODS = ['현금','신용카드','체크카드','계좌이체','기타'];
const EXPENSE_CATS = ['주거/관리비','식비','교통비','통신비','의류/미용','의료/건강','문화/여가','교육','저축','기타'];
const INCOME_CATS  = ['월급','상여금','부수입','금융수익','환급','기타'];

const SEED_BUDGET = [
  { type:'income', cat:'월급',budget:3500000,actual:3500000 },{ type:'income', cat:'상여금',budget:500000,actual:300000 },
  { type:'income', cat:'부수입',budget:80000,actual:30000 },{ type:'income', cat:'금융수익',budget:50000,actual:30000 },
  { type:'income', cat:'환급',budget:30000,actual:0 },{ type:'expense',cat:'주거/관리비',budget:800000,actual:815000 },
  { type:'expense',cat:'식비',budget:500000,actual:612000 },{ type:'expense',cat:'교통비',budget:120000,actual:98000 },
  { type:'expense',cat:'통신비',budget:100000,actual:95000 },{ type:'expense',cat:'의류/미용',budget:200000,actual:180000 },
  { type:'expense',cat:'의료/건강',budget:100000,actual:45000 },{ type:'expense',cat:'문화/여가',budget:150000,actual:210000 },
  { type:'expense',cat:'교육',budget:300000,actual:280000 },{ type:'expense',cat:'저축',budget:500000,actual:500000 },
  { type:'expense',cat:'기타',budget:200000,actual:153000 },
];
const SEED_GOALS = [
  { name:'비상금',target:5000000,saved:2000000,monthly:300000,color:'#EF4444' },
  { name:'여행 자금',target:3500000,saved:300000,monthly:300000,color:'#F97316' },
  { name:'가전 교체',target:3000000,saved:150000,monthly:150000,color:'#EAB308' },
  { name:'자동차 정비',target:1000000,saved:30000,monthly:100000,color:'#22C55E' },
  { name:'반려동물 비상금',target:2800000,saved:90000,monthly:100000,color:'#3B82F6' },
  { name:'자기계발',target:800000,saved:20000,monthly:50000,color:'#8B5CF6' },
];
const SEED_ENTRIES = [
  { date:currentMonth+'-01',type:'income',category:'월급',amount:3500000,memo:'월급',payment_method:'계좌이체',is_fixed:true },
  { date:currentMonth+'-03',type:'expense',category:'주거/관리비',amount:500000,memo:'월세',payment_method:'계좌이체',is_fixed:true },
  { date:currentMonth+'-05',type:'expense',category:'식비',amount:45000,memo:'마트',payment_method:'신용카드',is_fixed:false },
  { date:currentMonth+'-07',type:'expense',category:'통신비',amount:59000,memo:'휴대폰 요금',payment_method:'계좌이체',is_fixed:true },
  { date:currentMonth+'-10',type:'expense',category:'문화/여가',amount:15000,memo:'넷플릭스',payment_method:'신용카드',is_fixed:true },
  { date:currentMonth+'-12',type:'expense',category:'식비',amount:32000,memo:'점심',payment_method:'체크카드',is_fixed:false },
  { date:currentMonth+'-14',type:'expense',category:'교통비',amount:52000,memo:'교통카드',payment_method:'체크카드',is_fixed:false },
];

// 선택 훅
function useSelection(items, idKey = 'id') {
  const [sel, setSel] = useState(new Set());
  const allIds = items.map(i => i[idKey]);
  const allChecked = allIds.length > 0 && allIds.every(id => sel.has(id));
  const someChecked = allIds.some(id => sel.has(id));
  const toggle = id => setSel(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(allIds));
  const clear = () => setSel(new Set());
  return { sel, toggle, toggleAll, allChecked, someChecked, clear };
}

// 삭제 툴바
function BulkBar({ count, onDelete, onClear }) {
  if (count === 0) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px', background:'#FFF5F5', borderRadius:'8px', marginBottom:'10px', border:'1px solid #FCA5A5' }}>
      <span style={{ fontSize:'13px', color:'#EF4444', fontWeight:'600' }}>{count}개 선택됨</span>
      <button onClick={onDelete} style={{ background:'#EF4444', color:'white', border:'none', borderRadius:'6px', padding:'5px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
        선택 삭제
      </button>
      <button onClick={onClear} style={{ background:'none', border:'1px solid #FCA5A5', color:'#EF4444', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', cursor:'pointer' }}>
        취소
      </button>
    </div>
  );
}

function Donut({ p, color, size=100 }) {
  const r=38, cx=size/2, cy=size/2, circ=2*Math.PI*r, dash=Math.min(p,100)/100*circ;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDE9F8" strokeWidth="11"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="bold" fill={color}>{p.toFixed(1)}%</text>
    </svg>
  );
}
function ProgressBar({ val, max, color }) {
  const p = max>0 ? Math.min(val/max*100,100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <div style={{ flex:1, height:'6px', background:'#EDE9F8', borderRadius:'3px', overflow:'hidden' }}>
        <div style={{ width:`${p}%`, height:'100%', background:color, borderRadius:'3px', transition:'width 0.3s' }}/>
      </div>
      <span style={{ fontSize:'10px', color:'#9B8FA0', minWidth:'28px' }}>{Math.round(p)}%</span>
    </div>
  );
}

const card = { background:'white', borderRadius:'12px', padding:'16px', boxShadow:'0 1px 4px rgba(44,28,61,0.07)' };
const TH = { background:'#F5F2FA', padding:'8px 10px', textAlign:'left', color:'#6B5B7B', fontWeight:'600', fontSize:'11px', whiteSpace:'nowrap' };
const TD = { padding:'7px 10px', borderBottom:'1px solid #F5F2FA', color:'#3D2D4D', fontSize:'12px' };
const bdg = (color, bg) => ({ fontSize:'10px', padding:'2px 7px', borderRadius:'10px', fontWeight:'600', color, background:bg, whiteSpace:'nowrap' });
const CB = { width:'14px', height:'14px', cursor:'pointer', accentColor:'#7C3AED' };

const TABS = [['budget','📊 예산'],['entries','📝 내역'],['fixed','🔁 고정항목'],['goals','🎯 자금확보'],['yearly','📈 연간현황']];

export default function App() {
  const [tab, setTab]         = useState('budget');
  const [month, setMonth]     = useState(currentMonth);
  const [budgets, setBudgets] = useState({});
  const [goals, setGoals]     = useState([]);
  const [txs, setTxs]         = useState([]);
  const [entries, setEntries] = useState([]);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ type:'all', method:'all' });

  const data        = budgets[month] || { income:[], expenses:[] };
  const monthEntries    = entries.filter(e => e.date?.startsWith(month));
  const filteredEntries = monthEntries.filter(e => {
    if (filter.type !== 'all' && e.type !== filter.type) return false;
    if (filter.method !== 'all' && e.payment_method !== filter.method) return false;
    return true;
  });
  const fixedEntries = entries.filter(e => e.is_fixed);

  // 선택 상태
  const expSel = useSelection(data.expenses);
  const incSel = useSelection(data.income);
  const entSel = useSelection(filteredEntries);
  const fixSel = useSelection(fixedEntries);
  const txSel  = useSelection(txs);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: items }, { data: goalsData }, { data: txData }, { data: entryData }] = await Promise.all([
      supabase.from('budget_items').select('*'),
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('transactions').select('*').order('date', { ascending:false }),
      supabase.from('entries').select('*').order('date', { ascending:false }),
    ]);
    if (items && items.length > 0) {
      const map = {};
      items.forEach(item => {
        if (!map[item.month]) map[item.month] = { income:[], expenses:[] };
        const key = item.type==='income' ? 'income' : 'expenses';
        map[item.month][key].push({ id:item.id, cat:item.cat, budget:item.budget, actual:item.actual });
      });
      setBudgets(map);
    } else {
      const rows = SEED_BUDGET.map(r => ({ ...r, month:currentMonth }));
      const { data: seeded } = await supabase.from('budget_items').insert(rows).select();
      if (seeded) {
        const map = { [currentMonth]: { income:[], expenses:[] } };
        seeded.forEach(item => { const key=item.type==='income'?'income':'expenses'; map[item.month][key].push({id:item.id,cat:item.cat,budget:item.budget,actual:item.actual}); });
        setBudgets(map);
      }
    }
    if (goalsData) setGoals(goalsData);
    if (txData) setTxs(txData.map(t => ({ id:t.id, date:t.date, goal:t.goal_name, amount:t.amount })));
    if (entryData && entryData.length > 0) setEntries(entryData);
    else { const { data: s } = await supabase.from('entries').insert(SEED_ENTRIES).select(); if (s) setEntries(s.sort((a,b)=>b.date.localeCompare(a.date))); }
    setLoading(false);
  }

  // ── 삭제 함수들 ──────────────────────────────────────
  async function bulkDeleteEntries(ids) {
    await supabase.from('entries').delete().in('id', [...ids]);
    setEntries(prev => prev.filter(e => !ids.has(e.id)));
    entSel.clear(); fixSel.clear();
  }
  async function bulkDeleteBudget(ids, type) {
    await supabase.from('budget_items').delete().in('id', [...ids]);
    const key = type==='expense' ? 'expenses' : 'income';
    setBudgets(prev => ({ ...prev, [month]: { ...prev[month], [key]: prev[month][key].filter(x => !ids.has(x.id)) } }));
    type==='expense' ? expSel.clear() : incSel.clear();
  }
  async function bulkDeleteTxs(ids) {
    const toDelete = txs.filter(t => ids.has(t.id));
    await supabase.from('transactions').delete().in('id', [...ids]);
    for (const tx of toDelete) {
      const goal = goals.find(g => g.name===tx.goal);
      if (goal) {
        await supabase.from('goals').update({ saved: Math.max(0, goal.saved-tx.amount) }).eq('id', goal.id);
        setGoals(prev => prev.map(g => g.name===tx.goal ? {...g, saved:Math.max(0,g.saved-tx.amount)} : g));
      }
    }
    setTxs(prev => prev.filter(t => !ids.has(t.id)));
    txSel.clear();
  }

  async function addEntry() {
    const amt = Number(form.amount) || 0;
    if (!amt || !form.category || !form.date) return;
    const row = { date:form.date, type:form.type||'expense', category:form.category, amount:amt, memo:form.memo||'', payment_method:form.payment_method||'현금', is_fixed:form.is_fixed||false };
    const { data } = await supabase.from('entries').insert(row).select().single();
    if (data) setEntries(prev => [data,...prev].sort((a,b)=>b.date.localeCompare(a.date)));
    setModal(null); setForm({});
  }
  async function addBudgetItem() {
    const amt = Number(form.amount) || 0;
    if (!amt) return setModal(null);
    const type=modal==='expense'?'expense':'income', key=type==='expense'?'expenses':'income';
    const d=budgets[month]||{income:[],expenses:[]};
    const existing=d[key].find(x=>x.cat===form.cat);
    if (existing) {
      await supabase.from('budget_items').update({ actual:existing.actual+amt }).eq('id',existing.id);
      setBudgets(prev=>({...prev,[month]:{...d,[key]:d[key].map(x=>x.cat===form.cat?{...x,actual:x.actual+amt}:x)}}));
    } else {
      const { data: item } = await supabase.from('budget_items').insert({month,type,cat:form.cat||'기타',budget:0,actual:amt}).select().single();
      if (item) setBudgets(prev=>({...prev,[month]:{...d,[key]:[...d[key],{id:item.id,cat:item.cat,budget:0,actual:amt}]}}));
    }
    setModal(null); setForm({});
  }
  async function addGoal() {
    const { name, target, monthly, color } = form;
    if (!name || !target) return;
    const row = { name, target:Number(target), saved:0, monthly:Number(monthly)||0, color:color||'#7C3AED' };
    const { data } = await supabase.from('goals').insert(row).select().single();
    if (data) setGoals(prev => [...prev, data]);
    setModal(null); setForm({});
  }

  async function editGoal() {
    const { id, name, target, monthly, color, saved } = form;
    if (!name || !target) return;
    const updates = { name, target:Number(target), monthly:Number(monthly)||0, color:color||'#7C3AED', saved:Number(saved)||0 };
    await supabase.from('goals').update(updates).eq('id', id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    setModal(null); setForm({});
  }

  async function deleteGoals(ids) {
    await supabase.from('goals').delete().in('id', [...ids]);
    setGoals(prev => prev.filter(g => !ids.has(g.id)));
  }

  async function addGoalTx() {
    const amt = Number(form.amount) || 0;
    if (!amt) return setModal(null);
    const txDate=form.date||new Date().toISOString().slice(0,10);
    const { data: tx } = await supabase.from('transactions').insert({date:txDate,goal_name:form.goal,amount:amt}).select().single();
    const goal=goals.find(g=>g.name===form.goal);
    if (goal) { await supabase.from('goals').update({saved:goal.saved+amt}).eq('id',goal.id); setGoals(prev=>prev.map(g=>g.name===form.goal?{...g,saved:g.saved+amt}:g)); }
    if (tx) setTxs(prev=>[{id:tx.id,date:tx.date,goal:tx.goal_name,amount:tx.amount},...prev]);
    setModal(null); setForm({});
  }

  // ── 계산 ──────────────────────────────────────────────
  const totIn=data.income.reduce((s,i)=>s+i.actual,0), totEx=data.expenses.reduce((s,e)=>s+e.actual,0), bal=totIn-totEx;
  const budgetEx=data.expenses.reduce((s,e)=>s+e.budget,0), budgetIn=data.income.reduce((s,i)=>s+i.budget,0);
  const pieData=data.expenses.map((e,i)=>({name:e.cat,value:e.actual,color:C[i%C.length]}));
  const barData=data.expenses.map(e=>({name:e.cat.length>4?e.cat.slice(0,4):e.cat,예산:e.budget,실제:e.actual}));
  const totTarget=goals.reduce((s,g)=>s+g.target,0), totSaved=goals.reduce((s,g)=>s+g.saved,0);
  const entryIncome=monthEntries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const entryExpense=monthEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const fixedMonthly=fixedEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const yearlyData = useMemo(() => {
    const map={};
    entries.forEach(e=>{ const m=e.date?.slice(0,7); if(!m) return; if(!map[m]) map[m]={month:mLabel(m),수입:0,지출:0}; if(e.type==='income') map[m].수입+=e.amount; if(e.type==='expense') map[m].지출+=e.amount; });
    return Object.keys(map).sort().map(k=>({...map[k],잔액:map[k].수입-map[k].지출}));
  }, [entries]);
  const totalYearIncome=yearlyData.reduce((s,d)=>s+d.수입,0), totalYearExpense=yearlyData.reduce((s,d)=>s+d.지출,0);

  const openEntryModal=(preset={})=>{ setModal('entry'); setForm({date:preset.date||new Date().toISOString().slice(0,10),type:preset.type||'expense',category:preset.category||'',amount:preset.amount||'',memo:preset.memo||'',payment_method:preset.payment_method||'현금',is_fixed:preset.is_fixed||false}); };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F5F2FA',flexDirection:'column',gap:'12px'}}><div style={{fontSize:'32px'}}>💰</div><div style={{color:'#6B5B7B',fontSize:'14px'}}>불러오는 중...</div></div>;

  return (
    <div style={{ fontFamily:"'Apple SD Gothic Neo','Malgun Gothic',sans-serif", background:'#F5F2FA', minHeight:'100vh' }}>
      <div style={{ background:'#2D1B3D', display:'flex', alignItems:'stretch', padding:'0 20px', gap:'2px', overflowX:'auto' }}>
        <div style={{ color:'white', fontSize:'15px', fontWeight:'700', display:'flex', alignItems:'center', paddingRight:'16px', marginRight:'8px', borderRight:'1px solid #4A2D6A', whiteSpace:'nowrap' }}>💰 내 가계부</div>
        {TABS.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{ background:'none', border:'none', color:tab===key?'white':'#9B7BB5', borderBottom:tab===key?'2px solid #C084FC':'2px solid transparent', padding:'13px 14px', fontSize:'12px', fontWeight:tab===key?'700':'400', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
        ))}
      </div>

      {/* ── 예산 탭 ── */}
      {tab==='budget' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
            <select value={month} onChange={e=>setMonth(e.target.value)} style={{ border:'1px solid #D9D0E8', borderRadius:'8px', padding:'6px 10px', fontSize:'13px', background:'white' }}>{MONTHS.map(m=><option key={m} value={m}>{mLabel(m)}</option>)}</select>
            <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
              <button onClick={()=>{setModal('income');setForm({cat:'월급',amount:'',month});}} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:'8px',padding:'7px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ 수입</button>
              <button onClick={()=>{setModal('expense');setForm({cat:'식비',amount:'',month});}} style={{background:'#EC4899',color:'white',border:'none',borderRadius:'8px',padding:'7px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ 지출</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[{label:'총 수입',val:totIn,color:'#7C3AED',bg:'#FAF5FF',border:'#C4B5FD'},{label:'총 지출',val:totEx,color:'#EC4899',bg:'#FFF0F6',border:'#F9A8D4'},{label:'잔 액',val:bal,color:bal>=0?'#059669':'#EF4444',bg:bal>=0?'#F0FDF4':'#FFF5F5',border:bal>=0?'#6EE7B7':'#FCA5A5'}].map(({label,val,color,bg,border})=>(
              <div key={label} style={{...card,background:bg,borderLeft:`4px solid ${border}`}}><div style={{fontSize:'11px',color:'#9B8FA0',marginBottom:'4px'}}>{label}</div><div style={{fontSize:'22px',fontWeight:'700',color}}>{f(val)}원</div></div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:'12px', marginBottom:'16px' }}>
            <div style={card}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'10px'}}>📊 예산 VS 실제</div>
              <ResponsiveContainer width="100%" height={190}><BarChart data={barData} margin={{top:0,right:8,left:-15,bottom:36}}><XAxis dataKey="name" tick={{fontSize:9,fill:'#9B8FA0'}} angle={-38} textAnchor="end" interval={0}/><YAxis tick={{fontSize:9,fill:'#9B8FA0'}} tickFormatter={v=>v>=10000?(v/10000)+'만':v}/><Tooltip formatter={v=>[`${f(v)}원`]}/><Bar dataKey="예산" fill="#C4B5FD" radius={[3,3,0,0]}/><Bar dataKey="실제" fill="#7C3AED" radius={[3,3,0,0]}/><Legend wrapperStyle={{fontSize:'10px',paddingTop:'8px'}}/></BarChart></ResponsiveContainer>
            </div>
            <div style={card}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'4px'}}>🥧 카테고리별</div>
              <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={pieData} cx="50%" cy="46%" innerRadius={42} outerRadius={68} dataKey="value" nameKey="name">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>[`${f(v)}원`]}/><Legend iconSize={7} wrapperStyle={{fontSize:'9px'}}/></PieChart></ResponsiveContainer>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {/* 지출 예산 */}
            <div style={card}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'8px'}}>💸 지출 예산</div>
              <BulkBar count={expSel.sel.size} onDelete={()=>bulkDeleteBudget(expSel.sel,'expense')} onClear={expSel.clear}/>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  <th style={{...TH,width:'32px'}}><input type="checkbox" style={CB} checked={expSel.allChecked} onChange={expSel.toggleAll}/></th>
                  {['항목','예산','실제','달성률'].map((h,i)=><th key={i} style={{...TH,textAlign:i>0?'right':'left'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.expenses.map((e,i)=>{ const over=e.budget>0&&e.actual>e.budget; return (
                    <tr key={e.id} style={{background:expSel.sel.has(e.id)?'#FAF5FF':'white'}}>
                      <td style={{...TD,textAlign:'center'}}><input type="checkbox" style={CB} checked={expSel.sel.has(e.id)} onChange={()=>expSel.toggle(e.id)}/></td>
                      <td style={TD}><span style={{display:'inline-block',width:'7px',height:'7px',borderRadius:'50%',background:C[i%C.length],marginRight:'5px'}}/>{e.cat}</td>
                      <td style={{...TD,textAlign:'right',color:'#9B8FA0'}}>{f(e.budget)}</td>
                      <td style={{...TD,textAlign:'right',color:over?'#EF4444':'#2D1B3D',fontWeight:over?'700':'400'}}>{f(e.actual)}</td>
                      <td style={{...TD,textAlign:'right',minWidth:'80px'}}><ProgressBar val={e.actual} max={e.budget} color={over?'#EF4444':C[i%C.length]}/></td>
                    </tr>); })}
                  <tr style={{background:'#F5F2FA'}}>
                    <td style={TD}/><td style={{...TD,fontWeight:'700'}}>합계</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'700'}}>{f(budgetEx)}</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'700',color:totEx>budgetEx?'#EF4444':'#2D1B3D'}}>{f(totEx)}</td>
                    <td style={{...TD,textAlign:'right'}}><ProgressBar val={totEx} max={budgetEx} color="#7C3AED"/></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* 수입 */}
            <div style={card}>
              <div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'8px'}}>💵 수입 현황</div>
              <BulkBar count={incSel.sel.size} onDelete={()=>bulkDeleteBudget(incSel.sel,'income')} onClear={incSel.clear}/>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  <th style={{...TH,width:'32px'}}><input type="checkbox" style={CB} checked={incSel.allChecked} onChange={incSel.toggleAll}/></th>
                  {['항목','목표','실제','달성률'].map((h,i)=><th key={i} style={{...TH,textAlign:i>0?'right':'left'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.income.map(inc=>(
                    <tr key={inc.id} style={{background:incSel.sel.has(inc.id)?'#FAF5FF':'white'}}>
                      <td style={{...TD,textAlign:'center'}}><input type="checkbox" style={CB} checked={incSel.sel.has(inc.id)} onChange={()=>incSel.toggle(inc.id)}/></td>
                      <td style={TD}>{inc.cat}</td>
                      <td style={{...TD,textAlign:'right',color:'#9B8FA0'}}>{f(inc.budget)}</td>
                      <td style={{...TD,textAlign:'right',fontWeight:'600',color:'#7C3AED'}}>{f(inc.actual)}</td>
                      <td style={{...TD,textAlign:'right',minWidth:'80px'}}><ProgressBar val={inc.actual} max={inc.budget} color="#7C3AED"/></td>
                    </tr>
                  ))}
                  <tr style={{background:'#F5F2FA'}}>
                    <td style={TD}/><td style={{...TD,fontWeight:'700'}}>합계</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'700'}}>{f(budgetIn)}</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'700',color:'#7C3AED'}}>{f(totIn)}</td>
                    <td style={{...TD,textAlign:'right'}}><ProgressBar val={totIn} max={budgetIn} color="#7C3AED"/></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 내역 탭 ── */}
      {tab==='entries' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
            <select value={month} onChange={e=>setMonth(e.target.value)} style={{border:'1px solid #D9D0E8',borderRadius:'8px',padding:'6px 10px',fontSize:'13px',background:'white'}}>{MONTHS.map(m=><option key={m} value={m}>{mLabel(m)}</option>)}</select>
            <select value={filter.type} onChange={e=>setFilter(p=>({...p,type:e.target.value}))} style={{border:'1px solid #D9D0E8',borderRadius:'8px',padding:'6px 10px',fontSize:'12px',background:'white'}}><option value="all">전체</option><option value="income">수입</option><option value="expense">지출</option></select>
            <select value={filter.method} onChange={e=>setFilter(p=>({...p,method:e.target.value}))} style={{border:'1px solid #D9D0E8',borderRadius:'8px',padding:'6px 10px',fontSize:'12px',background:'white'}}><option value="all">결제수단 전체</option>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select>
            <button onClick={()=>openEntryModal()} style={{marginLeft:'auto',background:'#7C3AED',color:'white',border:'none',borderRadius:'8px',padding:'7px 16px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ 내역 추가</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[{label:'이번달 수입',val:entryIncome,color:'#7C3AED',border:'#C4B5FD'},{label:'이번달 지출',val:entryExpense,color:'#EC4899',border:'#F9A8D4'},{label:'잔 액',val:entryIncome-entryExpense,color:(entryIncome-entryExpense)>=0?'#059669':'#EF4444',border:'#6EE7B7'}].map(({label,val,color,border})=>(
              <div key={label} style={{...card,borderLeft:`4px solid ${border}`}}><div style={{fontSize:'11px',color:'#9B8FA0',marginBottom:'4px'}}>{label}</div><div style={{fontSize:'20px',fontWeight:'700',color}}>{f(val)}원</div></div>
            ))}
          </div>
          <div style={card}>
            <BulkBar count={entSel.sel.size} onDelete={()=>bulkDeleteEntries(entSel.sel)} onClear={entSel.clear}/>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...TH,width:'32px'}}><input type="checkbox" style={CB} checked={entSel.allChecked} onChange={entSel.toggleAll}/></th>
                {['날짜','구분','카테고리','금액','결제수단','메모','고정'].map((h,i)=><th key={i} style={{...TH,textAlign:i===3?'right':'left'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filteredEntries.length===0&&<tr><td colSpan={8} style={{...TD,textAlign:'center',padding:'32px',color:'#9B8FA0'}}>내역이 없어요</td></tr>}
                {filteredEntries.map(e=>(
                  <tr key={e.id} style={{background:entSel.sel.has(e.id)?'#FAF5FF':'white'}}>
                    <td style={{...TD,textAlign:'center'}}><input type="checkbox" style={CB} checked={entSel.sel.has(e.id)} onChange={()=>entSel.toggle(e.id)}/></td>
                    <td style={{...TD,color:'#9B8FA0',fontSize:'11px'}}>{e.date}</td>
                    <td style={TD}><span style={e.type==='income'?bdg('#059669','#F0FDF4'):bdg('#EC4899','#FFF0F6')}>{e.type==='income'?'수입':'지출'}</span></td>
                    <td style={TD}>{e.category}</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'600',color:e.type==='income'?'#7C3AED':'#EC4899'}}>{f(e.amount)}</td>
                    <td style={TD}><span style={bdg('#6B5B7B','#F5F2FA')}>{e.payment_method}</span></td>
                    <td style={{...TD,color:'#9B8FA0',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.memo}</td>
                    <td style={{...TD,textAlign:'center'}}>{e.is_fixed?<span style={bdg('#F97316','#FFF7ED')}>고정</span>:''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 고정항목 탭 ── */}
      {tab==='fixed' && (
        <div style={{ padding:'18px', maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[{label:'월 고정 지출',val:f(fixedMonthly)+'원',color:'#EF4444'},{label:'고정항목 수',val:fixedEntries.length+'개',color:'#7C3AED'},{label:'연간 예상',val:f(fixedMonthly*12)+'원',color:'#F97316'}].map(({label,val,color})=>(
                <div key={label} style={{...card,padding:'12px 20px',borderLeft:`4px solid ${color}`}}><div style={{fontSize:'11px',color:'#9B8FA0'}}>{label}</div><div style={{fontSize:'18px',fontWeight:'700',color}}>{val}</div></div>
              ))}
            </div>
            <button onClick={()=>openEntryModal({is_fixed:true})} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:'8px',padding:'7px 16px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ 고정항목 추가</button>
          </div>
          <div style={card}>
            <BulkBar count={fixSel.sel.size} onDelete={()=>bulkDeleteEntries(fixSel.sel)} onClear={fixSel.clear}/>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...TH,width:'32px'}}><input type="checkbox" style={CB} checked={fixSel.allChecked} onChange={fixSel.toggleAll}/></th>
                {['날짜','구분','카테고리','금액','결제수단','메모'].map((h,i)=><th key={i} style={{...TH,textAlign:i===3?'right':'left'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {fixedEntries.length===0&&<tr><td colSpan={7} style={{...TD,textAlign:'center',padding:'32px',color:'#9B8FA0'}}>고정항목이 없어요</td></tr>}
                {fixedEntries.map(e=>(
                  <tr key={e.id} style={{background:fixSel.sel.has(e.id)?'#FAF5FF':'white'}}>
                    <td style={{...TD,textAlign:'center'}}><input type="checkbox" style={CB} checked={fixSel.sel.has(e.id)} onChange={()=>fixSel.toggle(e.id)}/></td>
                    <td style={{...TD,color:'#9B8FA0',fontSize:'11px'}}>{e.date}</td>
                    <td style={TD}><span style={e.type==='income'?bdg('#059669','#F0FDF4'):bdg('#EC4899','#FFF0F6')}>{e.type==='income'?'수입':'지출'}</span></td>
                    <td style={TD}>{e.category}</td>
                    <td style={{...TD,textAlign:'right',fontWeight:'600',color:e.type==='income'?'#7C3AED':'#EC4899'}}>{f(e.amount)}</td>
                    <td style={TD}><span style={bdg('#6B5B7B','#F5F2FA')}>{e.payment_method}</span></td>
                    <td style={{...TD,color:'#9B8FA0'}}>{e.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 자금확보 탭 ── */}
      {tab==='goals' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[{label:'목표 금액',val:`${f(totTarget)}원`,color:'#EF4444'},{label:'현재까지 확보',val:`${f(totSaved)}원`,color:'#22C55E'},{label:'남은 금액',val:`${f(totTarget-totSaved)}원`,color:'#F97316'},{label:'전체 진행률',val:`${pct(totSaved,totTarget).toFixed(1)}%`,color:'#3B82F6'}].map(({label,val,color})=>(
              <div key={label} style={{...card,borderTop:`3px solid ${color}`}}><div style={{fontSize:'11px',color:'#9B8FA0',marginBottom:'6px'}}>{label}</div><div style={{fontSize:'20px',fontWeight:'700',color}}>{val}</div></div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'12px' }}>
            <div style={card}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                <div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B'}}>적립 내역</div>
                <button onClick={()=>{setModal('saving');setForm({goal:goals[0]?.name,amount:'',date:new Date().toISOString().slice(0,10)});}} style={{background:'#EF4444',color:'white',border:'none',borderRadius:'6px',padding:'5px 10px',fontSize:'11px',fontWeight:'600',cursor:'pointer'}}>+ 적립 추가</button>
              </div>
              <BulkBar count={txSel.sel.size} onDelete={()=>bulkDeleteTxs(txSel.sel)} onClear={txSel.clear}/>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>
                  <th style={{...TH,width:'32px'}}><input type="checkbox" style={CB} checked={txSel.allChecked} onChange={txSel.toggleAll}/></th>
                  <th style={TH}>날짜</th><th style={TH}>항목</th><th style={{...TH,textAlign:'right'}}>금액</th>
                </tr></thead>
                <tbody>
                  {txs.length===0&&<tr><td colSpan={4} style={{...TD,textAlign:'center',color:'#9B8FA0',padding:'24px'}}>내역 없음</td></tr>}
                  {txs.slice(0,15).map(tx=>(
                    <tr key={tx.id} style={{background:txSel.sel.has(tx.id)?'#FAF5FF':'white'}}>
                      <td style={{...TD,textAlign:'center'}}><input type="checkbox" style={CB} checked={txSel.sel.has(tx.id)} onChange={()=>txSel.toggle(tx.id)}/></td>
                      <td style={{...TD,color:'#9B8FA0',fontSize:'11px'}}>{tx.date}</td>
                      <td style={TD}>{tx.goal}</td>
                      <td style={{...TD,textAlign:'right',color:'#22C55E',fontWeight:'600'}}>{f(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <span style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B'}}>목표 목록 ({goals.length}개)</span>
                <button onClick={()=>{setModal('addGoal');setForm({name:'',target:'',monthly:'',color:'#7C3AED'});}} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ 목표 추가</button>
              </div>
              {goals.length===0 && (
                <div style={{...card,textAlign:'center',padding:'40px',color:'#9B8FA0'}}>목표를 추가해봐요!</div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',alignContent:'start'}}>
                {goals.map(g=>{
                  const p=pct(g.saved,g.target), remain=g.target-g.saved, months=g.monthly>0?Math.ceil(remain/g.monthly):0;
                  const eta=new Date(); eta.setMonth(eta.getMonth()+months);
                  const etaStr=months>0?`${eta.getFullYear()}-${String(eta.getMonth()+1).padStart(2,'0')}`:'달성완료';
                  return <div key={g.id} style={{...card,borderTop:`3px solid ${g.color}`,position:'relative'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                      <div style={{fontSize:'13px',fontWeight:'700',color:'#2D1B3D'}}>{g.name}</div>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button onClick={()=>{setModal('editGoal');setForm({id:g.id,name:g.name,target:g.target,monthly:g.monthly,color:g.color,saved:g.saved});}} style={{background:'#F5F2FA',border:'none',borderRadius:'6px',padding:'3px 8px',fontSize:'11px',color:'#7C3AED',cursor:'pointer',fontWeight:'600'}}>수정</button>
                        <button onClick={()=>deleteGoals(new Set([g.id]))} style={{background:'#FFF5F5',border:'none',borderRadius:'6px',padding:'3px 8px',fontSize:'11px',color:'#EF4444',cursor:'pointer',fontWeight:'600'}}>삭제</button>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <Donut p={p} color={g.color} size={88}/>
                      <div style={{flex:1}}>
                        {[['목표',g.target],['확보',g.saved],['잔여',remain]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:'11px',marginBottom:'3px'}}><span style={{color:'#9B8FA0'}}>{l}</span><span style={{fontWeight:'600',color:'#2D1B3D'}}>{f(v)}</span></div>)}
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',marginTop:'5px',paddingTop:'5px',borderTop:'1px solid #F5F2FA'}}>
                          <span style={{color:'#9B8FA0'}}>월 적립</span><span style={{fontWeight:'600',color:'#9B8FA0'}}>{f(g.monthly)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',marginTop:'3px'}}><span style={{color:'#9B8FA0'}}>예상 달성</span><span style={{fontWeight:'700',color:g.color}}>{etaStr}</span></div>
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 연간현황 탭 ── */}
      {tab==='yearly' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'16px'}}>
            {[{label:'연간 총 수입',val:totalYearIncome,color:'#7C3AED',border:'#C4B5FD'},{label:'연간 총 지출',val:totalYearExpense,color:'#EC4899',border:'#F9A8D4'},{label:'연간 순이익',val:totalYearIncome-totalYearExpense,color:(totalYearIncome-totalYearExpense)>=0?'#059669':'#EF4444',border:'#6EE7B7'}].map(({label,val,color,border})=>(
              <div key={label} style={{...card,borderLeft:`4px solid ${border}`}}><div style={{fontSize:'11px',color:'#9B8FA0',marginBottom:'4px'}}>{label}</div><div style={{fontSize:'22px',fontWeight:'700',color}}>{f(val)}원</div></div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
            <div style={card}><div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'12px'}}>📊 월별 수입/지출</div>
              <ResponsiveContainer width="100%" height={240}><BarChart data={yearlyData} margin={{top:0,right:8,left:-10,bottom:20}}><CartesianGrid strokeDasharray="3 3" stroke="#F0EEF5"/><XAxis dataKey="month" tick={{fontSize:9,fill:'#9B8FA0'}} angle={-30} textAnchor="end" interval={0}/><YAxis tick={{fontSize:9,fill:'#9B8FA0'}} tickFormatter={v=>v>=10000?(v/10000)+'만':v}/><Tooltip formatter={v=>[`${f(v)}원`]}/><Bar dataKey="수입" fill="#C4B5FD" radius={[3,3,0,0]}/><Bar dataKey="지출" fill="#EC4899" radius={[3,3,0,0]}/><Legend wrapperStyle={{fontSize:'10px'}}/></BarChart></ResponsiveContainer>
            </div>
            <div style={card}><div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'12px'}}>📈 월별 잔액 추이</div>
              <ResponsiveContainer width="100%" height={240}><LineChart data={yearlyData} margin={{top:0,right:8,left:-10,bottom:20}}><CartesianGrid strokeDasharray="3 3" stroke="#F0EEF5"/><XAxis dataKey="month" tick={{fontSize:9,fill:'#9B8FA0'}} angle={-30} textAnchor="end" interval={0}/><YAxis tick={{fontSize:9,fill:'#9B8FA0'}} tickFormatter={v=>v>=10000?(v/10000)+'만':v}/><Tooltip formatter={v=>[`${f(v)}원`]}/><Line type="monotone" dataKey="잔액" stroke="#7C3AED" strokeWidth={2} dot={{fill:'#7C3AED',r:4}}/></LineChart></ResponsiveContainer>
            </div>
          </div>
          <div style={card}><div style={{fontSize:'12px',fontWeight:'600',color:'#6B5B7B',marginBottom:'12px'}}>📋 월별 요약</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['월','수입','지출','잔액','저축률'].map((h,i)=><th key={i} style={{...TH,textAlign:i>0?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>{yearlyData.map((d,i)=>{ const sr=d.수입>0?Math.round((d.잔액/d.수입)*100):0; return <tr key={i}><td style={TD}>{d.month}</td><td style={{...TD,textAlign:'right',color:'#7C3AED',fontWeight:'600'}}>{f(d.수입)}</td><td style={{...TD,textAlign:'right',color:'#EC4899',fontWeight:'600'}}>{f(d.지출)}</td><td style={{...TD,textAlign:'right',fontWeight:'700',color:d.잔액>=0?'#059669':'#EF4444'}}>{f(d.잔액)}</td><td style={{...TD,textAlign:'right'}}><span style={sr>=20?bdg('#059669','#F0FDF4'):sr>=0?bdg('#F97316','#FFF7ED'):bdg('#EF4444','#FFF5F5')}>{sr}%</span></td></tr>; })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 모달 ── */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{background:'white',borderRadius:'16px',padding:'24px',width:'340px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:'15px',fontWeight:'700',color:'#2D1B3D',marginBottom:'18px'}}>
              {modal==='entry'?'내역 추가':modal==='saving'?'적립 추가':modal==='expense'?'지출 추가':modal==='addGoal'?'목표 추가':modal==='editGoal'?'목표 수정':'수입 추가'}
            </div>
            {modal==='entry'&&(<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>날짜</div><input type="date" value={form.date||''} onChange={e=>setForm({...form,date:e.target.value})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
                <div><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>구분</div><select value={form.type||'expense'} onChange={e=>setForm({...form,type:e.target.value,category:''})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}><option value="expense">지출</option><option value="income">수입</option></select></div>
              </div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>카테고리</div><select value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}><option value="">선택</option>{(form.type==='income'?INCOME_CATS:EXPENSE_CATS).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>금액 (원)</div><input type="number" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>결제수단</div><select value={form.payment_method||'현금'} onChange={e=>setForm({...form,payment_method:e.target.value})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>메모</div><input value={form.memo||''} onChange={e=>setForm({...form,memo:e.target.value})} placeholder="메모 입력" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
              <div style={{marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}><input type="checkbox" id="is_fixed" checked={form.is_fixed||false} onChange={e=>setForm({...form,is_fixed:e.target.checked})} style={{cursor:'pointer'}}/><label htmlFor="is_fixed" style={{fontSize:'12px',color:'#6B5B7B',cursor:'pointer'}}>🔁 고정항목 (매월 반복)</label></div>
            </>)}
            {(modal==='addGoal'||modal==='editGoal')&&(<>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>목표 이름</div><input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="비상금, 여행 자금 ..." style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>목표 금액 (원)</div><input type="number" value={form.target||''} onChange={e=>setForm({...form,target:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
              <div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>월 적립 금액 (원)</div><input type="number" value={form.monthly||''} onChange={e=>setForm({...form,monthly:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>
              {modal==='editGoal'&&<div style={{marginBottom:'10px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>현재 확보 금액 (원)</div><input type="number" value={form.saved||''} onChange={e=>setForm({...form,saved:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'7px 10px',fontSize:'12px'}}/></div>}
              <div style={{marginBottom:'16px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'4px'}}>색상</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {['#7C3AED','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6'].map(c=>(
                    <div key={c} onClick={()=>setForm({...form,color:c})} style={{width:'24px',height:'24px',borderRadius:'50%',background:c,cursor:'pointer',border:form.color===c?'3px solid #2D1B3D':'3px solid transparent'}}/>
                  ))}
                </div>
              </div>
            </>)}
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'5px'}}>목표 항목</div><select value={form.goal||''} onChange={e=>setForm({...form,goal:e.target.value})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'8px 10px',fontSize:'13px'}}>{goals.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'5px'}}>날짜</div><input type="date" value={form.date||''} onChange={e=>setForm({...form,date:e.target.value})} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'8px 10px',fontSize:'13px'}}/></div>
              <div style={{marginBottom:'18px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'5px'}}>금액 (원)</div><input type="number" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'8px 10px',fontSize:'13px'}}/></div>
            </>)}
            {(modal==='expense'||modal==='income')&&(<>
              <div style={{marginBottom:'12px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'5px'}}>카테고리</div><input value={form.cat||''} onChange={e=>setForm({...form,cat:e.target.value})} placeholder={modal==='expense'?'식비, 교통비 ...':'월급, 상여금 ...'} style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'8px 10px',fontSize:'13px'}}/></div>
              <div style={{marginBottom:'18px'}}><div style={{fontSize:'12px',color:'#6B5B7B',marginBottom:'5px'}}>금액 (원)</div><input type="number" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" style={{width:'100%',border:'1px solid #D9D0E8',borderRadius:'8px',padding:'8px 10px',fontSize:'13px'}}/></div>
            </>)}
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>{setModal(null);setForm({});}} style={{flex:1,background:'#F5F2FA',color:'#6B5B7B',border:'none',borderRadius:'8px',padding:'10px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>취소</button>
              <button onClick={modal==='entry'?addEntry:modal==='saving'?addGoalTx:modal==='addGoal'?addGoal:modal==='editGoal'?editGoal:addBudgetItem} style={{flex:1,background:modal==='saving'||modal==='addGoal'||modal==='editGoal'?'#7C3AED':modal==='expense'?'#EC4899':'#7C3AED',color:'white',border:'none',borderRadius:'8px',padding:'10px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>{modal==='editGoal'?'수정':'추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
