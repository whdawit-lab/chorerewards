import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import AuthPage         from './components/AuthPage';
import OnboardingWizard from './components/OnboardingWizard';
import Dashboard        from './components/Dashboard';

function AppInner() {
  const { user, loading } = useAuth();
  const [familyId,  setFamilyId]  = useState(null);
  const [hasKids,   setHasKids]   = useState(null);
  const [checking,  setChecking]  = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    (async () => {
      setChecking(true);
      let { data: fam } = await supabase
        .from('families').select('id').eq('owner_id', user.id).single();
      if (!fam) {
        const { data: newFam } = await supabase
          .from('families')
          .insert({ name: 'My Family', owner_id: user.id, pts_ratio: 10 })
          .select('id').single();
        fam = newFam;
      }
      if (fam) {
        setFamilyId(fam.id);
        const { data: kids } = await supabase
          .from('kids').select('id').eq('family_id', fam.id).limit(1);
        setHasKids(!!(kids && kids.length));
      }
      setChecking(false);
    })();
  }, [user]);

  if (loading || checking) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Nunito',sans-serif",fontSize:'1.1rem',color:'#aaa'}}>
      ⭐ Loading…
    </div>
  );

  if (!user)    return <AuthPage />;
  if (!hasKids) return <OnboardingWizard familyId={familyId} onComplete={() => setHasKids(true)} />;
  return               <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
