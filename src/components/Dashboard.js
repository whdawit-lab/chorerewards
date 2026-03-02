import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useFamily, useKidData, calcPoints, calcBalance,
  completeChore, uncompleteChore, logGrade, deleteGrade,
  logBehavior, deleteBehavior, requestPurchase, updateTransaction,
  addGoal, deleteGoal, updateGoalPriority,
  logSession, updateSession, addActivity,
  requestScreenTime, updateScreenRequest,
  payBill, addBill } from '../lib/data';
import { supabase } from '../lib/supabase';
import { ReportsTab, AllReports } from './ReportsTab';

const COLORS = { elham:'#e0623a', ezekiel:'#3a9e7c', zara:'#9b5fd4' };
const GRADE_OPTIONS = [
  { grade:'A', label:'Excellent', pts:25, emoji:'🟢' },
  { grade:'B', label:'Good',      pts:15, emoji:'🔵' },
  { grade:'C', label:'Passing',   pts:8,  emoji:'🟠' },
  { grade:'⭐', label:'Star/Award',pts:30, emoji:'⭐' },
];
const SCREEN_OPTIONS = [
  { mins:15, ptsCost:10, balCost:0.50 },
  { mins:30, ptsCost:20, balCost:1.00 },
  { mins:60, ptsCost:35, balCost:2.00 },
  { mins:90, ptsCost:50, balCost:3.00 },
  { mins:120,ptsCost:65, balCost:4.00 },
];

// ── Modal ──────────────────────────────────────────────────────
function Modal({ msg, onConfirm, onCancel, confirmLabel='Confirm', confirmColor='#d44a4a' }) {
  return (
    <div style={mS.overlay} onClick={onCancel}>
      <div style={mS.box} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:'1.4rem',marginBottom:10}}>⚠️</div>
        <p style={mS.msg}>{msg}</p>
        <div style={mS.row}>
          <button style={mS.cancel} onClick={onCancel}>Cancel</button>
          {onConfirm && <button style={{...mS.confirm, background:confirmColor}} onClick={onConfirm}>{confirmLabel}</button>}
        </div>
      </div>
    </div>
  );
}
const mS = {
  overlay: { position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center' },
  box:     { background:'white',borderRadius:18,padding:'28px 32px',maxWidth:340,width:'90%',textAlign:'center',boxShadow:'0 8px 40px rgba(0,0,0,0.2)',fontFamily:"'Nunito',sans-serif" },
  msg:     { fontWeight:800,fontSize:'1rem',marginBottom:20,color:'#2b2620',whiteSpace:'pre-line' },
  row:     { display:'flex',gap:10,justifyContent:'center' },
  cancel:  { padding:'9px 22px',borderRadius:10,border:'2px solid #ddd',background:'white',color:'#888',fontFamily:"'Nunito',sans-serif",fontWeight:800,cursor:'pointer',fontSize:'0.9rem' },
  confirm: { padding:'9px 22px',borderRadius:10,border:'none',color:'white',fontFamily:"'Nunito',sans-serif",fontWeight:800,cursor:'pointer',fontSize:'0.9rem' },
};

// ── KidPanel — all tabs for one kid ───────────────────────────
function KidPanel({ kid, familyId, onUpdate }) {
  const { data, loading, reload } = useKidData(kid.id, familyId);
  const [activeTab,   setActiveTab]   = useState('chores');
  const [modal,       setModal]       = useState(null);
  const [busy,        setBusy]        = useState(false);

  const refresh = useCallback(async () => { await reload(); onUpdate(); }, [reload, onUpdate]);

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); await refresh(); }
    catch(e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const confirm = (msg, fn, opts={}) => setModal({ msg, fn, ...opts });

  if (loading || !data) return <div style={{padding:40,textAlign:'center',color:'#aaa'}}>Loading…</div>;

  const pts     = calcPoints(data);
  const bal     = calcBalance(data);
  const color   = kid.color || '#e0623a';
  const tabs    = ['chores','school','behavior','bills','extras','screentime','goals','wallet','reports'];
  // ── Which chores are completed this week ──────────────────
  const today    = new Date();
  const weekKey  = `${today.getFullYear()}-W${String(Math.ceil(today.getDate()/7)).padStart(2,'0')}`;
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const doneIds  = new Set(
    (data.completions||[])
      .filter(c => c.week_key === weekKey || c.month_key === monthKey)
      .map(c => c.chore_id)
  );

  return (
    <div>
      {/* Kid banner */}
      <div style={{...s.banner, borderColor: color}}>
        <div style={s.bannerEmoji}>{kid.emoji}</div>
        <div style={{flex:1}}>
          <div style={{...s.bannerName, color}}>{kid.name}</div>
          <div style={s.bannerTagline}>{kid.tagline}</div>
        </div>
        <div style={s.statsRow}>
          <div style={s.stat}><div style={{...s.statVal, color}}>{pts.total} pts</div><div style={s.statLbl}>Total</div></div>
          <div style={s.stat}><div style={{...s.statVal, color:'#b89000'}}>${bal.balance.toFixed(2)}</div><div style={s.statLbl}>Balance</div></div>
        </div>
      </div>

      {/* Sub tabs */}
      <div style={s.subTabs}>
        {tabs.map(t => (
          <button key={t} style={{...s.subTab, ...(activeTab===t ? {...s.subTabActive, background:color} : {})}}
            onClick={() => setActiveTab(t)}>
            {{'chores':'🧹 Chores','school':'📚 School','behavior':'😤 Behavior',
              'bills':'🏠 Bills','extras':'🏆 Extras','screentime':'📱 Screen',
              'goals':'🎯 Goals','wallet':'💰 Wallet'}[t]}
          </button>
        ))}
      </div>

      {/* ── CHORES ── */}
      {activeTab==='chores' && (
        <ChoresTab kid={kid} data={data} doneIds={doneIds} weekKey={weekKey} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── SCHOOL ── */}
      {activeTab==='school' && (
        <SchoolTab kid={kid} data={data} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── BEHAVIOR ── */}
      {activeTab==='behavior' && (
        <BehaviorTab kid={kid} data={data} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── BILLS ── */}
      {activeTab==='bills' && (
        <BillsTab kid={kid} data={data} bal={bal} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── EXTRAS ── */}
      {activeTab==='extras' && (
        <ExtrasTab kid={kid} data={data} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── SCREEN TIME ── */}
      {activeTab==='screentime' && (
        <ScreenTab kid={kid} data={data} pts={pts} bal={bal} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── GOALS ── */}
      {activeTab==='goals' && (
        <GoalsTab kid={kid} data={data} pts={pts} bal={bal} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {/* ── WALLET ── */}
      {activeTab==='wallet' && ({activeTab==='reports' && (
  <ReportsTab kid={kid} data={data} color={color} />
)}
        <WalletTab kid={kid} data={data} pts={pts} bal={bal} color={color} act={act} confirm={confirm} familyId={familyId} />
      )}

      {modal && (
        <Modal msg={modal.msg} confirmLabel={modal.confirmLabel||'Confirm'} confirmColor={modal.confirmColor||'#d44a4a'}
          onConfirm={async () => { setModal(null); await act(modal.fn); }}
          onCancel={() => setModal(null)} />
      )}
      {busy && <div style={s.busyOverlay}><div style={s.busySpinner}/></div>}
    </div>
  );
}

// ── CHORES TAB ────────────────────────────────────────────────
function ChoresTab({ kid, data, doneIds, weekKey, color, act, confirm, familyId }) {
  const daily   = (data.chores||[]).filter(c => c.frequency==='daily');
  const weekly  = (data.chores||[]).filter(c => c.frequency==='weekly');
  const monthly = (data.chores||[]).filter(c => c.frequency==='monthly');

  const toggle = (chore) => {
    const done = doneIds.has(chore.id);
    if (done) {
      confirm(`Unmark "${chore.name}"?`, () => uncompleteChore(chore.id, kid.id));
    } else {
      act(() => completeChore(chore, kid.id, familyId));
    }
  };

  const ChoreCard = ({ chore }) => {
    const done = doneIds.has(chore.id);
    return (
      <div style={{...s.choreCard, ...(done ? {...s.choreDone, borderColor:color, background:color+'18'} : {})}}
        onClick={() => toggle(chore)}>
        <div style={s.choreIcon}>{chore.icon}{done?' ⭐':''}</div>
        <div style={s.choreName}>{chore.name}</div>
        <div style={s.choreBottom}>
          <span style={{...s.chorePts, ...(done?{color}:{})}}>{done?'✓ ':''}{chore.pts} pts</span>
          <span style={s.choreStatus}>{done?'Done!':'Tap!'}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={s.sectionLabel}>📅 Daily</div>
      <div style={s.choreGrid}>{daily.map(c => <ChoreCard key={c.id} chore={c}/>)}</div>
      <div style={s.sectionLabel}>🗓 Weekly</div>
      <div style={s.choreGrid}>{weekly.map(c => <ChoreCard key={c.id} chore={c}/>)}</div>
      {monthly.length > 0 && <>
        <div style={s.sectionLabel}>🧹 Monthly Deep Clean</div>
        <div style={s.choreGrid}>{monthly.map(c => <ChoreCard key={c.id} chore={c}/>)}</div>
      </>}
    </div>
  );
}

// ── SCHOOL TAB ────────────────────────────────────────────────
function SchoolTab({ kid, data, color, act, confirm, familyId }) {
  const [subject, setSubject] = useState('');

  const doLog = (grade, pts) => {
    const sub = subject.trim() || 'General';
    act(() => logGrade(kid.id, familyId, sub, grade, pts));
    setSubject('');
  };

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">🎓 Log a Grade</div>
      <input style={s.input} placeholder="Subject (e.g. Math, Reading…)" value={subject} onChange={e=>setSubject(e.target.value)} />
      <div style={s.gradeGrid}>
        {GRADE_OPTIONS.map(g => (
          <div key={g.grade} style={{...s.gradeBtn, borderColor:color+'44', background:color+'11'}} onClick={() => doLog(g.grade, g.pts)}>
            <div style={{fontSize:'1.4rem'}}>{g.emoji}</div>
            <div style={{fontWeight:900, fontSize:'1.1rem', color}}>{g.grade}</div>
            <div style={{fontSize:'0.76rem', color:'#888'}}>{g.label}</div>
            <div style={{fontSize:'0.76rem', fontWeight:800, color:color}}>+{g.pts} pts</div>
          </div>
        ))}
      </div>
      <div style={s.sectionLabel}>📋 School History</div>
      {(data.grades||[]).length === 0
        ? <div style={s.empty}>No grades logged yet!</div>
        : (data.grades||[]).map(g => (
          <div key={g.id} style={s.logRow}>
            <span>{g.subject}</span>
            <span style={{fontWeight:900}}>{g.grade}</span>
            <span style={s.ts}>{new Date(g.logged_at).toLocaleDateString()}</span>
            <span style={{...s.pts, color:color}}>+{g.pts} pts</span>
            <button style={s.rmBtn} onClick={() => confirm(`Remove ${g.subject} — ${g.grade}?`, () => deleteGrade(g.id))}>✕</button>
          </div>
        ))
      }
    </div>
  );
}

// ── BEHAVIOR TAB ──────────────────────────────────────────────
function BehaviorTab({ kid, data, color, act, confirm, familyId }) {
  const [reason, setReason] = useState('');
  const [pts,    setPts]    = useState('');

  const PRESETS = kid.name === 'Elham'
    ? [{icon:'🗣️',name:'Back talk',pts:10},{icon:'🤥',name:'Lying',pts:15},{icon:'😤',name:'Tantrum',pts:8},{icon:'👊',name:'Fighting',pts:12},{icon:'📵',name:'Screen overuse',pts:8},{icon:'🚫',name:'Ignoring instructions',pts:10}]
    : kid.name === 'Ezekiel'
    ? [{icon:'😠',name:'Not sharing',pts:6},{icon:'🤥',name:'Lying',pts:10},{icon:'😤',name:'Tantrum',pts:6},{icon:'👊',name:'Hitting',pts:8},{icon:'🚫',name:'Ignoring',pts:6},{icon:'🗣️',name:'Talking back',pts:6}]
    : [{icon:'😤',name:'Tantrum',pts:4},{icon:'👊',name:'Hitting',pts:5},{icon:'😠',name:'Not sharing',pts:3},{icon:'🚫',name:'Not listening',pts:3}];

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">😤 Behavior Deductions</div>
      <p style={s.hint}>Tap to deduct points (parent only).</p>
      <div style={s.behaviorGrid}>
        {PRESETS.map((b,i) => (
          <div key={i} style={s.behaviorBtn}
            onClick={() => confirm(`Deduct ${b.pts} pts from ${kid.name} for "${b.name}"?`, () => logBehavior(kid.id, familyId, b.name, b.pts))}>
            <div style={{fontSize:'1.6rem'}}>{b.icon}</div>
            <div style={{fontSize:'0.8rem',fontWeight:800,color:'#555'}}>{b.name}</div>
            <div style={{fontSize:'0.76rem',fontWeight:900,color:'#d44a4a'}}>-{b.pts} pts</div>
          </div>
        ))}
      </div>
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>✏️ Custom Deduction</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...s.input,flex:2}} placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)} />
          <input style={{...s.input,flex:1,minWidth:70}} type="number" placeholder="pts" value={pts} onChange={e=>setPts(e.target.value)} />
          <button style={{...s.btn,background:'#d44a4a'}} onClick={() => {
            if (!reason||!pts) return;
            confirm(`Deduct ${pts} pts from ${kid.name} for "${reason}"?`, () => { logBehavior(kid.id,familyId,reason,parseInt(pts)); setReason(''); setPts(''); });
          }}>Deduct</button>
        </div>
      </div>
      <div style={s.sectionLabel}>📋 Behavior Log</div>
      {(data.behavior||[]).length===0
        ? <div style={s.empty}>No deductions yet! Keep it up 🌟</div>
        : (data.behavior||[]).map(b => (
          <div key={b.id} style={s.logRow}>
            <span>😤 {b.reason}</span>
            <span style={s.ts}>{new Date(b.logged_at).toLocaleDateString()}</span>
            <span style={{fontWeight:900,color:'#d44a4a'}}>-{b.pts} pts</span>
            <button style={s.rmBtn} onClick={() => confirm(`Remove this deduction?`, () => deleteBehavior(b.id))}>✕</button>
          </div>
        ))
      }
    </div>
  );
}

// ── BILLS TAB ─────────────────────────────────────────────────
function BillsTab({ kid, data, bal, color, act, confirm, familyId }) {
  const [name, setName] = useState('');
  const [amt,  setAmt]  = useState('');
  const [due,  setDue]  = useState('');

  if (kid.name === 'Zara') return (
    <div style={s.panel}><div style={s.empty}>Bills are for Elham and Ezekiel only.</div></div>
  );

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">🏠 Monthly Bills</div>
      <div style={s.billsGrid}>
        {(data.bills||[]).map(b => (
          <div key={b.id} style={{...s.billCard, borderColor: b.status==='paid'?'#3a9e62':b.status==='overdue'?'#d44a4a':'#ff9800', background: b.status==='paid'?'#f4fbf6':b.status==='overdue'?'#fff8f8':'#fffbe8'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:900}}>{b.name}</span>
              <span style={{fontWeight:900,color:b.status==='paid'?'#3a9e62':'#d44a4a'}}>${parseFloat(b.amount).toFixed(2)}</span>
            </div>
            <div style={{fontSize:'0.72rem',color:'#aaa'}}>Due: {b.due_date}</div>
            <span style={{...s.badge, background:b.status==='paid'?'#d4edda':b.status==='overdue'?'#fce8e8':'#fff0cc', color:b.status==='paid'?'#3a9e62':b.status==='overdue'?'#d44a4a':'#b86000'}}>
              {b.status==='paid'?'✓ Paid':b.status==='overdue'?'⚠ Overdue':'⏰ Due'}
            </span>
            {b.status!=='paid' && (
              <button style={s.payBtn} onClick={() => {
                if (bal.balance < parseFloat(b.amount)) { alert(`Not enough balance! Need $${parseFloat(b.amount).toFixed(2)} but only have $${bal.balance.toFixed(2)}`); return; }
                confirm(`Pay "${b.name}" — $${parseFloat(b.amount).toFixed(2)} from ${kid.name}'s balance?`, () => payBill(b.id, kid.id, familyId, b.name, parseFloat(b.amount)));
              }}>💳 Pay Bill</button>
            )}
          </div>
        ))}
      </div>
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>➕ Add a Bill</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...s.input,flex:2}} placeholder="Bill name" value={name} onChange={e=>setName(e.target.value)} />
          <input style={{...s.input,flex:1,minWidth:80}} type="number" placeholder="$" value={amt} onChange={e=>setAmt(e.target.value)} />
          <input style={{...s.input,flex:1,minWidth:100}} placeholder="Due date" value={due} onChange={e=>setDue(e.target.value)} />
          <button style={s.btn} onClick={() => { if(!name||!amt) return; act(()=>addBill(kid.id,familyId,name,parseFloat(amt),due||'End of month')); setName('');setAmt('');setDue(''); }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ── EXTRAS TAB ────────────────────────────────────────────────
function ExtrasTab({ kid, data, color, act, confirm, familyId }) {
  const [actId,   setActId]   = useState('');
  const [mins,    setMins]    = useState('');
  const [notes,   setNotes]   = useState('');
  const [aIcon,   setAIcon]   = useState('');
  const [aName,   setAName]   = useState('');
  const [aPpm,    setAPpm]    = useState('');

  const pending  = (data.sessions||[]).filter(s => s.status==='pending');
  const approved = (data.sessions||[]).filter(s => s.status==='approved');
  const acts     = data.activities||[];
  const selAct   = acts.find(a => a.id===actId) || acts[0];

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">🏆 Extracurricular Activities</div>
      <div style={s.actGrid}>
        {acts.map(a => {
          const mySessions = approved.filter(s => s.activity_id===a.id);
          const totalMins  = mySessions.reduce((sum,s)=>sum+s.minutes,0);
          const totalPts   = mySessions.reduce((sum,s)=>sum+s.pts,0);
          return (
            <div key={a.id} style={s.actCard}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:'1.6rem'}}>{a.icon}</span>
                <span style={{fontWeight:900,fontSize:'0.9rem'}}>{a.name}</span>
              </div>
              <div style={{fontSize:'0.72rem',color:'#aaa'}}>{a.pts_per_min} pts/min</div>
              {mySessions.length>0 && <div style={{fontSize:'0.72rem',fontWeight:800,color:color}}>+{totalPts} pts · {totalMins} min</div>}
            </div>
          );
        })}
      </div>
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>📝 Log a Session</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select style={{...s.input,flex:2}} value={actId} onChange={e=>setActId(e.target.value)}>
            {acts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.pts_per_min} pts/min)</option>)}
          </select>
          <input style={{...s.input,flex:1,minWidth:80}} type="number" placeholder="mins" value={mins} onChange={e=>setMins(e.target.value)} />
          <input style={{...s.input,flex:2}} placeholder="What did you learn? (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
          <button style={s.btn} onClick={() => {
            const a = acts.find(x=>x.id===actId)||acts[0];
            if (!a||!mins) return;
            const p = Math.round(parseInt(mins)*a.pts_per_min);
            act(()=>logSession(kid.id,familyId,a.id,a.name,a.icon,parseInt(mins),p,notes));
            setMins(''); setNotes('');
          }}>Log ✏️</button>
        </div>
      </div>
      {pending.length>0 && (
        <div style={s.pendingBox}>
          <div style={s.pendingTitle}>⏳ Pending ({pending.length})</div>
          {pending.map(s => (
            <div key={s.id} style={s.pendingItem||{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f0e0a0',fontSize:'0.83rem'}}>
              <span>{s.activity_icon} {s.activity_name}</span>
              <span style={{fontWeight:800}}>{s.minutes} min</span>
              {s.notes&&<span style={{color:'#aaa',flex:1}}>{s.notes}</span>}
              <span style={{fontWeight:900,color:'#b86000'}}>+{s.pts} pts</span>
              <button style={s.approveBtn} onClick={()=>act(()=>updateSession(s.id,'approved'))}>✓</button>
              <button style={s.denyBtn}    onClick={()=>act(()=>updateSession(s.id,'denied'))}>✗</button>
            </div>
          ))}
        </div>
      )}
      <div style={s.sectionLabel}>📋 Approved Sessions</div>
      {approved.length===0 ? <div style={s.empty}>No approved sessions yet!</div>
        : approved.map(s => (
          <div key={s.id} style={s.logRow||{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5efe0',fontSize:'0.83rem',gap:8}}>
            <span>{s.activity_icon} {s.activity_name}</span>
            <span style={{color:'#888',fontSize:'0.76rem'}}>{s.minutes} min{s.notes?` · ${s.notes}`:''}</span>
            <span style={{color:'#aaa',fontSize:'0.72rem'}}>{new Date(s.logged_at).toLocaleDateString()}</span>
            <span style={{fontWeight:900,color:'#3a9e62'}}>+{s.pts} pts</span>
          </div>
        ))
      }
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>➕ Add Custom Activity</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...s.input,flex:1,minWidth:60}} placeholder="Emoji" value={aIcon} onChange={e=>setAIcon(e.target.value)} />
          <input style={{...s.input,flex:2}} placeholder="Name" value={aName} onChange={e=>setAName(e.target.value)} />
          <input style={{...s.input,flex:1,minWidth:70}} type="number" placeholder="pts/min" value={aPpm} onChange={e=>setAPpm(e.target.value)} />
          <button style={s.btn} onClick={()=>{ if(!aName||!aPpm)return; act(()=>addActivity(kid.id,familyId,aName,aIcon||'⭐',parseFloat(aPpm))); setAIcon('');setAName('');setAPpm(''); }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN TIME TAB ───────────────────────────────────────────
function ScreenTab({ kid, data, pts, bal, color, act, confirm, familyId }) {
  const [reqMins, setReqMins] = useState('');
  const [reqType, setReqType] = useState('pts');
  const today = new Date().toISOString().split('T')[0];
  const todayReqs = (data.screenReqs||[]).filter(r=>r.date===today);
  const earnedMins = todayReqs.filter(r=>r.status==='approved').reduce((s,r)=>s+r.minutes,0);
  const pending    = todayReqs.filter(r=>r.status==='pending');

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">📱 Screen Time</div>
      <div style={{...s.banner, borderColor:color, marginBottom:16}}>
        <div style={s.statsRow}>
          <div style={s.stat}><div style={{...s.statVal,color:'#2196f3'}}>{earnedMins}</div><div style={s.statLbl}>Bonus mins earned today</div></div>
          <div style={s.stat}><div style={{...s.statVal,color}}>{pts.total} pts</div><div style={s.statLbl}>Available pts</div></div>
          <div style={s.stat}><div style={{...s.statVal,color:'#b89000'}}>${bal.balance.toFixed(2)}</div><div style={s.statLbl}>Balance</div></div>
        </div>
      </div>
      <div style={s.sectionLabel}>🎁 Earn More Screen Time</div>
      <div style={s.screenGrid}>
        {SCREEN_OPTIONS.map(o => (
          <div key={o.mins} style={s.screenCard} onClick={() => {
            const msg = `Buy ${o.mins} min of screen time?\n\nOption A: ${o.ptsCost} pts\nOption B: $${o.balCost.toFixed(2)} balance`;
            confirm(msg, null);
            // Show choice modal separately
          }}>
            <div style={{fontSize:'1.4rem',fontWeight:900,color:'#2196f3'}}>+{o.mins} min</div>
            <div style={{fontSize:'0.78rem',color:'#aaa',marginTop:3}}>{o.ptsCost} pts or ${o.balCost.toFixed(2)}</div>
            <ScreenBuyButtons kid={kid} data={data} pts={pts} bal={bal} opt={o} act={act} familyId={familyId} />
          </div>
        ))}
      </div>
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>✋ Request Custom Amount</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...s.input,flex:1,minWidth:110}} type="number" placeholder="Minutes" value={reqMins} onChange={e=>setReqMins(e.target.value)} />
          <select style={{...s.input,flex:1,minWidth:140}} value={reqType} onChange={e=>setReqType(e.target.value)}>
            <option value="pts">Pay with points</option>
            <option value="bal">Pay with balance</option>
          </select>
          <button style={s.btn} onClick={()=>{ if(!reqMins)return; act(()=>requestScreenTime(kid.id,familyId,parseInt(reqMins),0,reqType)); setReqMins(''); }}>Request 📱</button>
        </div>
      </div>
      {pending.length>0 && (
        <div style={s.pendingBox}>
          <div style={s.pendingTitle}>⏳ Pending ({pending.length})</div>
          {pending.map(r => (
            <div key={r.id} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',fontSize:'0.83rem',flexWrap:'wrap'}}>
              <span>📱 {r.minutes} min</span>
              <span style={{color:'#aaa',fontSize:'0.72rem'}}>{r.created_at&&new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
              <button style={s.approveBtn} onClick={()=>act(()=>updateScreenRequest(r.id,'approved'))}>✓ Approve</button>
              <button style={s.denyBtn}    onClick={()=>act(()=>updateScreenRequest(r.id,'denied'))}>✗ Deny</button>
            </div>
          ))}
        </div>
      )}
      <div style={s.sectionLabel}>📊 This Week</div>
      <WeeklyReport data={data} />
    </div>
  );
}

function ScreenBuyButtons({ kid, data, pts, bal, opt, act, familyId }) {
  return (
    <div style={{display:'flex',gap:6,marginTop:8,justifyContent:'center'}}>
      <button style={{...s.approveBtn,background:'#2196f3'}} onClick={e=>{ e.stopPropagation();
        if(pts.total<opt.ptsCost){alert(`Need ${opt.ptsCost} pts`);return;}
        act(()=>requestScreenTime(kid.id,familyId,opt.mins,opt.ptsCost,'pts'));
      }}>{opt.ptsCost} pts</button>
      <button style={{...s.approveBtn,background:'#3a9e62'}} onClick={e=>{ e.stopPropagation();
        if(bal.balance<opt.balCost){alert(`Need $${opt.balCost.toFixed(2)}`);return;}
        act(()=>requestScreenTime(kid.id,familyId,opt.mins,opt.balCost,'bal'));
      }}>${opt.balCost.toFixed(2)}</button>
    </div>
  );
}

function WeeklyReport({ data }) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  return (
    <div style={{background:'#f8f8f8',borderRadius:12,padding:'14px 16px'}}>
      {[6,5,4,3,2,1,0].map(d => {
        const dt   = new Date(today); dt.setDate(today.getDate()-d);
        const dStr = dt.toISOString().split('T')[0];
        const mins = (data.screenReqs||[]).filter(r=>r.status==='approved'&&r.date===dStr).reduce((s,r)=>s+r.minutes,0);
        const pct  = Math.min(100, mins/120*100);
        return (
          <div key={d} style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{width:36,fontSize:'0.76rem',fontWeight:800,color:'#888'}}>{d===0?'Today':days[dt.getDay()]}</div>
            <div style={{flex:1,height:10,background:'#eee',borderRadius:20,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'#2196f3',borderRadius:20,transition:'width 0.5s'}}/>
            </div>
            <div style={{width:48,fontSize:'0.74rem',fontWeight:800,color:'#aaa',textAlign:'right'}}>{mins} min</div>
          </div>
        );
      })}
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────
function GoalsTab({ kid, data, pts, bal, color, act, confirm, familyId }) {
  const [name,   setName]   = useState('');
  const [emoji,  setEmoji]  = useState('');
  const [cost,   setCost]   = useState('');
  const [notes,  setNotes]  = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [fetchedImg, setFetchedImg] = useState(null);
  const [fetching,   setFetching]   = useState(false);

  const goals = (data.goals||[]).slice().sort((a,b)=>a.priority-b.priority);

  const fetchImage = async () => {
    if (!imgUrl.trim()) return;
    setFetching(true);
    try {
      const proxy = 'https://api.allorigins.win/get?url='+encodeURIComponent(imgUrl.trim());
      const res   = await fetch(proxy);
      const json  = await res.json();
      const doc   = new DOMParser().parseFromString(json.contents,'text/html');
      const ogImg = doc.querySelector('meta[property="og:image"]');
      const ogTtl = doc.querySelector('meta[property="og:title"]') || doc.querySelector('title');
      if (ogImg) {
        const url  = ogImg.getAttribute('content');
        const title = ogTtl ? (ogTtl.getAttribute('content')||ogTtl.textContent||'') : '';
        setFetchedImg({ url, title: title.substring(0,80) });
        if (!name) setName(title.substring(0,60));
      } else {
        // Direct image URL
        if (/\.(jpg|jpeg|png|gif|webp)/i.test(imgUrl)) setFetchedImg({ url: imgUrl, title:'' });
        else alert('Could not fetch image. Try pasting a direct image URL instead.');
      }
    } catch { alert('Fetch failed. Try pasting a direct image URL.'); }
    setFetching(false);
  };

  const doAdd = () => {
    if (!name||!cost) return;
    act(()=>addGoal(kid.id,familyId,{ name, emoji:emoji||'🎁', cost:parseFloat(cost), notes, image_url: fetchedImg?.url||null, priority: goals.length }));
    setName('');setEmoji('');setCost('');setNotes('');setImgUrl('');setFetchedImg(null);
  };

  return (
    <div style={s.panel}>
      <div style={s.sectionLabel} className="mt0">🎯 Wishlist & Goals</div>
      {goals.length===0 ? <div style={s.empty}>No goals yet — add something to save up for!</div>
        : goals.map((g,i) => {
          const neededPts  = Math.ceil(g.cost/10*100);
          const dollarPct  = Math.min(100,Math.round(bal.balance/g.cost*100));
          const achieved   = bal.balance >= g.cost;
          return (
            <div key={g.id} style={{...s.goalCard, ...(i===0?{borderWidth:3,borderColor:color}:{}), ...(achieved?{borderColor:'#f5c518',background:'#fffbe8'}:{})}}>
              {i===0 && <div style={{...s.badge,background:color,color:'white',position:'absolute',top:-10,left:14}}>⭐ Top Goal</div>}
              <div style={s.goalImg}>
                {g.image_url ? <img src={g.image_url} alt={g.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}} />:null}
                <span style={{display:g.image_url?'none':'block',fontSize:'2rem'}}>{g.emoji}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:'1rem',marginBottom:2}}>{g.name}</div>
                {g.notes&&<div style={{fontSize:'0.74rem',color:'#aaa',marginBottom:6}}>{g.notes}</div>}
                <div style={{fontSize:'0.74rem',color:'#aaa',marginBottom:8}}>Goal: <strong>${parseFloat(g.cost).toFixed(2)}</strong> · {neededPts} pts needed</div>
                <div style={{height:12,background:'#f0ebe0',borderRadius:20,overflow:'hidden',marginBottom:6}}>
                  <div style={{height:'100%',width:`${dollarPct}%`,borderRadius:20,background:achieved?'linear-gradient(90deg,#f5c518,#ffe066)':`linear-gradient(90deg,${color},${color}88)`,transition:'width 0.6s'}}/>
                </div>
                <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:8}}>
                  <div style={s.goalStat}><span style={{fontWeight:900}}>{pts.total}/{neededPts}</span><span style={{color:'#aaa',fontSize:'0.7rem'}}> pts</span></div>
                  <div style={s.goalStat}><span style={{fontWeight:900}}>${bal.balance.toFixed(2)}/${parseFloat(g.cost).toFixed(2)}</span><span style={{color:'#aaa',fontSize:'0.7rem'}}> saved</span></div>
                </div>
                {achieved && <div style={{...s.badge,background:'#f5c518',color:'#7a5a00',marginBottom:8}}>🎉 You can afford this!</div>}
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {i>0&&<button style={s.rmBtn} onClick={()=>act(()=>updateGoalPriority(g.id,g.priority-1))}>↑ Move up</button>}
                  <button style={s.rmBtn} onClick={()=>confirm('Remove this goal?',()=>deleteGoal(g.id))}>✕ Remove</button>
                </div>
              </div>
            </div>
          );
        })
      }
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>✨ Add a New Goal</div>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input style={{...s.input,flex:1}} placeholder="Amazon or product URL (optional)" value={imgUrl} onChange={e=>setImgUrl(e.target.value)} />
          <button style={{...s.btn,background:'#ff9800',whiteSpace:'nowrap'}} onClick={fetchImage} disabled={fetching}>{fetching?'…':'🔍 Fetch'}</button>
        </div>
        {fetchedImg && (
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,padding:8,background:'#f8f8f8',borderRadius:10}}>
            <img src={fetchedImg.url} alt="" style={{width:44,height:44,borderRadius:8,objectFit:'cover'}} />
            <span style={{fontSize:'0.8rem',fontWeight:800,color:'#555',flex:1}}>{fetchedImg.title}</span>
            <button style={s.rmBtn} onClick={()=>setFetchedImg(null)}>✕</button>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input style={s.input} placeholder="What do you want? (e.g. Pikachu)" value={name} onChange={e=>setName(e.target.value)} />
          <input style={s.input} placeholder="Emoji fallback (e.g. 🎮)" value={emoji} onChange={e=>setEmoji(e.target.value)} />
          <input style={s.input} type="number" placeholder="Cost in $" value={cost} onChange={e=>setCost(e.target.value)} />
          <input style={s.input} placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <button style={{...s.btn,background:color,width:'100%',marginTop:8}} onClick={doAdd}>＋ Add to Wishlist</button>
      </div>
    </div>
  );
}

// ── WALLET TAB ────────────────────────────────────────────────
function WalletTab({ kid, data, pts, bal, color, act, confirm, familyId }) {
  const [desc, setDesc] = useState('');
  const [amt,  setAmt]  = useState('');

  return (
    <div style={s.panel}>
      <div style={{...s.balBar, borderColor:color}}>
        <div style={s.balItem}><div style={{...s.balVal,color:'#3a9e62'}}>${bal.earned.toFixed(2)}</div><div style={s.balLbl}>Total earned</div></div>
        <div style={s.balItem}><div style={{...s.balVal,color:'#d44a4a'}}>-${bal.spent.toFixed(2)}</div><div style={s.balLbl}>Spent</div></div>
        <div style={s.balItem}><div style={{...s.balVal,color:bal.balance<1?'#d44a4a':'#b89000'}}>${bal.balance.toFixed(2)}</div><div style={s.balLbl}>Available</div></div>
      </div>
      <div style={s.dottedBox}>
        <div style={s.boxTitle}>🛍️ Request a Purchase</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input style={{...s.input,flex:2}} placeholder="What do you want to buy?" value={desc} onChange={e=>setDesc(e.target.value)} />
          <input style={{...s.input,flex:1,minWidth:80}} type="number" placeholder="$0.00" value={amt} onChange={e=>setAmt(e.target.value)} />
          <button style={{...s.btn,background:color}} onClick={()=>{ if(!desc||!amt)return; act(()=>requestPurchase(kid.id,familyId,desc,parseFloat(amt))); setDesc('');setAmt(''); }}>Request ✋</button>
        </div>
      </div>
      <div style={s.sectionLabel}>💳 Transaction History</div>
      {(data.wallet||[]).length===0 ? <div style={s.empty}>No transactions yet!</div>
        : (data.wallet||[]).map(t => (
          <div key={t.id} style={s.logRow}>
            <span>{t.description}
              {t.status==='pending'  && <span style={{...s.badge,background:'#fff0cc',color:'#b86000',marginLeft:6}}>⏳ Pending</span>}
              {t.status==='approved' && <span style={{...s.badge,background:'#d4edda',color:'#3a9e62',marginLeft:6}}>✓ Approved</span>}
              {t.status==='denied'   && <span style={{...s.badge,background:'#fce8e8',color:'#d44a4a',marginLeft:6}}>✗ Denied</span>}
            </span>
            <span style={s.ts}>{new Date(t.created_at).toLocaleDateString()}</span>
            <span style={{fontWeight:900,color:t.status==='denied'?'#ccc':'#d44a4a',textDecoration:t.status==='denied'?'line-through':'none'}}>-${parseFloat(t.amount).toFixed(2)}</span>
          </div>
        ))
      }
      {/* Pending approvals */}
      {(data.wallet||[]).some(t=>t.status==='pending') && (
        <div style={{marginTop:16}}>
          <div style={s.sectionLabel}>⏳ Approve Requests</div>
          {(data.wallet||[]).filter(t=>t.status==='pending').map(t=>(
            <div key={t.id} style={s.logRow}>
              <span style={{flex:1,fontWeight:800}}>{t.description}</span>
              <span style={{fontWeight:900,color:'#b86000'}}>${parseFloat(t.amount).toFixed(2)}</span>
              <button style={s.approveBtn} onClick={()=>{ if(bal.balance<parseFloat(t.amount)){alert('Not enough balance!');return;} act(()=>updateTransaction(t.id,'approved')); }}>✓ Approve</button>
              <button style={s.denyBtn}    onClick={()=>act(()=>updateTransaction(t.id,'denied'))}>✗ Deny</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { family, kids, loading, reload } = useFamily();
  const [activeKid, setActiveKid] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { if (kids.length && !activeKid) setActiveKid(kids[0].id); }, [kids, activeKid]);

  const kid = kids.find(k => k.id === activeKid);

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Nunito',sans-serif",fontSize:'1.2rem',color:'#aaa'}}>Loading your family…</div>;

  return (
    <div style={{minHeight:'100vh',background:'#fffdf8',fontFamily:"'Nunito',sans-serif"}}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <div style={{fontSize:'1.4rem',fontWeight:900,color:'white'}}>⭐ ChoreRewards</div>
          <div style={{fontSize:'0.72rem',color:'#999',marginTop:1}}>{family?.name} · 100 pts = $10</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          {kids.map(k => (
            <KidHeaderCard key={k.id} kid={k} familyId={family?.id} tick={tick} />
          ))}
          <button style={s.signOutBtn} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div style={s.main}>
        {/* Person tabs */}
        <div style={s.personTabs}>
          {kids.map(k => (
            <button key={k.id} style={{...s.personTab, ...(activeKid===k.id?{background:k.color,color:'white',borderColor:k.color}:{color:k.color,borderColor:k.color})}}
              onClick={()=>setActiveKid(k.id)}>
              {k.emoji} {k.name}
            </button>
          ))}
        </div>

        {kid && <KidPanel key={kid.id} kid={kid} familyId={family?.id} onUpdate={()=>setTick(t=>t+1)} />}
      </div>
    </div>
  );
}

function KidHeaderCard({ kid, familyId, tick }) {
  const { data } = useKidData(kid.id, familyId);
  const pts = calcPoints(data);
  const bal = calcBalance(data);
  return (
    <div style={{...s.hdrCard, borderColor: kid.color+'66', background: kid.color+'22'}}>
      <div style={{fontSize:'0.64rem',color:'#999',fontWeight:700}}>Age {kid.age}</div>
      <div style={{fontSize:'0.68rem',color:'#bbb',fontWeight:800,textTransform:'uppercase'}}>{kid.name}</div>
      <div style={{fontSize:'1.3rem',fontWeight:900,color:kid.color,lineHeight:1.1}}>{pts.total}</div>
      <div style={{fontSize:'0.7rem',color:'#c9b89a'}}>${bal.balance.toFixed(2)}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = {
  header:      { background:'#2b2620',padding:'16px 28px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 },
  main:        { maxWidth:1100,margin:'0 auto',padding:'24px 16px' },
  hdrCard:     { textAlign:'center',padding:'7px 12px',borderRadius:12,minWidth:85,border:'2px solid' },
  signOutBtn:  { padding:'7px 16px',borderRadius:20,border:'1.5px solid #555',background:'transparent',color:'#999',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.8rem',cursor:'pointer' },

  personTabs:  { display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' },
  personTab:   { padding:'8px 20px',borderRadius:30,border:'2.5px solid',fontFamily:"'Nunito',sans-serif",fontSize:'0.92rem',fontWeight:800,cursor:'pointer',background:'white',transition:'all 0.15s' },

  banner:      { display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderRadius:16,border:'2px solid',background:'white',marginBottom:18,boxShadow:'0 4px 20px rgba(0,0,0,0.07)' },
  bannerEmoji: { fontSize:'2.4rem' },
  bannerName:  { fontSize:'1.4rem',fontWeight:900 },
  bannerTagline:{ fontSize:'0.78rem',color:'#aaa',marginTop:2 },
  statsRow:    { display:'flex',gap:16,flexWrap:'wrap' },
  stat:        { textAlign:'center' },
  statVal:     { fontSize:'1.3rem',fontWeight:900,lineHeight:1.1 },
  statLbl:     { fontSize:'0.68rem',color:'#aaa',marginTop:1 },

  subTabs:     { display:'flex',gap:6,marginBottom:18,borderBottom:'2px solid #f0ebe0',paddingBottom:10,flexWrap:'wrap' },
  subTab:      { padding:'7px 14px',borderRadius:8,border:'none',fontFamily:"'Nunito',sans-serif",fontSize:'0.82rem',fontWeight:800,cursor:'pointer',background:'transparent',color:'#bbb',transition:'all 0.15s' },
  subTabActive:{ color:'white' },

  sectionLabel:{ fontSize:'0.78rem',fontWeight:900,color:'#bbb',textTransform:'uppercase',letterSpacing:'0.8px',margin:'18px 0 10px',paddingTop:4 },
  panel:       { background:'white',borderRadius:16,padding:20,boxShadow:'0 4px 20px rgba(0,0,0,0.07)',marginBottom:20 },
  empty:       { textAlign:'center',color:'#ccc',padding:'20px 0',fontSize:'0.86rem' },
  hint:        { fontSize:'0.82rem',color:'#aaa',marginBottom:12 },

  choreGrid:   { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:10 },
  choreCard:   { background:'white',borderRadius:12,border:'2px solid #f0ebe0',padding:'12px 10px',cursor:'pointer',transition:'all 0.15s',userSelect:'none',textAlign:'center' },
  choreDone:   { border:'2px solid' },
  choreIcon:   { fontSize:'1.6rem',marginBottom:4 },
  choreName:   { fontSize:'0.8rem',fontWeight:800,color:'#555',marginBottom:8,lineHeight:1.3 },
  choreBottom: { display:'flex',justifyContent:'space-between',alignItems:'center' },
  chorePts:    { fontSize:'0.76rem',fontWeight:900,color:'#aaa' },
  choreStatus: { fontSize:'0.7rem',color:'#ccc',fontWeight:700 },

  gradeGrid:   { display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,margin:'12px 0' },
  gradeBtn:    { borderRadius:12,border:'2px solid',padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all 0.15s' },

  behaviorGrid:{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:16 },
  behaviorBtn: { borderRadius:12,border:'2px solid #fce8e8',background:'#fff8f8',padding:'12px 10px',textAlign:'center',cursor:'pointer',transition:'all 0.15s' },

  billsGrid:   { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16 },
  billCard:    { borderRadius:14,border:'2px solid',padding:14,display:'flex',flexDirection:'column',gap:6 },
  payBtn:      { marginTop:4,padding:'7px 0',borderRadius:8,border:'none',background:'#ff9800',color:'white',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.82rem',cursor:'pointer',width:'100%' },

  actGrid:     { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16 },
  actCard:     { borderRadius:12,border:'2px solid #f0ebe0',padding:'12px 14px',display:'flex',flexDirection:'column',gap:4,background:'white' },

  screenGrid:  { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:16 },
  screenCard:  { borderRadius:12,border:'2px solid #e3f2fd',background:'#f3f9ff',padding:'12px 10px',textAlign:'center',cursor:'pointer',transition:'all 0.15s' },

  goalCard:    { borderRadius:14,border:'2px solid #f0ebe0',padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start',marginBottom:12,position:'relative',transition:'box-shadow 0.15s' },
  goalImg:     { width:64,height:64,borderRadius:10,background:'#f5f0e8',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem' },
  goalStat:    { fontSize:'0.82rem' },

  balBar:      { display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10,borderRadius:12,border:'2px solid',padding:'14px 18px',marginBottom:16 },
  balItem:     { textAlign:'center' },
  balVal:      { fontSize:'1.4rem',fontWeight:900 },
  balLbl:      { fontSize:'0.7rem',color:'#aaa' },

  logRow:      { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5efe0',fontSize:'0.83rem',gap:8,flexWrap:'wrap' },
  pts:         { fontWeight:900,whiteSpace:'nowrap' },
  ts:          { color:'#aaa',fontSize:'0.72rem',whiteSpace:'nowrap' },
  rmBtn:       { background:'none',border:'1.5px solid #ddd',color:'#ccc',borderRadius:6,cursor:'pointer',fontSize:'0.75rem',padding:'2px 8px',fontFamily:"'Nunito',sans-serif",fontWeight:800 },
  approveBtn:  { padding:'4px 12px',borderRadius:8,border:'none',background:'#3a9e62',color:'white',fontFamily:"'Nunito',sans-serif",fontSize:'0.78rem',fontWeight:800,cursor:'pointer' },
  denyBtn:     { padding:'4px 12px',borderRadius:8,border:'none',background:'#d44a4a',color:'white',fontFamily:"'Nunito',sans-serif",fontSize:'0.78rem',fontWeight:800,cursor:'pointer' },

  dottedBox:   { background:'#fafafa',borderRadius:12,padding:'14px 16px',border:'2px dashed #eee',marginTop:16 },
  boxTitle:    { fontSize:'0.88rem',fontWeight:800,color:'#888',marginBottom:10 },
  pendingBox:  { background:'#fffbe8',border:'2px solid #f5c518',borderRadius:12,padding:'12px 16px',margin:'12px 0' },
  pendingTitle:{ fontSize:'0.88rem',fontWeight:900,color:'#b89000',marginBottom:8 },

  input:       { padding:'9px 12px',border:'2px solid #eee',borderRadius:10,fontFamily:"'Nunito',sans-serif",fontSize:'0.86rem',fontWeight:700,outline:'none' },
  btn:         { padding:'9px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'0.86rem',fontWeight:800,background:'#555',color:'white',transition:'background 0.15s',whiteSpace:'nowrap' },
  badge:       { display:'inline-block',fontSize:'0.68rem',fontWeight:800,padding:'2px 8px',borderRadius:20 },

  busyOverlay: { position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(255,255,255,0.6)',zIndex:9998,display:'flex',alignItems:'center',justifyContent:'center' },
  busySpinner: { width:36,height:36,border:'4px solid #f0ebe0',borderTop:'4px solid #e0623a',borderRadius:'50%',animation:'spin 0.8s linear infinite' },
};
