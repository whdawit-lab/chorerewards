import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const COLORS = ['#e0623a','#3a9e7c','#9b5fd4','#2196f3','#ff9800','#e91e63','#009688','#795548'];
const EMOJIS = ['⭐','🌟','🦁','🐯','🦊','🐻','🐼','🦄','🐉','🌈','🚀','⚡','🎯','🏆','💎','🎨'];

export default function SettingsPage({ family, kids, onUpdate, onClose }) {
  const { signOut } = useAuth();
  const [section,    setSection]    = useState('family');
  const [activeKid,  setActiveKid]  = useState(kids[0]?.id || null);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');

  // Family settings
  const [famName,    setFamName]    = useState(family?.name || '');
  const [ptsRatio,   setPtsRatio]   = useState(family?.pts_ratio || 10);

  // Kid data
  const [kidData,    setKidData]    = useState({});
  const [loadingKid, setLoadingKid] = useState(false);
  const [addingKid,  setAddingKid]  = useState(false);

  useEffect(() => {
    if (activeKid) loadKidData(activeKid);
  }, [activeKid]);

  const loadKidData = async (kidId) => {
    setLoadingKid(true);
    const [{ data: chores }, { data: activities }] = await Promise.all([
      supabase.from('chores').select('*').eq('kid_id', kidId).order('created_at'),
      supabase.from('activities').select('*').eq('kid_id', kidId).order('created_at'),
    ]);
    setKidData(prev => ({ ...prev, [kidId]: { chores: chores||[], activities: activities||[] } }));
    setLoadingKid(false);
  };

  const saveFamilySettings = async () => {
    setSaving(true);
    await supabase.from('families').update({ name: famName, pts_ratio: ptsRatio }).eq('id', family.id);
    setMsg('✅ Family settings saved!');
    setSaving(false);
    onUpdate();
    setTimeout(() => setMsg(''), 2000);
  };

  const saveKidProfile = async (kidId, updates) => {
    setSaving(true);
    await supabase.from('kids').update(updates).eq('id', kidId);
    setMsg('✅ Saved!');
    setSaving(false);
    onUpdate();
    setTimeout(() => setMsg(''), 2000);
  };

  const addChore = async (kidId, familyId, chore) => {
    const { data } = await supabase.from('chores').insert({ ...chore, kid_id: kidId, family_id: familyId }).select().single();
    setKidData(prev => ({ ...prev, [kidId]: { ...prev[kidId], chores: [...(prev[kidId]?.chores||[]), data] } }));
  };

  const deleteChore = async (kidId, choreId) => {
    await supabase.from('chores').delete().eq('id', choreId);
    setKidData(prev => ({ ...prev, [kidId]: { ...prev[kidId], chores: prev[kidId].chores.filter(c => c.id !== choreId) } }));
  };

  const updateChore = async (choreId, updates) => {
    await supabase.from('chores').update(updates).eq('id', choreId);
    setKidData(prev => {
      const updated = { ...prev };
      for (const kidId in updated) {
        if (updated[kidId]?.chores) {
          updated[kidId] = { ...updated[kidId], chores: updated[kidId].chores.map(c => c.id === choreId ? { ...c, ...updates } : c) };
        }
      }
      return updated;
    });
  };

  const addActivity = async (kidId, familyId, act) => {
    const { data } = await supabase.from('activities').insert({ ...act, kid_id: kidId, family_id: familyId }).select().single();
    setKidData(prev => ({ ...prev, [kidId]: { ...prev[kidId], activities: [...(prev[kidId]?.activities||[]), data] } }));
  };

  const deleteActivity = async (kidId, actId) => {
    await supabase.from('activities').delete().eq('id', actId);
    setKidData(prev => ({ ...prev, [kidId]: { ...prev[kidId], activities: prev[kidId].activities.filter(a => a.id !== actId) } }));
  };

  const kid = kids.find(k => k.id === activeKid);
  const kd  = kidData[activeKid];

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={{fontWeight:900, fontSize:'1.2rem'}}>⚙️ Settings</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Nav */}
        <div style={s.nav}>
          {['family','kids','account'].map(sec => (
            <button key={sec} style={{...s.navBtn, ...(section===sec?s.navActive:{})}} onClick={()=>setSection(sec)}>
              {sec==='family'?'👨‍👩‍👧‍👦 Family':sec==='kids'?'👶 Kids':'👤 Account'}
            </button>
          ))}
        </div>

        <div style={s.body}>
          {msg && <div style={s.successMsg}>{msg}</div>}

          {/* ── Family section ── */}
          {section === 'family' && (
            <div>
              <div style={s.sectionTitle}>Family Settings</div>
              <div style={s.field}>
                <label style={s.label}>Family Name</label>
                <input style={s.input} value={famName} onChange={e=>setFamName(e.target.value)} placeholder="The Smiths" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Rewards Rate (100 pts = ?)</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[5,10,15,20].map(v => (
                    <button key={v} style={{...s.optBtn,...(ptsRatio===v?{background:'#2b2620',color:'white',borderColor:'#2b2620'}:{})}} onClick={()=>setPtsRatio(v)}>
                      ${v}
                    </button>
                  ))}
                </div>
                <p style={{fontSize:'0.78rem',color:'#aaa',marginTop:6}}>Currently: 100 pts = ${ptsRatio}</p>
              </div>
              <button style={s.btnSave} onClick={saveFamilySettings} disabled={saving}>
                {saving?'Saving…':'Save Family Settings'}
              </button>
            </div>
          )}

          {/* ── Kids section ── */}
          {section === 'kids' && (
            <div>
              {/* Kid selector + Add button */}
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                {kids.map(k => (
                  <button key={k.id} style={{...s.kidTab,...(activeKid===k.id?{background:k.color,color:'white',borderColor:k.color}:{color:k.color,borderColor:k.color})}}
                    onClick={()=>{ setActiveKid(k.id); setAddingKid(false); }}>
                    {k.emoji} {k.name}
                  </button>
                ))}
                <button style={{...s.kidTab,borderColor:'#3a9e62',color:'#3a9e62',...(addingKid?{background:'#3a9e62',color:'white'}:{})}}
                  onClick={()=>{ setAddingKid(true); setActiveKid(null); }}>
                  + Add Kid
                </button>
              </div>

              {addingKid && (
                <AddKidForm familyId={family.id} onSave={(newKid) => { onUpdate(); setAddingKid(false); setMsg('✅ ' + newKid.name + ' added!'); setTimeout(()=>setMsg(''),2000); }} onCancel={()=>setAddingKid(false)} />
              )}

              {!addingKid && kid && (
                <KidSettingsPanel
                  kid={kid} kd={kd} loading={loadingKid}
                  familyId={family.id}
                  onSaveProfile={(updates) => saveKidProfile(kid.id, updates)}
                  onAddChore={(chore) => addChore(kid.id, family.id, chore)}
                  onDeleteChore={(id) => deleteChore(kid.id, id)}
                  onUpdateChore={updateChore}
                  onAddActivity={(act) => addActivity(kid.id, family.id, act)}
                  onDeleteActivity={(id) => deleteActivity(kid.id, id)}
                />
              )}
            </div>
          )}

          {/* ── Account section ── */}
          {section === 'account' && (
            <div>
              <div style={s.sectionTitle}>Account</div>
              <p style={{fontSize:'0.86rem',color:'#888',marginBottom:20}}>Manage your account settings.</p>
              <button style={{...s.btnSave,background:'#d44a4a'}} onClick={signOut}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KidSettingsPanel({ kid, kd, loading, familyId, onSaveProfile, onAddChore, onDeleteChore, onUpdateChore, onAddActivity, onDeleteActivity }) {
  const [name,   setName]   = useState(kid.name);
  const [age,    setAge]    = useState(kid.age || '');
  const [color,  setColor]  = useState(kid.color);
  const [emoji,  setEmoji]  = useState(kid.emoji);
  const [tab,    setTab]    = useState('profile');

  // New chore form
  const [cName,  setCName]  = useState('');
  const [cIcon,  setCIcon]  = useState('');
  const [cPts,   setCPts]   = useState('');
  const [cFreq,  setCFreq]  = useState('daily');

  // New activity form
  const [aName,  setAName]  = useState('');
  const [aIcon,  setAIcon]  = useState('');
  const [aPpm,   setAPpm]   = useState('');

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['profile','chores','activities'].map(t => (
          <button key={t} style={{...s.subTab,...(tab===t?{background:'#f0ebe0',fontWeight:900,color:'#2b2620'}:{})}} onClick={()=>setTab(t)}>
            {t==='profile'?'👤 Profile':t==='chores'?'🧹 Chores':'🏆 Activities'}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab==='profile' && (
        <div>
          <div style={s.field}>
            <label style={s.label}>Name</label>
            <input style={s.input} value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Age</label>
            <input style={{...s.input,width:100}} type="number" value={age} onChange={e=>setAge(e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Color</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {COLORS.map(c => (
                <div key={c} onClick={()=>setColor(c)}
                  style={{width:32,height:32,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'3px solid #2b2620':'3px solid transparent'}} />
              ))}
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Emoji</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {EMOJIS.map(e => (
                <div key={e} onClick={()=>setEmoji(e)}
                  style={{width:36,height:36,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',cursor:'pointer',background:emoji===e?color+'33':'#f5f0e8',border:emoji===e?`2px solid ${color}`:'2px solid transparent'}}>
                  {e}
                </div>
              ))}
            </div>
          </div>
          <button style={s.btnSave} onClick={()=>onSaveProfile({name,age:parseInt(age)||null,color,emoji})}>Save Profile</button>
        </div>
      )}

      {/* Chores */}
      {tab==='chores' && (
        <div>
          {loading ? <div style={{color:'#aaa',textAlign:'center',padding:20}}>Loading…</div> : (
            <>
              {(kd?.chores||[]).length === 0
                ? <div style={{color:'#ccc',textAlign:'center',padding:20}}>No chores yet — add some below!</div>
                : (kd?.chores||[]).map(c => (
                  <div key={c.id} style={s.choreRow}>
                    <span style={{fontSize:'1.1rem'}}>{c.icon}</span>
                    <span style={{flex:1,fontWeight:700,fontSize:'0.86rem'}}>{c.name}</span>
                    <span style={{fontSize:'0.76rem',color:'#aaa'}}>{c.frequency}</span>
                    <input type="number" value={c.pts} onChange={e=>onUpdateChore(c.id,{pts:parseInt(e.target.value)||c.pts})}
                      style={{width:55,padding:'4px 8px',border:'2px solid #eee',borderRadius:8,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.82rem',outline:'none',textAlign:'center'}} />
                    <span style={{fontSize:'0.72rem',color:'#aaa'}}>pts</span>
                    <button style={s.deleteBtn} onClick={()=>onDeleteChore(c.id)}>✕</button>
                  </div>
                ))
              }
              <div style={{...s.dottedBox,marginTop:12}}>
                <div style={{fontSize:'0.82rem',fontWeight:800,color:'#888',marginBottom:8}}>➕ Add Chore</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <input style={{...s.input,width:50}} placeholder="🧹" value={cIcon} onChange={e=>setCIcon(e.target.value)} />
                  <input style={{...s.input,flex:2,minWidth:110}} placeholder="Chore name" value={cName} onChange={e=>setCName(e.target.value)} />
                  <input style={{...s.input,width:60}} type="number" placeholder="pts" value={cPts} onChange={e=>setCPts(e.target.value)} />
                  <select style={{...s.input,flex:1,minWidth:85}} value={cFreq} onChange={e=>setCFreq(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button style={{...s.btnSave,padding:'8px 14px',width:'auto'}} onClick={()=>{
                    if(!cName||!cPts)return;
                    onAddChore({name:cName,icon:cIcon||'⭐',pts:parseInt(cPts),frequency:cFreq});
                    setCName('');setCIcon('');setCPts('');
                  }}>Add</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Activities */}
      {tab==='activities' && (
        <div>
          {loading ? <div style={{color:'#aaa',textAlign:'center',padding:20}}>Loading…</div> : (
            <>
              {(kd?.activities||[]).length === 0
                ? <div style={{color:'#ccc',textAlign:'center',padding:20}}>No activities yet!</div>
                : (kd?.activities||[]).map(a => (
                  <div key={a.id} style={s.choreRow}>
                    <span style={{fontSize:'1.1rem'}}>{a.icon}</span>
                    <span style={{flex:1,fontWeight:700,fontSize:'0.86rem'}}>{a.name}</span>
                    <span style={{fontSize:'0.76rem',color:'#aaa'}}>{a.pts_per_min} pts/min</span>
                    <button style={s.deleteBtn} onClick={()=>onDeleteActivity(a.id)}>✕</button>
                  </div>
                ))
              }
              <div style={{...s.dottedBox,marginTop:12}}>
                <div style={{fontSize:'0.82rem',fontWeight:800,color:'#888',marginBottom:8}}>➕ Add Activity</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <input style={{...s.input,width:50}} placeholder="🎨" value={aIcon} onChange={e=>setAIcon(e.target.value)} />
                  <input style={{...s.input,flex:2,minWidth:110}} placeholder="Activity name" value={aName} onChange={e=>setAName(e.target.value)} />
                  <input style={{...s.input,width:80}} type="number" placeholder="pts/min" value={aPpm} onChange={e=>setAPpm(e.target.value)} step="0.1" />
                  <button style={{...s.btnSave,padding:'8px 14px',width:'auto'}} onClick={()=>{
                    if(!aName||!aPpm)return;
                    onAddActivity({name:aName,icon:aIcon||'⭐',pts_per_min:parseFloat(aPpm)});
                    setAName('');setAIcon('');setAPpm('');
                  }}>Add</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


function AddKidForm({ familyId, onSave, onCancel }) {
  const COLORS = ['#e0623a','#3a9e7c','#9b5fd4','#2196f3','#ff9800','#e91e63','#009688','#795548'];
  const EMOJIS = ['⭐','🌟','🦁','🐯','🦊','🐻','🐼','🦄','🐉','🌈','🚀','⚡','🎯','🏆','💎','🎨'];
  const [name,  setName]  = useState('');
  const [age,   setAge]   = useState('');
  const [color, setColor] = useState('#e0623a');
  const [emoji, setEmoji] = useState('⭐');
  const [saving,setSaving]= useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) { setError('Please enter a name!'); return; }
    setSaving(true);
    const { data, error: err } = await supabase
      .from('kids')
      .insert({ name, age: parseInt(age)||null, color, emoji, family_id: familyId })
      .select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    onSave(data);
  };

  return (
    <div style={{background:'#f8f8f8',borderRadius:14,padding:'18px 16px',border:'2px dashed #3a9e62',marginBottom:16}}>
      <div style={{fontWeight:900,fontSize:'0.9rem',color:'#3a9e62',marginBottom:14}}>➕ Add New Child</div>
      <div style={s.field}>
        <label style={s.label}>Name</label>
        <input style={s.input} placeholder="Child's name" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div style={s.field}>
        <label style={s.label}>Age</label>
        <input style={{...s.input,width:100}} type="number" placeholder="Age" value={age} onChange={e=>setAge(e.target.value)} />
      </div>
      <div style={s.field}>
        <label style={s.label}>Color</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {COLORS.map(c => (
            <div key={c} onClick={()=>setColor(c)}
              style={{width:32,height:32,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'3px solid #2b2620':'3px solid transparent'}} />
          ))}
        </div>
      </div>
      <div style={s.field}>
        <label style={s.label}>Emoji</label>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {EMOJIS.map(e => (
            <div key={e} onClick={()=>setEmoji(e)}
              style={{width:34,height:34,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',cursor:'pointer',background:emoji===e?color+'33':'#f5f0e8',border:emoji===e?'2px solid '+color:'2px solid transparent'}}>
              {e}
            </div>
          ))}
        </div>
      </div>
      {error && <div style={s.successMsg.replace ? s.successMsg : {background:'#fff0ed',color:'#c0392b',borderRadius:10,padding:'10px 14px',fontSize:'0.82rem',fontWeight:700,marginBottom:12}}>{error}</div>}
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button style={{...s.btnSave,background:'#3a9e62',flex:1}} onClick={save} disabled={saving}>{saving?'Adding…':'Add '+( name||'Child')}</button>
        <button style={{...s.btnSave,background:'white',color:'#888',border:'2px solid #eee',flex:1}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
const s = {
  overlay:    { position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
  modal:      { background:'white',borderRadius:20,width:'100%',maxWidth:580,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',fontFamily:"'Nunito',sans-serif" },
  header:     { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'2px solid #f0ebe0' },
  closeBtn:   { background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#aaa',fontWeight:900 },
  nav:        { display:'flex',gap:0,borderBottom:'2px solid #f0ebe0' },
  navBtn:     { flex:1,padding:'12px 0',border:'none',background:'transparent',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.86rem',cursor:'pointer',color:'#aaa',transition:'all 0.15s' },
  navActive:  { color:'#2b2620',borderBottom:'3px solid #2b2620' },
  body:       { padding:'20px 24px',overflowY:'auto',flex:1 },
  sectionTitle:{ fontSize:'1rem',fontWeight:900,color:'#2b2620',marginBottom:16 },
  field:      { marginBottom:16 },
  label:      { display:'block',fontSize:'0.82rem',fontWeight:800,color:'#666',marginBottom:6 },
  input:      { padding:'9px 12px',border:'2px solid #eee',borderRadius:10,fontFamily:"'Nunito',sans-serif",fontSize:'0.86rem',fontWeight:700,outline:'none',width:'100%' },
  btnSave:    { width:'100%',padding:'11px 0',borderRadius:10,border:'none',cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'0.9rem',fontWeight:900,background:'#2b2620',color:'white' },
  optBtn:     { padding:'7px 14px',borderRadius:20,border:'2px solid #eee',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.84rem',cursor:'pointer',background:'white',color:'#888',transition:'all 0.15s' },
  kidTab:     { padding:'7px 16px',borderRadius:20,border:'2px solid',fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'0.84rem',cursor:'pointer',background:'white',transition:'all 0.15s' },
  subTab:     { flex:1,padding:'8px 0',border:'none',background:'transparent',fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:'0.84rem',cursor:'pointer',color:'#aaa',borderRadius:8,transition:'all 0.15s' },
  choreRow:   { display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #f5efe0',flexWrap:'wrap' },
  deleteBtn:  { background:'none',border:'1.5px solid #eee',color:'#ccc',borderRadius:6,cursor:'pointer',fontSize:'0.75rem',padding:'2px 8px',fontFamily:"'Nunito',sans-serif",fontWeight:800 },
  dottedBox:  { background:'#fafafa',borderRadius:10,padding:'12px 14px',border:'2px dashed #eee' },
  successMsg: { background:'#d4edda',color:'#3a9e62',borderRadius:10,padding:'10px 14px',fontSize:'0.84rem',fontWeight:800,marginBottom:12 },
};
