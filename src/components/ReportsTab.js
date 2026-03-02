import React, { useState } from 'react';

const PERIODS = ['week', 'month', 'year'];

function getPeriodRange(period) {
  const now = new Date();
  const start = new Date();
  if (period === 'week') {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
  } else if (period === 'month') {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function inPeriod(dateStr, period) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= getPeriodRange(period);
}

export function ReportsTab({ kid, data, color }) {
  const [period, setPeriod] = useState('week');

  if (!data) return <div style={s.empty}>Loading…</div>;

  const completions = (data.completions || []).filter(c => inPeriod(c.completed_at, period));
  const grades      = (data.grades      || []).filter(g => inPeriod(g.logged_at,    period));
  const sessions    = (data.sessions    || []).filter(s => s.status === 'approved' && inPeriod(s.logged_at, period));
  const behavior    = (data.behavior    || []).filter(b => inPeriod(b.logged_at,    period));
  const screenReqs  = (data.screenReqs  || []).filter(r => r.status === 'approved' && inPeriod(r.created_at, period));

  const chorePts    = completions.reduce((s, c) => s + (c.pts || 0), 0);
  const gradePts    = grades.reduce((s, g)      => s + (g.pts || 0), 0);
  const extraPts    = sessions.reduce((s, x)    => s + (x.pts || 0), 0);
  const behaviorPts = behavior.reduce((s, b)    => s + (b.pts || 0), 0);
  const totalPts    = Math.max(0, chorePts + gradePts + extraPts - behaviorPts);
  const screenMins  = screenReqs.reduce((s, r)  => s + (r.minutes || 0), 0);

  const totalChores     = (data.chores || []).length;
  const completedChores = new Set(completions.map(c => c.chore_id)).size;
  const choreRate       = totalChores > 0 ? Math.round(completedChores / totalChores * 100) : 0;

  const maxPts = Math.max(chorePts, gradePts, extraPts, behaviorPts, 1);
  const categories = [
    { label: '🧹 Chores',   pts: chorePts,     color: color },
    { label: '📚 School',   pts: gradePts,     color: '#2196f3' },
    { label: '🏆 Extras',   pts: extraPts,     color: '#9b5fd4' },
    { label: '😤 Behavior', pts: behaviorPts,  color: '#d44a4a', negative: true },
  ];

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const weekTrend = [6,5,4,3,2,1,0].map(d => {
    const dt   = new Date(today); dt.setDate(today.getDate() - d);
    const dStr = dt.toISOString().split('T')[0];
    const dayPts =
      (data.completions || []).filter(c => c.completed_at && c.completed_at.startsWith(dStr)).reduce((s,c) => s+(c.pts||0), 0) +
      (data.grades      || []).filter(g => g.logged_at    && g.logged_at.startsWith(dStr)).reduce((s,g) => s+(g.pts||0), 0) +
      (data.sessions    || []).filter(x => x.status==='approved' && x.logged_at && x.logged_at.startsWith(dStr)).reduce((s,x) => s+(x.pts||0), 0);
    return { label: d === 0 ? 'Today' : days[dt.getDay()], pts: dayPts };
  });
  const maxDayPts = Math.max(...weekTrend.map(d => d.pts), 1);
  const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year';

  return (
    <div style={s.panel}>
      <div style={s.periodRow}>
        {PERIODS.map(p => (
          <button key={p} style={{...s.periodBtn, ...(period===p ? {background:color,color:'white',borderColor:color} : {})}}
            onClick={() => setPeriod(p)}>
            {p==='week' ? '📅 Week' : p==='month' ? '🗓 Month' : '📆 Year'}
          </button>
        ))}
      </div>

      <div style={s.summaryRow}>
        <div style={{...s.summaryCard, borderColor:color+'44', background:color+'11'}}>
          <div style={{...s.summaryVal, color}}>{totalPts}</div>
          <div style={s.summaryLbl}>Total pts</div>
        </div>
        <div style={{...s.summaryCard, borderColor:'#2196f344', background:'#2196f311'}}>
          <div style={{...s.summaryVal, color:'#2196f3'}}>{completedChores}/{totalChores}</div>
          <div style={s.summaryLbl}>Chores done</div>
        </div>
        <div style={{...s.summaryCard, borderColor:'#9b5fd444', background:'#9b5fd411'}}>
          <div style={{...s.summaryVal, color:'#9b5fd4'}}>{sessions.length}</div>
          <div style={s.summaryLbl}>Extra sessions</div>
        </div>
        <div style={{...s.summaryCard, borderColor:'#ff980044', background:'#ff980011'}}>
          <div style={{...s.summaryVal, color:'#ff9800'}}>{screenMins} min</div>
          <div style={s.summaryLbl}>Screen earned</div>
        </div>
      </div>

      <div style={s.sectionLabel}>{periodLabel} — Points Breakdown</div>
      <div style={s.breakdownPanel}>
        {categories.map(cat => (
          <div key={cat.label} style={s.breakdownRow}>
            <div style={s.breakdownLabel}>{cat.label}</div>
            <div style={s.barTrack}>
              <div style={{...s.barFill, width:`${Math.abs(cat.pts)/maxPts*100}%`, background:cat.color, opacity:cat.negative?0.7:1}} />
            </div>
            <div style={{...s.breakdownVal, color:cat.color}}>{cat.negative?'-':'+'}{Math.abs(cat.pts)} pts</div>
          </div>
        ))}
        <div style={s.totalRow}>
          <span style={{fontWeight:900}}>Net Total</span>
          <span style={{fontWeight:900, color:totalPts>0?'#3a9e62':'#d44a4a'}}>{totalPts} pts</span>
        </div>
      </div>

      <div style={s.sectionLabel}>🧹 Chore Completion Rate</div>
      <div style={s.ratePanel}>
        <div style={s.rateTrack}>
          <div style={{...s.rateFill, width:`${choreRate}%`, background:choreRate>=80?'#3a9e62':choreRate>=50?'#ff9800':'#d44a4a'}} />
        </div>
        <div style={s.rateLabel}>
          <span style={{fontWeight:900, fontSize:'1.2rem', color:choreRate>=80?'#3a9e62':choreRate>=50?'#ff9800':'#d44a4a'}}>{choreRate}%</span>
          <span style={{color:'#aaa', fontSize:'0.82rem'}}> ({completedChores} of {totalChores} chores completed)</span>
        </div>
        {choreRate === 100 && <div style={s.badge100}>🌟 Perfect week!</div>}
      </div>

      {behavior.length > 0 && (
        <>
          <div style={s.sectionLabel}>😤 Behavior Deductions ({periodLabel})</div>
          <div style={s.behaviorList}>
            {behavior.map(b => (
              <div key={b.id} style={s.behaviorItem}>
                <span>{b.reason}</span>
                <span style={{color:'#aaa', fontSize:'0.72rem'}}>{new Date(b.logged_at).toLocaleDateString()}</span>
                <span style={{fontWeight:900, color:'#d44a4a'}}>-{b.pts} pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={s.sectionLabel}>📈 Daily Points — Last 7 Days</div>
      <div style={s.trendPanel}>
        {weekTrend.map((d, i) => (
          <div key={i} style={s.trendCol}>
            <div style={s.trendBarWrap}>
              <div style={{...s.trendBar, height:`${d.pts/maxDayPts*100}%`, background:i===6?color:color+'66'}} />
            </div>
            <div style={s.trendVal}>{d.pts > 0 ? d.pts : ''}</div>
            <div style={s.trendLabel}>{d.label}</div>
          </div>
        ))}
      </div>

      {screenMins > 0 && (
        <>
          <div style={s.sectionLabel}>📱 Screen Time Earned ({periodLabel})</div>
          <div style={s.screenSummary}>
            <div style={{fontSize:'2rem', fontWeight:900, color:'#2196f3'}}>{screenMins} min</div>
            <div style={{fontSize:'0.82rem', color:'#aaa'}}>across {screenReqs.length} sessions</div>
          </div>
        </>
      )}
    </div>
  );
}

export function AllReports({ kids, allData }) {
  const [period, setPeriod] = useState('week');
  const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year';

  return (
    <div style={s.panel}>
      <div style={{...s.sectionLabel, marginTop:0}}>📊 Family Reports</div>
      <div style={s.periodRow}>
        {PERIODS.map(p => (
          <button key={p} style={{...s.periodBtn, ...(period===p ? {background:'#2b2620',color:'white',borderColor:'#2b2620'} : {})}}
            onClick={() => setPeriod(p)}>
            {p==='week' ? '📅 Week' : p==='month' ? '🗓 Month' : '📆 Year'}
          </button>
        ))}
      </div>

      <div style={s.sectionLabel}>{periodLabel} — Kids Comparison</div>
      <div style={s.comparisonGrid}>
        {kids.map(kid => {
          const data = allData[kid.id];
          if (!data) return null;
          const color = kid.color || '#e0623a';
          const comps    = (data.completions||[]).filter(c => inPeriod(c.completed_at, period));
          const grades   = (data.grades||[]).filter(g => inPeriod(g.logged_at, period));
          const sessions = (data.sessions||[]).filter(s => s.status==='approved' && inPeriod(s.logged_at, period));
          const behavior = (data.behavior||[]).filter(b => inPeriod(b.logged_at, period));
          const total = Math.max(0,
            comps.reduce((s,c)=>s+(c.pts||0),0) +
            grades.reduce((s,g)=>s+(g.pts||0),0) +
            sessions.reduce((s,x)=>s+(x.pts||0),0) -
            behavior.reduce((s,b)=>s+(b.pts||0),0)
          );
          const totalChores     = (data.chores||[]).length;
          const completedChores = new Set(comps.map(c=>c.chore_id)).size;
          const choreRate       = totalChores > 0 ? Math.round(completedChores/totalChores*100) : 0;

          return (
            <div key={kid.id} style={{...s.kidCompCard, borderColor:color+'44'}}>
              <div style={{fontSize:'1.6rem'}}>{kid.emoji}</div>
              <div style={{fontWeight:900, color, fontSize:'1rem'}}>{kid.name}</div>
              <div style={{fontSize:'1.8rem', fontWeight:900, color, margin:'8px 0'}}>{total}</div>
              <div style={{fontSize:'0.72rem', color:'#aaa', marginBottom:10}}>pts {periodLabel.toLowerCase()}</div>
              <div style={s.miniBarTrack}>
                <div style={{...s.miniBarFill, width:`${choreRate}%`, background:color}} />
              </div>
              <div style={{fontSize:'0.72rem', color:'#aaa', marginTop:4}}>{choreRate}% chores done</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  panel:          { background:'white', borderRadius:16, padding:20, boxShadow:'0 4px 20px rgba(0,0,0,0.07)', marginBottom:20 },
  empty:          { textAlign:'center', color:'#ccc', padding:'20px 0' },
  sectionLabel:   { fontSize:'0.78rem', fontWeight:900, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.8px', margin:'18px 0 10px' },
  periodRow:      { display:'flex', gap:8, marginBottom:16 },
  periodBtn:      { padding:'7px 16px', borderRadius:20, border:'2px solid #eee', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:'0.84rem', cursor:'pointer', background:'white', color:'#aaa', transition:'all 0.15s' },
  summaryRow:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10, marginBottom:16 },
  summaryCard:    { borderRadius:12, border:'2px solid', padding:'12px 10px', textAlign:'center' },
  summaryVal:     { fontSize:'1.5rem', fontWeight:900, lineHeight:1.1 },
  summaryLbl:     { fontSize:'0.7rem', color:'#aaa', marginTop:3 },
  breakdownPanel: { background:'#fafafa', borderRadius:12, padding:'14px 16px', marginBottom:4 },
  breakdownRow:   { display:'flex', alignItems:'center', gap:10, marginBottom:10 },
  breakdownLabel: { width:100, fontSize:'0.8rem', fontWeight:800, color:'#666', flexShrink:0 },
  barTrack:       { flex:1, height:12, background:'#eee', borderRadius:20, overflow:'hidden' },
  barFill:        { height:'100%', borderRadius:20, transition:'width 0.6s ease' },
  breakdownVal:   { width:70, fontSize:'0.8rem', fontWeight:900, textAlign:'right', flexShrink:0 },
  totalRow:       { display:'flex', justifyContent:'space-between', borderTop:'2px solid #eee', paddingTop:10, marginTop:4 },
  ratePanel:      { background:'#fafafa', borderRadius:12, padding:'14px 16px', marginBottom:4 },
  rateTrack:      { height:18, background:'#eee', borderRadius:20, overflow:'hidden', marginBottom:8 },
  rateFill:       { height:'100%', borderRadius:20, transition:'width 0.6s ease' },
  rateLabel:      { fontSize:'0.86rem' },
  badge100:       { marginTop:8, display:'inline-block', background:'#fffbe8', border:'2px solid #f5c518', borderRadius:20, padding:'4px 14px', fontSize:'0.84rem', fontWeight:800, color:'#b89000' },
  behaviorList:   { background:'#fff8f8', borderRadius:12, padding:'10px 14px', marginBottom:4 },
  behaviorItem:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #fce8e8', fontSize:'0.83rem', gap:8 },
  trendPanel:     { display:'flex', gap:6, alignItems:'flex-end', height:120, background:'#fafafa', borderRadius:12, padding:'14px 16px', marginBottom:4 },
  trendCol:       { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, height:'100%' },
  trendBarWrap:   { flex:1, width:'100%', display:'flex', alignItems:'flex-end' },
  trendBar:       { width:'100%', borderRadius:'4px 4px 0 0', minHeight:2, transition:'height 0.5s ease' },
  trendVal:       { fontSize:'0.64rem', fontWeight:800, color:'#888', height:14 },
  trendLabel:     { fontSize:'0.62rem', color:'#bbb', fontWeight:700 },
  screenSummary:  { background:'#f3f9ff', borderRadius:12, padding:'14px 16px', textAlign:'center', marginBottom:4 },
  comparisonGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:4 },
  kidCompCard:    { borderRadius:14, border:'2px solid', padding:'16px 12px', textAlign:'center' },
  miniBarTrack:   { height:8, background:'#eee', borderRadius:20, overflow:'hidden', margin:'0 auto', width:'80%' },
  miniBarFill:    { height:'100%', borderRadius:20, transition:'width 0.5s' },
};