'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';

export default function History({ showToast }) {
  const { t } = useTranslation(['history', 'common']);
  const { members, shops, getOrdersByMonth, getActiveMonths, deleteOrder } = useStore();
  const { userRole } = useAuth();
  const months = getActiveMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] || '');
  const [selectedMember, setSelectedMember] = useState('');

  let orders = getOrdersByMonth(selectedMonth);
  if (selectedMember) {
    orders = orders.filter(o => o.member_id === Number(selectedMember));
  }
  orders = [...orders].sort((a, b) => a.date.localeCompare(b.date));

  const handleDelete = async (id) => {
    if (confirm(t('confirmDelete'))) {
      try {
        await deleteOrder(id);
        showToast(t('orderDeleted'));
      } catch (e) {
        showToast(t('common:error', { message: e.message || t('common:deleteFailed') }));
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>{t('title')}</h1>
        <div className="history-filters">
          <select className="select-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="select-input" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
            <option value="">{t('allMembers')}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        {orders.length === 0 ? (
          <div className="empty-state">{t('noOrders')}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('member')}</th>
                <th>{t('shop')}</th>
                <th>{t('menu')}</th>
                <th>{t('amount')}</th>
                <th>{t('note')}</th>
                {canDo(userRole, 'deleteOrder') && <th></th>}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const member = members.find(m => m.id === o.member_id);
                const shop = shops.find(s => s.id === o.shop_id);
                return (
                  <tr key={o.id}>
                    <td>{o.date}</td>
                    <td>{member?.name || '-'}</td>
                    <td>{shop?.name || '-'}</td>
                    <td>{o.menu_name}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(o.price)}</td>
                    <td>{o.note || ''}</td>
                    {canDo(userRole, 'deleteOrder') && (
                      <td>
                        <button className="day-order-delete" onClick={() => handleDelete(o.id)}>&times;</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
