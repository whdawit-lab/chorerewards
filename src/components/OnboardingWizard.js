import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const COLORS = ['#e0623a','#3a9e7c','#9b5fd4','#2196f3','#ff9800','#e91e63','#009688','#795548'];
const EMOJIS = ['⭐','🌟','🦁','🐯','🦊','🐻','🐼','🦄','🐉','🌈','🚀','⚡','🎯','🏆','💎','🎨'];

const CHORE_TEMPLATES = [
  { name:'Make your bed',           icon:'🛏️', pts:4,  frequency:'daily'  },
  { name:'Pick up toys',            icon:'🧸', pts:3,  frequency:'daily'  },
  { name:'Clear your plate',        icon:'🥣', pts:3,  frequency:'daily'  },
  { name:'Brush teeth (2x)',        icon:'🦷', pts:2,  frequency:'daily'  },
  { name:'Get dressed independently',icon:'👚',pts:2,  frequency:'daily'  },
  { name:'Feed the pet',            icon:'🐾', pts:4,  frequency:'daily'  },
  { name:'Wash dishes',             icon:'🍽️', pts:6,  frequency:'daily'  },
  { name:'Take out trash',          icon:'🗑️', pts:6,  frequency:'weekly' },
  { name:'Vacuum/sweep floor',      icon:'🧹', pts:8,  frequency:'weekly' },
  { name:'Clean bathroom',          icon:'🚽', pts:10, frequency:'weekly' },
  { name:'Do laundry',              icon:'🧺', pts:10, frequency:'weekly' },
  { name:'Wipe counters',           icon:'🧽', pts:6,  frequency:'weekly' },
  { name:'Mow the lawn',            icon:'🌿', pts:15, frequency:'weekly' },
  { name:'Deep clean bedroom',      icon:'🧼', pts:12, frequency:'monthly'},
  { name:'Organize closet',         icon:'👕', pts:10, frequency:'monthly'},
];

const ACTIVITY_TEMPLATES = [
  { name:'Reading',        icon:'📖', pts_per_min:0.5 },
  { name:'Coding',         icon:'💻', pts_per_min:1   },
  { name:'Spanish',        icon:'🇪🇸', pts_per_min:1   },
  { name:'Music practice', icon:'🎵', pts_per_min:0.8 },
  { name:'Exercise',       icon:'🏃', pts_per_min:0.5 },
  { name:'Art',            icon:'🎨', pts_per_min:0.5 },
  { name:'Math practice',  icon:'🔢', pts_per_min:0.8 },
  { name:'Science',        icon:'🔬', pts_per_min:0.8 },
];

const BEHAVIOR_TEMPLATES = [
  { reason:'Lying',              pts:10 },
  { reason:'Hitting/Fighting',   pts:10 },
  { reason:'Back talk',          pts:8  },
  { reason:'Not sharing',        pts:6  },
  { reason:'Tantrum',            pts:6  },
  { reason:'Ignoring instructions',pts:6},
  { reason:'Screen overuse',     pts:8  },
  { reason:'Disrespect',         pts:10 },
];

export default function OnboardingWizard({ familyId, onComplete }) {
  const [step,      setStep]      = useState(0); // 0=welcome, 1=family, 2=kid wizard, 3=done
  const [familyName,setFamilyName]= useState('');
  const [ptsRatio,  setPtsRatio]  = useState(10); // 100pts = $X
  const [kids,      setKids]      = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Current kid being built
  const [kidStep,   setKidStep]   = useState(0); // 0=info, 1=chores, 2=activities, 3=behavior
  const [kidDraft,  setKidDraft]  = useState(null);

  const startNewKid = () => {
    setKidDraft({
      name: '', age: '', color: COLORS[kids.length % COLORS.length],
      emoji: EMOJIS[kids.length % EMOJIS.length],
      chores: [], activities: [], behaviorPresets: [],
    });
    setKidStep(0);
    setStep(2);
  };

  const saveKid = () => {
    if (!kidDraft.name.trim()) { setError('Please enter a name!'); return; }
    setKids(prev => [...prev, { ...kidDraft }]);
    setKidDraft(null);
    setStep('kidDone');
    setError('');
  };

  const finishSetup = async () => {
    setSaving(true);
    setError('');
    try {
      // Update family name and pts ratio
      await supabase.from('families').update({ name: familyName || 'My Family', pts_ratio: ptsRatio }).eq('id', familyId);

      for (const kid of kids) {
        // Insert kid
        const { data: kidRow, error: kidErr } = await supabase
          .from('kids')
          .insert({ name: kid.name, age: parseInt(kid.age)||null, color: kid.color, emoji: kid.emoji, family_id: familyId })
          .select().single();
        if (kidErr) throw kidErr;

        // Insert chores
        for (const c of kid.chores) {
          await supabase.from('chores').insert({ ...c, kid_id: kidRow.id, family_id: familyId });
        }

        // Insert activities
        for (const a of kid.activities) {
          await supabase.from('activities').insert({ ...a, kid_id: kidRow.id, family_id: familyId });
        }

        // Insert behavior presets as a kid setting (store in kid tagline for now, proper table later)
        // We store behavior presets in a separate table
        for (const b of kid.behaviorPresets) {
          await supabase.from('behavior_presets').insert({ ...b, kid_id: kidRow.id, family_id: familyId });
        }
      }
      onComplete();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  // ── Step 0: Welcome ──────────────────────────────────────────
  if (step === 0) return (
    <div style={p.page}>
      <div style={p.card}>
        <div style={{fontSize:'3.5rem',marginBottom:12}}>⭐</div>
        <h1 style={p.h1}>Welcome to ChoreRewards!</h1>
        <p style={p.sub}>Let's set up your family in just a few steps. You'll add each child one at a time and customize their chores, activities, and rewards.</p>
        <button style={p.btnPrimary} onClick={() => setStep(1)}>Let's Get Started →</button>
      </div>
    </div>
  );

  // ── Step 1: Family settings ──────────────────────────────────
  if (step === 1) return (
    <div style={p.page}>
      <div style={p.card}>
        <div style={p.stepBadge}>Step 1 of 2</div>
        <h2 style={p.h2}>👨‍👩‍👧‍👦 Your Family</h2>
        <p style={p.sub}>Set your family name and how points convert to rewards.</p>

        <div style={p.field}>
          <label style={p.label}>Family Name</label>
          <input style={p.input} placeholder="e.g. The Smiths" value={familyName} onChange={e=>setFamilyName(e.target.value)} />
        </div>

        <div style={p.field}>
          <label style={p.label}>Rewards Rate</label>
          <p style={{fontSize:'0.82rem',color:'#aaa',marginBottom:8}}>How much is 100 points worth?</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[5,10,15,20].map(v => (
              <button key={v} style={{...p.optBtn, ...(ptsRatio===v?{background:'#2b2620',color:'white',borderColor:'#2b2620'}:{})}}
                onClick={()=>setPtsRatio(v)}>
                100 pts = ${v}
              </button>
            ))}
          </div>
          <p style={{fontSize:'0.78rem',color:'#aaa',marginTop:8}}>Currently: 100 pts = ${ptsRatio} (${(ptsRatio/100).toFixed(2)} per point)</p>
        </div>

        {error && <div style={p.error}>{error}</div>}
        <button style={p.btnPrimary} onClick={() => { setStep('kidDone'); }}>Next → Add Kids</button>
      </div>
    </div>
  );

  // ── Step: Between kids ────────────────────────────────────────
  if (step === 'kidDone') return (
    <div style={p.page}>
      <div style={p.card}>
        <h2 style={p.h2}>👶 Your Kids</h2>
        {kids.length === 0
          ? <p style={p.sub}>No kids added yet. Add your first child to get started!</p>
          : <>
            <p style={p.sub}>{kids.length} kid{kids.length>1?'s':''} added so far:</p>
            <div style={{marginBottom:20}}>
              {kids.map((k,i) => (
                <div key={i} style={{...p.kidChip, borderColor:k.color, background:k.color+'18'}}>
                  <span style={{fontSize:'1.4rem'}}>{k.emoji}</span>
                  <span style={{fontWeight:900,color:k.color}}>{k.name}</span>
                  <span style={{fontSize:'0.76rem',color:'#aaa'}}>Age {k.age} · {k.chores.length} chores · {k.activities.length} activities</span>
                </div>
              ))}
            </div>
          </>
        }
        <button style={p.btnPrimary} onClick={startNewKid}>+ Add {kids.length>0?'Another ':''}Child</button>
        {kids.length > 0 && (
          <button style={{...p.btnSecondary,marginTop:10}} onClick={finishSetup} disabled={saving}>
            {saving ? 'Setting up…' : `Finish Setup (${kids.length} kid${kids.length>1?'s':''})`} 🚀
          </button>
        )}
        {error && <div style={p.error}>{error}</div>}
      </div>
    </div>
  );

  // ── Step 2: Kid wizard ────────────────────────────────────────
  if (step === 2 && kidDraft) {

    // ── Kid step 0: Basic info ────────────────────────────────
    if (kidStep === 0) return (
      <div style={p.page}>
        <div style={{...p.card,maxWidth:520}}>
          <div style={p.stepBadge}>Kid {kids.length+1} · Basic Info</div>
          <h2 style={p.h2}>👤 About This Child</h2>

          <div style={p.field}>
            <label style={p.label}>Name</label>
            <input style={p.input} placeholder="Child's name" value={kidDraft.name} onChange={e=>setKidDraft(d=>({...d,name:e.target.value}))} />
          </div>

          <div style={p.field}>
            <label style={p.label}>Age</label>
            <input style={{...p.input,width:100}} type="number" placeholder="Age" min="1" max="18" value={kidDraft.age} onChange={e=>setKidDraft(d=>({...d,age:e.target.value}))} />
          </div>

          <div style={p.field}>
            <label style={p.label}>Color</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {COLORS.map(c => (
                <div key={c} onClick={()=>setKidDraft(d=>({...d,color:c}))}
                  style={{width:36,height:36,borderRadius:'50%',background:c,cursor:'pointer',border:kidDraft.color===c?'3px solid #2b2620':'3px solid transparent',transition:'all 0.15s'}} />
              ))}
            </div>
          </div>

          <div style={p.field}>
            <label style={p.label}>Emoji / Avatar</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {EMOJIS.map(e => (
                <div key={e} onClick={()=>setKidDraft(d=>({...d,emoji:e}))}
                  style={{width:40,height:40,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',cursor:'pointer',background:kidDraft.emoji===e?kidDraft.color+'33':'#f5f0e8',border:kidDraft.emoji===e?`2px solid ${kidDraft.color}`:'2px solid transparent'}}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{...p.kidChip, borderColor:kidDraft.color, background:kidDraft.color+'18',marginBottom:16}}>
            <span style={{fontSize:'1.8rem'}}>{kidDraft.emoji}</span>
            <span style={{fontWeight:900,color:kidDraft.color,fontSize:'1.1rem'}}>{kidDraft.name||'Preview'}</span>
            {kidDraft.age && <span style={{fontSize:'0.78rem',color:'#aaa'}}>Age {kidDraft.age}</span>}
          </div>

          {error && <div style={p.error}>{error}</div>}
          <button style={p.btnPrimary} onClick={()=>{ if(!kidDraft.name.trim()){setError('Please enter a name!');return;} setError(''); setKidStep(1); }}>
            Next → Chores
          </button>
          <button style={{...p.btnSecondary,marginTop:8}} onClick={()=>setStep('kidDone')}>← Back</button>
        </div>
      </div>
    );

    // ── Kid step 1: Chores ────────────────────────────────────
    if (kidStep === 1) return (
      <div style={p.page}>
        <div style={{...p.card,maxWidth:600}}>
          <div style={p.stepBadge}>{kidDraft.emoji} {kidDraft.name} · Chores</div>
          <h2 style={p.h2}>🧹 Choose Chores</h2>
          <p style={p.sub}>Select from templates or add custom chores. You can always change these later.</p>

          <div style={{marginBottom:16}}>
            {['daily','weekly','monthly'].map(freq => (
              <div key={freq}>
                <div style={{fontSize:'0.76rem',fontWeight:900,color:'#bbb',textTransform:'uppercase',letterSpacing:'0.8px',margin:'12px 0 8px'}}>
                  {freq==='daily'?'📅 Daily':freq==='weekly'?'🗓 Weekly':'🧹 Monthly'}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
                  {CHORE_TEMPLATES.filter(c=>c.frequency===freq).map((c,i) => {
                    const selected = kidDraft.chores.some(x=>x.name===c.name);
                    return (
                      <div key={i} style={{...p.templateCard, ...(selected?{borderColor:kidDraft.color,background:kidDraft.color+'18'}:{})}}
                        onClick={()=>setKidDraft(d=>({...d,chores:selected?d.chores.filter(x=>x.name!==c.name):[...d.chores,{...c}]}))}>
                        <span style={{fontSize:'1.2rem'}}>{c.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'0.82rem',fontWeight:800}}>{c.name}</div>
                          <div style={{fontSize:'0.72rem',color:'#aaa'}}>{c.pts} pts</div>
                        </div>
                        {selected && <span style={{color:kidDraft.color,fontWeight:900}}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <AddCustomChore kidDraft={kidDraft} setKidDraft={setKidDraft} color={kidDraft.color} />

          <div style={{fontSize:'0.82rem',color:'#888',marginBottom:16}}>{kidDraft.chores.length} chores selected</div>
          <button style={p.btnPrimary} onClick={()=>setKidStep(2)}>Next → Activities</button>
          <button style={{...p.btnSecondary,marginTop:8}} onClick={()=>setKidStep(0)}>← Back</button>
        </div>
      </div>
    );

    // ── Kid step 2: Activities ────────────────────────────────
    if (kidStep === 2) return (
      <div style={p.page}>
        <div style={{...p.card,maxWidth:600}}>
          <div style={p.stepBadge}>{kidDraft.emoji} {kidDraft.name} · Activities</div>
          <h2 style={p.h2}>🏆 Extracurricular Activities</h2>
          <p style={p.sub}>Select activities that earn bonus points. Points are awarded per minute.</p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,marginBottom:16}}>
            {ACTIVITY_TEMPLATES.map((a,i) => {
              const selected = kidDraft.activities.some(x=>x.name===a.name);
              return (
                <div key={i} style={{...p.templateCard, ...(selected?{borderColor:kidDraft.color,background:kidDraft.color+'18'}:{})}}
                  onClick={()=>setKidDraft(d=>({...d,activities:selected?d.activities.filter(x=>x.name!==a.name):[...d.activities,{...a}]}))}>
                  <span style={{fontSize:'1.4rem'}}>{a.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.82rem',fontWeight:800}}>{a.name}</div>
                    <div style={{fontSize:'0.72rem',color:'#aaa'}}>{a.pts_per_min} pts/min</div>
                  </div>
                  {selected && <span style={{color:kidDraft.color,fontWeight:900}}>✓</span>}
                </div>
              );
            })}
          </div>

          <div style={{fontSize:'0.82rem',color:'#888',marginBottom:16}}>{kidDraft.activities.length} activities selected</div>
          <button style={p.btnPrimary} onClick={()=>setKidStep(3)}>Next → Behavior</button>
          <button style={{...p.btnSecondary,marginTop:8}} onClick={()=>setKidStep(1)}>← Back</button>
        </div>
      </div>
    );

    // ── Kid step 3: Behavior presets ─────────────────────────
    if (kidStep === 3) return (
      <div style={p.page}>
        <div style={{...p.card,maxWidth:600}}>
          <div style={p.stepBadge}>{kidDraft.emoji} {kidDraft.name} · Behavior</div>
          <h2 style={p.h2}>😤 Behavior Deductions</h2>
          <p style={p.sub}>Select behaviors that will deduct points. Customize the amounts.</p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,marginBottom:16}}>
            {BEHAVIOR_TEMPLATES.map((b,i) => {
              const selected = kidDraft.behaviorPresets.some(x=>x.reason===b.reason);
              return (
                <div key={i} style={{...p.templateCard, ...(selected?{borderColor:'#d44a4a',background:'#fff8f8'}:{})}}
                  onClick={()=>setKidDraft(d=>({...d,behaviorPresets:selected?d.behaviorPresets.filter(x=>x.reason!==b.reason):[...d.behaviorPresets,{...b}]}))}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.82rem',fontWeight:800}}>{b.reason}</div>
                    <div style={{fontSize:'0.72rem',color:'#d44a4a',fontWeight:800}}>-{b.pts} pts</div>
                  </div>
                  {selected && <span style={{color:'#d44a4a',fontWeight:900}}>✓</span>}
                </div>
              );
            })}
          </div>

          {error && <div style={p.error}>{error}</div>}
          <button style={{...p.btnPrimary,background:kidDraft.color}} onClick={saveKid}>
            ✓ Save {kidDraft.name}
          </button>
          <button style={{...p.btnSecondary,marginTop:8}} onClick={()=>setKidStep(2)}>← Back</button>
        </div>
      </div>
    );
  }

  return null;
}

function AddCustomChore({ kidDraft, setKidDraft, color }) {
  const [name, setName]  = useState('');
  const [icon, setIcon]  = useState('');
  const [pts,  setPts]   = useState('');
  const [freq, setFreq]  = useState('daily');

  const add = () => {
    if (!name||!pts) return;
    setKidDraft(d=>({...d,chores:[...d.chores,{name,icon:icon||'⭐',pts:parseInt(pts),frequency:freq}]}));
    setName('');setIcon('');setPts('');
  };

  return (
    <div style={{background:'#fafafa',borderRadius:12,padding:'12px 14px',border:'2px dashed #eee',marginBottom:12}}>
      <div style={{fontSize:'0.82rem',fontWeight:800,color:'#888',marginBottom:8}}>➕ Add Custom Chore</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input style={{...p.input,width:50}} placeholder="🧹" value={icon} onChange={e=>setIcon(e.target.value)} />
        <input style={{...p.input,flex:2,minWidth:120}} placeholder="Chore name" value={name} onChange={e=>setName(e.target.value)} />
        <input style={{...p.input,width:70}} type="number" placeholder="pts" value={pts} onChange={e=>setPts(e.target.value)} />
        <select style={{...p.input,flex:1,minWidth:90}} value={freq} onChange={e=>setFreq(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button style={{...p.btnPrimary,padding:'8px 14px',background:color}} onClick={add}>Add</button>
      </div>
    </div>
  );
}

const p = {
  page:       { minHeight:'100vh', background:'#fffdf8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Nunito',sans-serif", padding:20 },
  card:       { background:'white', borderRadius:24, padding:'36px 32px', boxShadow:'0 8px 40px rgba(0,0,0,0.10)', maxWidth:460, width:'100%' },
  h1:         { fontSize:'1.8rem', fontWeight:900, color:'#2b2620', margin:'0 0 10px' },
  h2:         { fontSize:'1.4rem', fontWeight:900, color:'#2b2620', margin:'0 0 8px' },
  sub:        { fontSize:'0.88rem', color:'#aaa', marginBottom:24, lineHeight:1.6 },
  stepBadge:  { display:'inline-block', background:'#f5f0e8', borderRadius:20, padding:'4px 12px', fontSize:'0.74rem', fontWeight:800, color:'#888', marginBottom:12 },
  field:      { marginBottom:18 },
  label:      { display:'block', fontSize:'0.82rem', fontWeight:800, color:'#666', marginBottom:6 },
  input:      { padding:'10px 14px', border:'2px solid #eee', borderRadius:10, fontFamily:"'Nunito',sans-serif", fontSize:'0.9rem', fontWeight:700, outline:'none', width:'100%' },
  btnPrimary: { width:'100%', padding:'13px 0', borderRadius:12, border:'none', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'1rem', fontWeight:900, background:'#2b2620', color:'white', transition:'opacity 0.15s' },
  btnSecondary:{ width:'100%', padding:'10px 0', borderRadius:12, border:'2px solid #eee', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'0.9rem', fontWeight:800, background:'white', color:'#888' },
  optBtn:     { padding:'8px 16px', borderRadius:20, border:'2px solid #eee', fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:'0.86rem', cursor:'pointer', background:'white', color:'#888', transition:'all 0.15s' },
  error:      { background:'#fff0ed', color:'#c0392b', borderRadius:10, padding:'10px 14px', fontSize:'0.82rem', fontWeight:700, marginBottom:12 },
  kidChip:    { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, border:'2px solid', marginBottom:8 },
  templateCard:{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:'2px solid #f0ebe0', cursor:'pointer', transition:'all 0.15s', background:'white' },
};
