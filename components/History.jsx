'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { canDo } from '@/lib/roles';

export default function History({ showToast }) {
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
    if (confirm('이 주문을 삭제하시겠습니까?')) {
      try {
        await deleteOrder(id);
        showToast('주문이 삭제되었습니다.');
      } catch (e) {
        showToast('오류: ' + (e.message || '삭제 실패'));
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>주문 내역</h1>
        <div className="history-filters">
          <select className="select-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="select-input" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
            <option value="">전체 멤버</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        {orders.length === 0 ? (
          <div className="empty-state">주문 내역이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>멤버</th>
                <th>업체</th>
                <th>메뉴</th>
                <th>금액</th>
                <th>비고</th>
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
