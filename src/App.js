import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import AuthPage    from './components/AuthPage';
import SetupPage   from './components/SetupPage';
import Dashboard   from './components/Dashboard';

function AppInner() {
  const { user, loading } = useAuth();
  const [familyId,  setFamilyId]  = useState(null);
  const [hasKids,   setHasKids]   = useState(null);
  const [checking,  setChecking]  = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    (async () => {
      setChecking(true);
      const { data: fam } = await supabase
        .from('families').select('id').eq('owner_id', user.id).single();
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

  if (!user)               return <AuthPage />;
  if (!hasKids)            return <SetupPage familyId={familyId} onComplete={() => setHasKids(true)} />;
  return                          <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
