'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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

  const signUp = async (email, password) => {
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
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

  const createCompany = async (name) => {
    const supabase = getSupabase();
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (companyError) throw companyError;

    const { error: ucError } = await supabase
      .from('user_companies')
      .insert({ user_id: user.id, company_id: companyData.id, role: 'owner' });

    if (ucError) throw ucError;

    const newComp = { ...companyData, role: 'owner' };
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
    const { error: joinError } = await supabase
      .from('user_companies')
      .insert({ user_id: user.id, company_id: companyData.id, role: 'member' });

    if (joinError) throw joinError;

    const newComp = { ...companyData, role: 'member' };
    setUserCompanies(prev => [...prev, newComp]);
    selectCompany(newComp);
    return newComp;
  };

  const value = {
    user, company, userCompanies, loading,
    signUp, signIn, signOut,
    selectCompany, clearCompany, createCompany, joinCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
