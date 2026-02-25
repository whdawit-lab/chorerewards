import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const DEFAULT_KIDS = [
  { name: 'Elham',   age: 9, color: '#e0623a', emoji: '🔶', tagline: 'Responsible for checking everyone\'s chores! 📋' },
  { name: 'Ezekiel', age: 6, color: '#3a9e7c', emoji: '🟢', tagline: 'Great helpers earn great rewards! 🌈' },
  { name: 'Zara',    age: 4, color: '#9b5fd4', emoji: '🟣', tagline: 'Little helper, big heart! 🌸' },
];

const DEFAULT_CHORES = {
  Elham: [
    { name: 'Wash & put away dishes',      icon: '🍽️', pts: 6,  frequency: 'daily'  },
    { name: 'Make your bed',               icon: '🛏️', pts: 4,  frequency: 'daily'  },
    { name: 'Pack & unpack school bag',    icon: '🎒', pts: 3,  frequency: 'daily'  },
    { name: 'Check everyone\'s chores',    icon: '📋', pts: 5,  frequency: 'daily'  },
    { name: 'Do a load of laundry',        icon: '🧺', pts: 10, frequency: 'weekly' },
    { name: 'Clean bathroom sink & toilet',icon: '🚽', pts: 12, frequency: 'weekly' },
    { name: 'Sweep the kitchen floor',     icon: '🧹', pts: 8,  frequency: 'weekly' },
    { name: 'Help with grocery shopping',  icon: '🛒', pts: 7,  frequency: 'weekly' },
    { name: 'Take out all trash cans',     icon: '🗑️', pts: 6,  frequency: 'weekly' },
    { name: 'Clean inside the microwave',  icon: '🫙', pts: 10, frequency: 'monthly'},
    { name: 'Vacuum all rugs & carpets',   icon: '🌀', pts: 10, frequency: 'monthly'},
  ],
  Ezekiel: [
    { name: 'Pick up toys & put away',     icon: '🧸', pts: 4, frequency: 'daily'  },
    { name: 'Make your bed',               icon: '🛏️', pts: 4, frequency: 'daily'  },
    { name: 'Clear your plate after meals',icon: '🥣', pts: 3, frequency: 'daily'  },
    { name: 'Sort & fold your laundry',    icon: '🧦', pts: 7, frequency: 'weekly' },
    { name: 'Wipe down bathroom counters', icon: '🪣', pts: 7, frequency: 'weekly' },
    { name: 'Sweep your bedroom',          icon: '🧹', pts: 6, frequency: 'weekly' },
    { name: 'Wipe down the kitchen table', icon: '🧽', pts: 6, frequency: 'weekly' },
  ],
  Zara: [
    { name: 'Put toys in the toy box',        icon: '🧸', pts: 3, frequency: 'daily'  },
    { name: 'Put dirty clothes in hamper',    icon: '👚', pts: 3, frequency: 'daily'  },
    { name: 'Put books back on shelf',        icon: '📚', pts: 2, frequency: 'daily'  },
    { name: 'Water the plants (with help)',   icon: '🌿', pts: 5, frequency: 'weekly' },
    { name: 'Help wipe the table after meals',icon: '🧻', pts: 4, frequency: 'weekly' },
    { name: 'Help sort silverware',           icon: '🥄', pts: 4, frequency: 'weekly' },
  ],
};

const DEFAULT_ACTIVITIES = {
  Elham:   [{ name:'Coding', icon:'💻', pts_per_min:1 }, { name:'Spanish', icon:'🇪🇸', pts_per_min:1 }, { name:'Reading', icon:'📖', pts_per_min:0.5 }, { name:'Exercise', icon:'🏃', pts_per_min:0.5 }],
  Ezekiel: [{ name:'Coding', icon:'💻', pts_per_min:1 }, { name:'Spanish', icon:'🇪🇸', pts_per_min:1 }, { name:'Reading', icon:'📖', pts_per_min:0.5 }, { name:'Exercise', icon:'🏃', pts_per_min:0.5 }],
  Zara:    [{ name:'Reading (with help)', icon:'📖', pts_per_min:0.5 }, { name:'Spanish Songs', icon:'🇪🇸', pts_per_min:1 }, { name:'Active Play', icon:'🏃', pts_per_min:0.5 }],
};

export default function SetupPage({ familyId, onComplete }) {
  const { user } = useAuth();
  const [step,    setStep]    = useState(0); // 0=welcome, 1=seeding
  const [status,  setStatus]  = useState('');
  const [error,   setError]   = useState('');

  const seedFamily = async () => {
    setStep(1);
    try {
      for (const kid of DEFAULT_KIDS) {
        setStatus(`Adding ${kid.name}…`);
        const { data: kidRow, error: kidErr } = await supabase
          .from('kids')
          .insert({ ...kid, family_id: familyId })
          .select().single();
        if (kidErr) throw kidErr;

        // Chores
        const chores = DEFAULT_CHORES[kid.name] || [];
        for (const c of chores) {
          await supabase.from('chores').insert({ ...c, kid_id: kidRow.id, family_id: familyId });
        }

        // Activities
        const acts = DEFAULT_ACTIVITIES[kid.name] || [];
        for (const a of acts) {
          await supabase.from('activities').insert({ ...a, kid_id: kidRow.id, family_id: familyId });
        }

        // Default bills for Elham & Ezekiel
        if (kid.name === 'Elham') {
          await supabase.from('bills').insert([
            { name:'Room Rent',         amount:2.00, due_date:'End of month', status:'due', kid_id:kidRow.id, family_id:familyId },
            { name:'Electricity Share', amount:1.00, due_date:'End of month', status:'due', kid_id:kidRow.id, family_id:familyId },
            { name:'Food & Groceries',  amount:1.50, due_date:'End of month', status:'due', kid_id:kidRow.id, family_id:familyId },
          ]);
        }
        if (kid.name === 'Ezekiel') {
          await supabase.from('bills').insert([
            { name:'Room Rent',        amount:1.00, due_date:'End of month', status:'due', kid_id:kidRow.id, family_id:familyId },
            { name:'Food & Groceries', amount:1.00, due_date:'End of month', status:'due', kid_id:kidRow.id, family_id:familyId },
          ]);
        }
      }
      setStatus('All done!');
      setTimeout(onComplete, 800);
    } catch (err) {
      setError(err.message);
      setStep(0);
    }
  };

  if (step === 1) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{fontSize:'3rem', marginBottom:16}}>⚙️</div>
        <h2 style={styles.h2}>Setting up your family…</h2>
        <p style={styles.status}>{status}</p>
        {error && <p style={{color:'red', fontSize:'0.84rem'}}>{error}</p>}
        <div style={styles.spinner}></div>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{fontSize:'3rem', marginBottom:12}}>👨‍👩‍👧‍👦</div>
        <h2 style={styles.h2}>Welcome to ChoreRewards!</h2>
        <p style={{fontSize:'0.9rem', color:'#888', marginBottom:24, lineHeight:1.6}}>
          We'll set up your three kids — <strong>Elham (9)</strong>, <strong>Ezekiel (6)</strong>, and <strong>Zara (4)</strong> — with all their chores, activities, and default settings. You can customize everything after setup.
        </p>
        <button style={styles.btn} onClick={seedFamily}>🚀 Set Up My Family</button>
        <p style={{fontSize:'0.76rem', color:'#bbb', marginTop:12}}>Takes about 10 seconds</p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', background:'#fffdf8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Nunito',sans-serif", padding:20 },
  card: { background:'white', borderRadius:24, padding:'40px 36px', boxShadow:'0 8px 40px rgba(0,0,0,0.10)', maxWidth:440, width:'100%', textAlign:'center' },
  h2:   { fontSize:'1.5rem', fontWeight:900, color:'#2b2620', margin:'0 0 10px' },
  status: { fontSize:'0.9rem', color:'#888', margin:'8px 0' },
  btn: { padding:'13px 32px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'1rem', fontWeight:900, background:'#e0623a', color:'white' },
  spinner: { width:32, height:32, border:'4px solid #f0ebe0', borderTop:'4px solid #e0623a', borderRadius:'50%', margin:'20px auto 0', animation:'spin 0.8s linear infinite' },
};
