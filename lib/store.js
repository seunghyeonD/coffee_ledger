'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { getSupabase } from './supabase';
import { authFetch } from './api-fetch';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [companyId, setCompanyId] = useState(null);

  const init = useCallback(async (cid) => {
    if (!cid) return;
    setCompanyId(cid);
    setLoaded(false);

    const [membersRes, shopsRes, menusRes, ordersRes, depositsRes] = await Promise.all([
      getSupabase().from('members').select('*').eq('company_id', cid).order('id'),
      getSupabase().from('shops').select('*').eq('company_id', cid).order('id'),
      getSupabase().from('menus').select('*').eq('company_id', cid).order('id'),
      getSupabase().from('orders').select('*').eq('company_id', cid).order('date'),
      getSupabase().from('deposits').select('*').eq('company_id', cid).order('id'),
    ]);

    if (membersRes.error) throw membersRes.error;

    setMembers(membersRes.data || []);

    const shopsWithMenus = (shopsRes.data || []).map(s => ({
      ...s,
      menus: (menusRes.data || []).filter(m => m.shop_id === s.id),
    }));
    setShops(shopsWithMenus);
    setOrders(ordersRes.data || []);
    setDeposits(depositsRes.data || []);
    setLoaded(true);
  }, []);

  const reset = useCallback(() => {
    setMembers([]);
    setShops([]);
    setOrders([]);
    setDeposits([]);
    setLoaded(false);
    setCompanyId(null);
  }, []);

  // === Members ===
  const addMember = async (name, initialBalance = 0) => {
    const { data, error } = await getSupabase().from('members')
      .insert({ name, initial_balance: initialBalance, company_id: companyId }).select().single();
    if (error) throw error;
    setMembers(prev => [...prev, data]);
    return data;
  };

  const updateMember = async (id, name) => {
    const { error } = await getSupabase().from('members').update({ name }).eq('id', id);
    if (error) throw error;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, name } : m));
  };

  const deleteMember = async (id) => {
    const { error } = await getSupabase().from('members').delete().eq('id', id);
    if (error) throw error;
    setMembers(prev => prev.filter(m => m.id !== id));
    setOrders(prev => prev.filter(o => o.member_id !== id));
    setDeposits(prev => prev.filter(d => d.member_id !== id));
  };

  const getMemberBalance = useCallback((memberId) => {
    const dep = deposits.filter(d => d.member_id === memberId).reduce((s, d) => s + d.amount, 0);
    const spent = orders.filter(o => o.member_id === memberId).reduce((s, o) => s + o.price, 0);
    const member = members.find(m => m.id === memberId);
    const initial = member ? (member.initial_balance || 0) : 0;
    return initial + dep - spent;
  }, [members, orders, deposits]);

  // === Shops ===
  const addShop = async (name, color = '#4a90d9') => {
    const { data, error } = await getSupabase().from('shops')
      .insert({ name, color, company_id: companyId }).select().single();
    if (error) throw error;
    data.menus = [];
    setShops(prev => [...prev, data]);
    return data;
  };

  const updateShop = async (id, name, color) => {
    const { error } = await getSupabase().from('shops').update({ name, color }).eq('id', id);
    if (error) throw error;
    setShops(prev => prev.map(s => s.id === id ? { ...s, name, color } : s));
  };

  const deleteShop = async (id) => {
    const { error } = await getSupabase().from('shops').delete().eq('id', id);
    if (error) throw error;
    setShops(prev => prev.filter(s => s.id !== id));
  };

  const addMenu = async (shopId, name, price) => {
    const { data, error } = await getSupabase().from('menus')
      .insert({ shop_id: shopId, name, price: Number(price), company_id: companyId }).select().single();
    if (error) throw error;
    setShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, menus: [...s.menus, data] } : s
    ));
    return data;
  };

  const addMenusBulk = async (shopId, menuItems) => {
    const rows = menuItems.map(m => ({ shop_id: shopId, name: m.name, price: Number(m.price), company_id: companyId }));
    const { data, error } = await getSupabase().from('menus').insert(rows).select();
    if (error) throw error;
    setShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, menus: [...s.menus, ...data] } : s
    ));
    return data;
  };

  const updateMenu = async (shopId, menuId, name, price) => {
    const { error } = await getSupabase().from('menus')
      .update({ name, price: Number(price) }).eq('id', menuId);
    if (error) throw error;
    setShops(prev => prev.map(s =>
      s.id === shopId
        ? { ...s, menus: s.menus.map(m => m.id === menuId ? { ...m, name, price: Number(price) } : m) }
        : s
    ));
  };

  const deleteMenu = async (shopId, menuId) => {
    const { error } = await getSupabase().from('menus').delete().eq('id', menuId);
    if (error) throw error;
    setShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, menus: s.menus.filter(m => m.id !== menuId) } : s
    ));
  };

  // === Orders ===
  const addOrder = async (date, memberId, shopId, menuName, price, note = '') => {
    const { data, error } = await getSupabase().from('orders')
      .insert({ date, member_id: memberId, shop_id: shopId, menu_name: menuName, price: Number(price), note, company_id: companyId })
      .select().single();
    if (error) throw error;
    setOrders(prev => [...prev, data]);

    // 알림 발송 (fire-and-forget)
    const member = members.find(m => m.id === memberId);
    const memberName = member?.name || 'Unknown';
    const numPrice = Number(price);

    // 주문 등록 알림
    authFetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_registered',
        companyId,
        data: { memberName, menuName, price: numPrice },
      }),
    }).catch(() => {});

    // 잔액 부족 체크
    const newBalance = getMemberBalance(memberId) - numPrice;
    if (newBalance < 10000) {
      // 관리자에게 잔액 부족 알림
      authFetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'low_balance',
          companyId,
          data: { memberName, balance: newBalance },
        }),
      }).catch(() => {});

      // 본인에게 충전 요청 알림 (알림 설정 켜져있고 임계값 이하인 경우만)
      authFetch('/api/notifications/send-to-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          memberName,
          balance: newBalance,
          autoTriggered: true,
        }),
      }).catch(() => {});
    }

    return data;
  };

  const deleteOrder = async (id) => {
    const { error } = await getSupabase().from('orders').delete().eq('id', id);
    if (error) throw error;
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const getOrdersByDate = useCallback((date) => {
    return orders.filter(o => o.date === date);
  }, [orders]);

  const getOrdersByMonth = useCallback((ym) => {
    return orders.filter(o => o.date.startsWith(ym));
  }, [orders]);

  // === Deposits ===
  const addDeposit = async (memberId, month, amount) => {
    const { data, error } = await getSupabase().from('deposits')
      .insert({ member_id: memberId, month, amount: Number(amount), company_id: companyId }).select().single();
    if (error) throw error;
    setDeposits(prev => [...prev, data]);
    return data;
  };

  const deleteDeposit = async (id) => {
    const { error } = await getSupabase().from('deposits').delete().eq('id', id);
    if (error) throw error;
    setDeposits(prev => prev.filter(d => d.id !== id));
  };

  const getDepositsByMember = useCallback((memberId) => {
    return deposits.filter(d => d.member_id === memberId);
  }, [deposits]);

  // === Utility ===
  const getTotalBalance = useCallback(() => {
    const totalDep = deposits.reduce((s, d) => s + d.amount, 0);
    const totalInit = members.reduce((s, m) => s + (m.initial_balance || 0), 0);
    const totalSpent = orders.reduce((s, o) => s + o.price, 0);
    return totalInit + totalDep - totalSpent;
  }, [members, orders, deposits]);

  const getActiveMonths = useCallback(() => {
    const months = new Set();
    orders.forEach(o => months.add(o.date.substring(0, 7)));
    deposits.forEach(d => months.add(d.month));
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return [...months].sort();
  }, [orders, deposits]);

  const value = {
    members, shops, orders, deposits, loaded, companyId,
    init, reset,
    addMember, updateMember, deleteMember, getMemberBalance,
    addShop, updateShop, deleteShop,
    addMenu, addMenusBulk, updateMenu, deleteMenu,
    addOrder, deleteOrder, getOrdersByDate, getOrdersByMonth,
    addDeposit, deleteDeposit, getDepositsByMember,
    getTotalBalance, getActiveMonths,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
