import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

// ── useFamily ─────────────────────────────────────────────────
export function useFamily() {
  const { user } = useAuth();
  const [family, setFamily] = useState(null);
  const [kids,   setKids]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: fam } = await supabase
      .from('families')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    setFamily(fam);

    if (fam) {
      const { data: kidData } = await supabase
        .from('kids')
        .select('*')
        .eq('family_id', fam.id)
        .order('created_at');
      setKids(kidData || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addKid = async (kidData) => {
    const { data, error } = await supabase
      .from('kids')
      .insert({ ...kidData, family_id: family.id })
      .select()
      .single();
    if (error) throw error;
    setKids(prev => [...prev, data]);
    return data;
  };

  return { family, kids, loading, reload: load, addKid };
}

// ── useKidData — all data for one kid ─────────────────────────
export function useKidData(kidId, familyId) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!kidId || !familyId) return;
    setLoading(true);

    const [
      { data: chores },
      { data: completions },
      { data: grades },
      { data: behavior },
      { data: wallet },
      { data: bills },
      { data: goals },
      { data: activities },
      { data: sessions },
      { data: screenReqs },
    ] = await Promise.all([
      supabase.from('chores').select('*').eq('kid_id', kidId).order('created_at'),
      supabase.from('chore_completions').select('*').eq('kid_id', kidId),
      supabase.from('school_grades').select('*').eq('kid_id', kidId).order('logged_at', { ascending: false }),
      supabase.from('behavior_deductions').select('*').eq('kid_id', kidId).order('logged_at', { ascending: false }),
      supabase.from('wallet_transactions').select('*').eq('kid_id', kidId).order('created_at', { ascending: false }),
      supabase.from('bills').select('*').eq('kid_id', kidId).order('created_at'),
      supabase.from('goals').select('*').eq('kid_id', kidId).order('priority'),
      supabase.from('activities').select('*').eq('kid_id', kidId).order('created_at'),
      supabase.from('activity_sessions').select('*').eq('kid_id', kidId).order('logged_at', { ascending: false }),
      supabase.from('screen_requests').select('*').eq('kid_id', kidId).order('created_at', { ascending: false }),
    ]);

    setData({ chores, completions, grades, behavior, wallet, bills, goals, activities, sessions, screenReqs });
    setLoading(false);
  }, [kidId, familyId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}

// ── Point calculations ────────────────────────────────────────
export function calcPoints(data) {
  if (!data) return { total: 0, earned: 0, behaviorDeducted: 0, extraPts: 0 };

  const chorePts    = (data.completions || []).reduce((s, c) => s + (c.pts || 0), 0);
  const gradePts    = (data.grades      || []).reduce((s, g) => s + (g.pts || 0), 0);
  const extraPts    = (data.sessions    || []).filter(s => s.status === 'approved').reduce((s, x) => s + (x.pts || 0), 0);
  const behaviorPts = (data.behavior    || []).reduce((s, b) => s + (b.pts || 0), 0);
  const total       = Math.max(0, chorePts + gradePts + extraPts - behaviorPts);

  return { total, chorePts, gradePts, extraPts, behaviorPts };
}

export function calcBalance(data) {
  if (!data) return { earned: 0, spent: 0, balance: 0 };
  const { total } = calcPoints(data);
  const earned  = total / 100 * 10;
  const spent   = (data.wallet || [])
    .filter(t => t.status === 'approved')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  return { earned, spent, balance: Math.max(0, earned - spent) };
}

// ── Mutation helpers ──────────────────────────────────────────
export async function completeChore(chore, kidId, familyId) {
  const today    = new Date();
  const weekKey  = `${today.getFullYear()}-W${String(Math.ceil(today.getDate() / 7)).padStart(2,'0')}`;
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const { data, error } = await supabase
    .from('chore_completions')
    .insert({ chore_id: chore.id, kid_id: kidId, family_id: familyId, pts: chore.pts, week_key: weekKey, month_key: monthKey })
    .select().single();
  if (error) throw error;
  return data;
}

export async function uncompleteChore(choreId, kidId) {
  const today    = new Date();
  const weekKey  = `${today.getFullYear()}-W${String(Math.ceil(today.getDate() / 7)).padStart(2,'0')}`;
  const { error } = await supabase
    .from('chore_completions')
    .delete()
    .eq('chore_id', choreId)
    .eq('kid_id', kidId)
    .eq('week_key', weekKey);
  if (error) throw error;
}

export async function logGrade(kidId, familyId, subject, grade, pts) {
  const { data, error } = await supabase
    .from('school_grades')
    .insert({ kid_id: kidId, family_id: familyId, subject, grade, pts })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteGrade(id) {
  const { error } = await supabase.from('school_grades').delete().eq('id', id);
  if (error) throw error;
}

export async function logBehavior(kidId, familyId, reason, pts) {
  const { data, error } = await supabase
    .from('behavior_deductions')
    .insert({ kid_id: kidId, family_id: familyId, reason, pts })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteBehavior(id) {
  const { error } = await supabase.from('behavior_deductions').delete().eq('id', id);
  if (error) throw error;
}

export async function requestPurchase(kidId, familyId, description, amount) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert({ kid_id: kidId, family_id: familyId, description, amount, type: 'spend', status: 'pending' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, status) {
  const { error } = await supabase
    .from('wallet_transactions')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function addGoal(kidId, familyId, goalData) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ kid_id: kidId, family_id: familyId, ...goalData })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function updateGoalPriority(id, priority) {
  const { error } = await supabase.from('goals').update({ priority }).eq('id', id);
  if (error) throw error;
}

export async function logSession(kidId, familyId, activityId, activityName, activityIcon, minutes, pts, notes) {
  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({ kid_id: kidId, family_id: familyId, activity_id: activityId, activity_name: activityName, activity_icon: activityIcon, minutes, pts, notes, status: 'pending' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateSession(id, status) {
  const { error } = await supabase
    .from('activity_sessions')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function addActivity(kidId, familyId, name, icon, ptsPerMin) {
  const { data, error } = await supabase
    .from('activities')
    .insert({ kid_id: kidId, family_id: familyId, name, icon, pts_per_min: ptsPerMin })
    .select().single();
  if (error) throw error;
  return data;
}

export async function requestScreenTime(kidId, familyId, minutes, cost, costType) {
  const { data, error } = await supabase
    .from('screen_requests')
    .insert({ kid_id: kidId, family_id: familyId, minutes, cost, cost_type: costType, status: 'pending' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateScreenRequest(id, status) {
  const { error } = await supabase
    .from('screen_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function payBill(billId, kidId, familyId, billName, amount) {
  await supabase.from('bills').update({ status: 'paid' }).eq('id', billId);
  await supabase.from('wallet_transactions').insert({
    kid_id: kidId, family_id: familyId,
    description: '🏠 ' + billName, amount, type: 'bill', status: 'approved'
  });
}

export async function addBill(kidId, familyId, name, amount, dueDate) {
  const { data, error } = await supabase
    .from('bills')
    .insert({ kid_id: kidId, family_id: familyId, name, amount, due_date: dueDate, status: 'due' })
    .select().single();
  if (error) throw error;
  return data;
}
