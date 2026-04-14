import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const C = ['#7C3AED','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#0EA5E9'];
const f = n => n?.toLocaleString('ko-KR') ?? '0';
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
const MONTHS = Array.from({length:12}, (_,i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 6 + i);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
});
const mLabel = m => m.replace('-', '년 ') + '월';

const INIT_BUDGET = {
  income: [
    { id:1, cat:'월급', budget:3500000, actual:3500000 },
    { id:2, cat:'상여금', budget:500000, actual:300000 },
    { id:3, cat:'부수입', budget:80000, actual:30000 },
    { id:4, cat:'금융수익', budget:50000, actual:30000 },
    { id:5, cat:'환급', budget:30000, actual:0 },
  ],
  expenses: [
    { id:1, cat:'주거/관리비', budget:800000, actual:815000 },
    { id:2, cat:'식비', budget:500000, actual:612000 },
    { id:3, cat:'교통비', budget:120000, actual:98000 },
    { id:4, cat:'통신비', budget:100000, actual:95000 },
    { id:5, cat:'의류/미용', budget:200000, actual:180000 },
    { id:6, cat:'의료/건강', budget:100000, actual:45000 },
    { id:7, cat:'문화/여가', budget:150000, actual:210000 },
    { id:8, cat:'교육', budget:300000, actual:280000 },
    { id:9, cat:'저축', budget:500000, actual:500000 },
    { id:10, cat:'기타', budget:200000, actual:153000 },
  ]
};

const INIT_GOALS = [
  { id:1, name:'비상금', target:5000000, saved:2000000, monthly:300000, color:'#EF4444' },
  { id:2, name:'여행 자금', target:3500000, saved:300000, monthly:300000, color:'#F97316' },
  { id:3, name:'가전 교체', target:3000000, saved:150000, monthly:150000, color:'#EAB308' },
  { id:4, name:'자동차 정비', target:1000000, saved:30000, monthly:100000, color:'#22C55E' },
  { id:5, name:'반려동물 비상금', target:2800000, saved:90000, monthly:100000, color:'#3B82F6' },
  { id:6, name:'자기계발', target:800000, saved:20000, monthly:50000, color:'#8B5CF6' },
];

const INIT_TXS = [
  { id:1, date:'2025-11-03', goal:'비상금', amount:200000 },
  { id:2, date:'2025-11-07', goal:'여행 자금', amount:150000 },
  { id:3, date:'2025-11-12', goal:'자기계발', amount:20000 },
  { id:4, date:'2025-11-19', goal:'반려동물 비상금', amount:100000 },
  { id:5, date:'2025-11-25', goal:'가전 교체', amount:100000 },
  { id:6, date:'2025-12-02', goal:'자동차 정비', amount:30000 },
  { id:7, date:'2025-12-15', goal:'비상금', amount:300000 },
  { id:8, date:'2025-12-21', goal:'반려동물 비상금', amount:40000 },
  { id:9, date:'2025-12-28', goal:'가전 교체', amount:50000 },
  { id:10, date:'2026-01-05', goal:'비상금', amount:300000 },
];

function Donut({ p, color, size = 100 }) {
  const r = 38, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(p, 100) / 100 * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDE9F8" strokeWidth="11" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="13" fontWeight="bold" fill={color}>{p.toFixed(1)}%</text>
    </svg>
  );
}

function ProgressBar({ val, max, color }) {
  const p = max > 0 ? Math.min(val / max * 100, 100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <div style={{ flex:1, height:'6px', background:'#EDE9F8', borderRadius:'3px', overflow:'hidden' }}>
        <div style={{ width:`${p}%`, height:'100%', background: color, borderRadius:'3px', transition:'width 0.3s' }} />
      </div>
      <span style={{ fontSize:'10px', color:'#9B8FA0', minWidth:'30px' }}>{Math.round(p)}%</span>
    </div>
  );
}

const card = { background:'white', borderRadius:'12px', padding:'16px', boxShadow:'0 1px 4px rgba(44,28,61,0.07)' };
const th = { background:'#F5F2FA', padding:'8px 10px', textAlign:'left', color:'#6B5B7B', fontWeight:'600', fontSize:'11px', whiteSpace:'nowrap' };
const td = { padding:'7px 10px', borderBottom:'1px solid #F5F2FA', color:'#3D2D4D', fontSize:'12px' };

export default function App() {
  const [tab, setTab] = useState('budget');
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState({ [currentMonth]: INIT_BUDGET });
  const [goals, setGoals] = useState(INIT_GOALS);
  const [txs, setTxs] = useState(INIT_TXS);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const data = budgets[month] || { income:[], expenses:[] };
  const totIn = data.income.reduce((s, i) => s + i.actual, 0);
  const totEx = data.expenses.reduce((s, e) => s + e.actual, 0);
  const bal = totIn - totEx;
  const budgetEx = data.expenses.reduce((s, e) => s + e.budget, 0);
  const budgetIn = data.income.reduce((s, i) => s + i.budget, 0);

  const pieData = data.expenses.map((e, i) => ({ name: e.cat, value: e.actual, color: C[i % C.length] }));
  const barData = data.expenses.map(e => ({
    name: e.cat.length > 4 ? e.cat.slice(0, 4) : e.cat,
    예산: e.budget, 실제: e.actual
  }));

  const totTarget = goals.reduce((s, g) => s + g.target, 0);
  const totSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totRemain = totTarget - totSaved;
  const overallPct = pct(totSaved, totTarget);

  function addItem() {
    const amt = Number(form.amount) || 0;
    if (!amt) return setModal(null);
    if (modal === 'saving') {
      setGoals(prev => prev.map(g => g.name === form.goal ? { ...g, saved: g.saved + amt } : g));
      setTxs(prev => [{ id: Date.now(), date: form.date || new Date().toISOString().slice(0,10), goal: form.goal, amount: amt }, ...prev]);
    } else {
      const key = modal === 'expense' ? 'expenses' : 'income';
      setBudgets(prev => {
        const d = prev[month] || { income:[], expenses:[] };
        const arr = d[key];
        const exists = arr.find(x => x.cat === form.cat);
        const updated = exists
          ? arr.map(x => x.cat === form.cat ? { ...x, actual: x.actual + amt } : x)
          : [...arr, { id: Date.now(), cat: form.cat || '기타', budget: 0, actual: amt }];
        return { ...prev, [month]: { ...d, [key]: updated } };
      });
    }
    setModal(null); setForm({});
  }

  return (
    <div style={{ fontFamily:"'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", background:'#F5F2FA', minHeight:'100vh' }}>
      {/* Nav */}
      <div style={{ background:'#2D1B3D', display:'flex', alignItems:'stretch', padding:'0 20px', gap:'4px' }}>
        <div style={{ color:'white', fontSize:'15px', fontWeight:'700', display:'flex', alignItems:'center', paddingRight:'20px', marginRight:'8px', borderRight:'1px solid #4A2D6A' }}>
          💰 내 가계부
        </div>
        {[['budget','📊 예산 가계부'], ['goals','🎯 자금 확보']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background:'none', border:'none', color: tab===key ? 'white' : '#9B7BB5',
            borderBottom: tab===key ? '2px solid #C084FC' : '2px solid transparent',
            padding:'13px 16px', fontSize:'13px', fontWeight: tab===key ? '700' : '400', cursor:'pointer'
          }}>{label}</button>
        ))}
      </div>

      {/* ── 예산 가계부 탭 ─────────────────────────────── */}
      {tab === 'budget' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'13px', color:'#6B5B7B' }}>월 선택</span>
            <select value={month} onChange={e => setMonth(e.target.value)}
              style={{ border:'1px solid #D9D0E8', borderRadius:'8px', padding:'6px 10px', fontSize:'13px', background:'white', color:'#2D1B3D' }}>
              {MONTHS.map(m => <option key={m} value={m}>{mLabel(m)}</option>)}
            </select>
            <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
              <button onClick={() => { setModal('income'); setForm({ cat:'월급', amount:'' }); }}
                style={{ background:'#7C3AED', color:'white', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                + 수입 추가
              </button>
              <button onClick={() => { setModal('expense'); setForm({ cat:'식비', amount:'' }); }}
                style={{ background:'#EC4899', color:'white', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                + 지출 추가
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[
              { label:'총 수입', val:totIn, color:'#7C3AED', bg:'#FAF5FF', border:'#C4B5FD' },
              { label:'총 지출', val:totEx, color:'#EC4899', bg:'#FFF0F6', border:'#F9A8D4' },
              { label:'잔 액', val:bal, color: bal>=0 ? '#059669' : '#EF4444', bg: bal>=0 ? '#F0FDF4' : '#FFF5F5', border: bal>=0 ? '#6EE7B7' : '#FCA5A5' },
            ].map(({ label, val, color, bg, border }) => (
              <div key={label} style={{ ...card, background:bg, borderLeft:`4px solid ${border}` }}>
                <div style={{ fontSize:'11px', color:'#9B8FA0', marginBottom:'4px', letterSpacing:'0.04em' }}>{label}</div>
                <div style={{ fontSize:'22px', fontWeight:'700', color }}>{f(val)}원</div>
                <div style={{ fontSize:'11px', color:'#9B8FA0', marginTop:'2px' }}>
                  목표 {f(label==='총 수입' ? budgetIn : label==='총 지출' ? budgetEx : 0)}원
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:'12px', marginBottom:'16px' }}>
            <div style={card}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:'#6B5B7B', marginBottom:'10px' }}>📊 예산 VS 실제 지출</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={barData} margin={{ top:0, right:8, left:-15, bottom:36 }}>
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:'#9B8FA0' }} angle={-38} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize:9, fill:'#9B8FA0' }} tickFormatter={v => v >= 10000 ? (v/10000)+'만' : v} />
                  <Tooltip formatter={v => [`${f(v)}원`]} />
                  <Bar dataKey="예산" fill="#C4B5FD" radius={[3,3,0,0]} />
                  <Bar dataKey="실제" fill="#7C3AED" radius={[3,3,0,0]} />
                  <Legend wrapperStyle={{ fontSize:'10px', paddingTop:'8px' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={card}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:'#6B5B7B', marginBottom:'4px' }}>🥧 카테고리별 지출</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="46%" innerRadius={42} outerRadius={68} dataKey="value" nameKey="name">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${f(v)}원`]} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize:'9px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={card}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:'#6B5B7B', marginBottom:'10px' }}>💸 지출 예산 현황</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['항목','예산','실제','달성률'].map((h, i) => (
                    <th key={h} style={{ ...th, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.expenses.map((e, i) => {
                    const p = pct(e.actual, e.budget), over = e.budget > 0 && e.actual > e.budget;
                    return (
                      <tr key={e.id}>
                        <td style={td}>
                          <span style={{ display:'inline-block', width:'7px', height:'7px', borderRadius:'50%', background:C[i%C.length], marginRight:'5px' }} />
                          {e.cat}
                        </td>
                        <td style={{ ...td, textAlign:'right', color:'#9B8FA0' }}>{f(e.budget)}</td>
                        <td style={{ ...td, textAlign:'right', color: over ? '#EF4444' : '#2D1B3D', fontWeight: over ? '700' : '400' }}>{f(e.actual)}</td>
                        <td style={{ ...td, textAlign:'right', minWidth:'80px' }}>
                          <ProgressBar val={e.actual} max={e.budget} color={over ? '#EF4444' : C[i%C.length]} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background:'#F5F2FA' }}>
                    <td style={{ ...td, fontWeight:'700' }}>합계</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:'700' }}>{f(budgetEx)}</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:'700', color: totEx > budgetEx ? '#EF4444' : '#2D1B3D' }}>{f(totEx)}</td>
                    <td style={{ ...td, textAlign:'right' }}><ProgressBar val={totEx} max={budgetEx} color="#7C3AED" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={card}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:'#6B5B7B', marginBottom:'10px' }}>💵 수입 현황</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['항목','목표','실제','달성률'].map((h, i) => (
                    <th key={h} style={{ ...th, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.income.map((inc, i) => {
                    const p = pct(inc.actual, inc.budget);
                    return (
                      <tr key={inc.id}>
                        <td style={td}>{inc.cat}</td>
                        <td style={{ ...td, textAlign:'right', color:'#9B8FA0' }}>{f(inc.budget)}</td>
                        <td style={{ ...td, textAlign:'right', fontWeight:'600', color:'#7C3AED' }}>{f(inc.actual)}</td>
                        <td style={{ ...td, textAlign:'right', minWidth:'80px' }}>
                          <ProgressBar val={inc.actual} max={inc.budget} color="#7C3AED" />
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background:'#F5F2FA' }}>
                    <td style={{ ...td, fontWeight:'700' }}>합계</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:'700' }}>{f(budgetIn)}</td>
                    <td style={{ ...td, textAlign:'right', fontWeight:'700', color:'#7C3AED' }}>{f(totIn)}</td>
                    <td style={{ ...td, textAlign:'right' }}><ProgressBar val={totIn} max={budgetIn} color="#7C3AED" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 자금 확보 탭 ──────────────────────────────── */}
      {tab === 'goals' && (
        <div style={{ padding:'18px', maxWidth:'1100px', margin:'0 auto' }}>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
            {[
              { label:'목표 금액', val:`${f(totTarget)}원`, color:'#EF4444' },
              { label:'현재까지 확보', val:`${f(totSaved)}원`, color:'#22C55E' },
              { label:'남은 확보 금액', val:`${f(totRemain)}원`, color:'#F97316' },
              { label:'전체 진행률', val:`${overallPct.toFixed(1)}%`, color:'#3B82F6' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...card, borderTop:`3px solid ${color}` }}>
                <div style={{ fontSize:'11px', color:'#9B8FA0', marginBottom:'6px', letterSpacing:'0.04em' }}>{label}</div>
                <div style={{ fontSize:'20px', fontWeight:'700', color }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'12px' }}>
            {/* Transaction log */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', fontWeight:'600', color:'#6B5B7B' }}>📋 적립 내역</div>
                <button onClick={() => { setModal('saving'); setForm({ goal: goals[0].name, amount:'', date: new Date().toISOString().slice(0,10) }); }}
                  style={{ background:'#EF4444', color:'white', border:'none', borderRadius:'6px', padding:'5px 10px', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                  + 적립 추가
                </button>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  <th style={th}>날짜</th>
                  <th style={th}>항목</th>
                  <th style={{ ...th, textAlign:'right' }}>금액</th>
                </tr></thead>
                <tbody>
                  {txs.slice(0, 15).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ ...td, color:'#9B8FA0', fontSize:'11px' }}>{tx.date}</td>
                      <td style={td}>{tx.goal}</td>
                      <td style={{ ...td, textAlign:'right', color:'#22C55E', fontWeight:'600' }}>{f(tx.amount)}</td>
                    </tr>
                  ))}
                  {txs.length === 0 && (
                    <tr><td colSpan={3} style={{ ...td, textAlign:'center', color:'#9B8FA0', padding:'24px' }}>적립 내역이 없어요</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Goal cards grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', alignContent:'start' }}>
              {goals.map(g => {
                const p = pct(g.saved, g.target);
                const remain = g.target - g.saved;
                const months = g.monthly > 0 ? Math.ceil(remain / g.monthly) : 0;
                const eta = new Date();
                eta.setMonth(eta.getMonth() + months);
                const etaStr = months > 0 ? `${eta.getFullYear()}-${String(eta.getMonth()+1).padStart(2,'0')}` : '달성완료';
                return (
                  <div key={g.id} style={{ ...card, borderTop:`3px solid ${g.color}` }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#2D1B3D', marginBottom:'10px' }}>{g.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <Donut p={p} color={g.color} size={88} />
                      <div style={{ flex:1 }}>
                        {[['목표 금액', g.target], ['확보 금액', g.saved], ['남은 금액', remain]].map(([l, v]) => (
                          <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'3px' }}>
                            <span style={{ color:'#9B8FA0' }}>{l}</span>
                            <span style={{ fontWeight:'600', color:'#2D1B3D' }}>{f(v)}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginTop:'5px', paddingTop:'5px', borderTop:'1px solid #F5F2FA' }}>
                          <span style={{ color:'#9B8FA0' }}>월 적립</span>
                          <span style={{ fontWeight:'600', color:'#9B8FA0' }}>{f(g.monthly)}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginTop:'3px' }}>
                          <span style={{ color:'#9B8FA0' }}>예상 달성</span>
                          <span style={{ fontWeight:'700', color:g.color }}>{etaStr}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 모달 ──────────────────────────────────────── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'white', borderRadius:'16px', padding:'24px', width:'300px' }}>
            <div style={{ fontSize:'15px', fontWeight:'700', color:'#2D1B3D', marginBottom:'18px' }}>
              {modal === 'expense' ? '💸 지출 추가' : modal === 'income' ? '💵 수입 추가' : '💰 적립 추가'}
            </div>

            {modal === 'saving' ? (<>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:'#6B5B7B', marginBottom:'5px' }}>목표 항목</div>
                <select value={form.goal || ''} onChange={e => setForm({ ...form, goal:e.target.value })}
                  style={{ width:'100%', border:'1px solid #D9D0E8', borderRadius:'8px', padding:'8px 10px', fontSize:'13px' }}>
                  {goals.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:'#6B5B7B', marginBottom:'5px' }}>날짜</div>
                <input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date:e.target.value })}
                  style={{ width:'100%', border:'1px solid #D9D0E8', borderRadius:'8px', padding:'8px 10px', fontSize:'13px' }} />
              </div>
            </>) : (
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:'#6B5B7B', marginBottom:'5px' }}>카테고리</div>
                <input value={form.cat || ''} onChange={e => setForm({ ...form, cat:e.target.value })}
                  placeholder={modal === 'expense' ? '식비, 교통비 ...' : '월급, 상여금 ...'}
                  style={{ width:'100%', border:'1px solid #D9D0E8', borderRadius:'8px', padding:'8px 10px', fontSize:'13px' }} />
              </div>
            )}

            <div style={{ marginBottom:'18px' }}>
              <div style={{ fontSize:'12px', color:'#6B5B7B', marginBottom:'5px' }}>금액 (원)</div>
              <input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount:e.target.value })}
                placeholder="0"
                style={{ width:'100%', border:'1px solid #D9D0E8', borderRadius:'8px', padding:'8px 10px', fontSize:'13px' }} />
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => { setModal(null); setForm({}); }}
                style={{ flex:1, background:'#F5F2FA', color:'#6B5B7B', border:'none', borderRadius:'8px', padding:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                취소
              </button>
              <button onClick={addItem}
                style={{ flex:1, background: modal==='saving' ? '#EF4444' : modal==='expense' ? '#EC4899' : '#7C3AED', color:'white', border:'none', borderRadius:'8px', padding:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
