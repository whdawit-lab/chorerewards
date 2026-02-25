import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode,      setMode]      = useState('login'); // 'login' | 'signup'
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [famName,   setFamName]   = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, famName || 'My Family');
        setError('✅ Check your email to confirm your account, then log in!');
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>⭐</div>
        <h1 style={styles.title}>ChoreRewards</h1>
        <p style={styles.subtitle}>Chores · School · Goals · Rewards</p>

        <div style={styles.tabs}>
          <button style={{...styles.tab, ...(mode==='login' ? styles.tabActive : {})}} onClick={() => setMode('login')}>Log In</button>
          <button style={{...styles.tab, ...(mode==='signup' ? styles.tabActive : {})}} onClick={() => setMode('signup')}>Sign Up</button>
        </div>

        <form onSubmit={handle} style={styles.form}>
          {mode === 'signup' && (
            <input style={styles.input} placeholder="Family name (e.g. The Smiths)" value={famName} onChange={e => setFamName(e.target.value)} />
          )}
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Log In →' : 'Create Account →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', background: '#fffdf8',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Nunito', sans-serif", padding: 20,
  },
  card: {
    background: 'white', borderRadius: 24, padding: '40px 36px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)', maxWidth: 400, width: '100%',
    textAlign: 'center',
  },
  logo:     { fontSize: '3rem', marginBottom: 8 },
  title:    { fontSize: '2rem', fontWeight: 900, color: '#2b2620', margin: 0 },
  subtitle: { fontSize: '0.86rem', color: '#aaa', marginTop: 4, marginBottom: 24 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, background: '#f5f0e8', borderRadius: 12, padding: 4 },
  tab: {
    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: '0.9rem',
    background: 'transparent', color: '#aaa', transition: 'all 0.15s',
  },
  tabActive: { background: 'white', color: '#2b2620', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  form:  { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px', borderRadius: 12, border: '2px solid #eee',
    fontFamily: "'Nunito', sans-serif", fontSize: '0.92rem', fontWeight: 700,
    outline: 'none', transition: 'border-color 0.15s',
  },
  btn: {
    padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", fontSize: '1rem', fontWeight: 900,
    background: '#e0623a', color: 'white', transition: 'opacity 0.15s', marginTop: 4,
  },
  error: {
    fontSize: '0.82rem', padding: '10px 14px', borderRadius: 10,
    background: '#fff0ed', color: '#c0392b', fontWeight: 700, textAlign: 'left',
  },
};
