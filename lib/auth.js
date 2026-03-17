'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from './supabase';
import { authFetch } from './api-fetch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const userRole = company?.role || 'user';

  // 초기 세션 확인
  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCompanies(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      if (session?.user) {
        fetchCompanies(session.user.id);
      } else {
        setCompany(null);
        setUserCompanies([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCompanies = async (userId) => {
    const { data, error } = await getSupabase()
      .from('user_companies')
      .select('role, company:companies(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch companies:', error);
      setLoading(false);
      return;
    }

    const companies = (data || []).map(uc => ({ ...uc.company, role: uc.role }));
    setUserCompanies(companies);

    // 저장된 기업 자동 선택
    const savedId = localStorage.getItem('selectedCompanyId');
    if (savedId) {
      const saved = companies.find(c => c.id === savedId);
      if (saved) setCompany(saved);
    }

    setLoading(false);
  };

  const signUp = async (email, password, name) => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) throw error;
    return data;
  };

  const verifyOtp = async (email, token) => {
    const { data, error } = await getSupabase().auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
    setPasswordRecovery(false);
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    localStorage.removeItem('selectedCompanyId');
  };

  const deleteAccount = async () => {
    const res = await authFetch('/api/account/delete', { method: 'POST' });
    if (!res.ok) throw new Error('계정 삭제에 실패했습니다.');
    await getSupabase().auth.signOut();
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    localStorage.removeItem('selectedCompanyId');
  };

  const selectCompany = useCallback((comp) => {
    setCompany(comp);
    localStorage.setItem('selectedCompanyId', comp.id);
  }, []);

  const clearCompany = useCallback(() => {
    setCompany(null);
    localStorage.removeItem('selectedCompanyId');
  }, []);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const createCompany = async (name) => {
    const supabase = getSupabase();
    const inviteCode = generateInviteCode();
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name, created_by: user.id, invite_code: inviteCode })
      .select()
      .single();

    if (companyError) throw companyError;

    const displayName = user.user_metadata?.display_name || '';
    const { error: ucError } = await supabase
      .from('user_companies')
      .insert({ user_id: user.id, company_id: companyData.id, role: 'master', name: displayName });

    if (ucError) throw ucError;

    const newComp = { ...companyData, role: 'master' };
    setUserCompanies(prev => [...prev, newComp]);
    selectCompany(newComp);
    return newComp;
  };

  const joinCompany = async (inviteCode) => {
    const supabase = getSupabase();

    // 초대 코드로 기업 조회
    const { data: companyData, error: findError } = await supabase
      .from('companies')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (findError) throw findError;
    if (!companyData) throw new Error('유효하지 않은 초대 코드입니다.');

    // 이미 소속된 기업인지 확인
    const already = userCompanies.find(c => c.id === companyData.id);
    if (already) {
      selectCompany(already);
      return already;
    }

    // user_companies에 추가
    const displayName = user.user_metadata?.display_name || '';
    const { error: joinError } = await supabase
      .from('user_companies')
      .insert({ user_id: user.id, company_id: companyData.id, role: 'user', name: displayName });

    if (joinError) throw joinError;

    const newComp = { ...companyData, role: 'user' };
    setUserCompanies(prev => [...prev, newComp]);
    selectCompany(newComp);
    return newComp;
  };

  const getCompanyMembers = async () => {
    if (!company) return [];
    const res = await authFetch(`/api/companies/members?companyId=${company.id}`);
    if (!res.ok) throw new Error('멤버 목록을 불러오지 못했습니다.');
    return res.json();
  };

  const updateMemberRole = async (targetUserId, newRole) => {
    if (!company) throw new Error('기업이 선택되지 않았습니다.');
    const { error } = await getSupabase()
      .from('user_companies')
      .update({ role: newRole })
      .eq('user_id', targetUserId)
      .eq('company_id', company.id);
    if (error) throw error;
  };

  const updateMemberName = async (targetUserId, name) => {
    if (!company) throw new Error('기업이 선택되지 않았습니다.');
    const res = await authFetch('/api/companies/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: company.id, userId: targetUserId, name }),
    });
    if (!res.ok) throw new Error('이름 변경에 실패했습니다.');
  };

  const removeMember = async (targetUserId) => {
    if (!company) throw new Error('기업이 선택되지 않았습니다.');
    const res = await authFetch(`/api/companies/members?companyId=${company.id}&userId=${targetUserId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('유저 제거에 실패했습니다.');
  };

  const value = {
    user, company, userCompanies, userRole, loading, passwordRecovery,
    signUp, verifyOtp, signIn, signOut, resetPassword, updatePassword,
    selectCompany, clearCompany, createCompany, joinCompany,
    getCompanyMembers, updateMemberRole, updateMemberName, removeMember,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
