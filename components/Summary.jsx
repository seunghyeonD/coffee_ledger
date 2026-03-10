'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatMoney, formatDate, getWeeksInMonth, DAY_NAMES } from '@/lib/utils';

export default function Summary() {
  const { members, orders, deposits, getOrdersByMonth, getActiveMonths, getMemberBalance } = useStore();
  const months = getActiveMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] || '');

  if (!selectedMonth) return <div className="empty-state">데이터가 없습니다.</div>;

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthOrders = getOrdersByMonth(selectedMonth);
  const weeks = getWeeksInMonth(year, month);

  return (
    <>
      <div className="page-header">
        <h1>월별 요약</h1>
        <select className="select-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Weekly Tables */}
      {weeks.map((week, wi) => {
        const weekDates = week.map(d => formatDate(d));
        const weekMembers = members.filter(m =>
          monthOrders.some(o => weekDates.includes(o.date) && o.member_id === m.id)
        );
        if (weekMembers.length === 0) return null;
        return (
          <div key={wi} className="summary-table-section">
            <h3>{wi + 1}주차</h3>
            <div className="summary-table-scroll">
              <table className="summary-week-table">
                <thead>
                  <tr>
                    <th>{wi + 1}주차</th>
                    {week.map((d, i) => <th key={i}>{DAY_NAMES[d.getDay()]}</th>)}
                    <th>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {weekMembers.map(m => {
                    let rowTotal = 0;
                    return (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        {week.map((d, i) => {
                          const dateStr = formatDate(d);
                          const total = monthOrders
                            .filter(o => o.date === dateStr && o.member_id === m.id)
                            .reduce((s, o) => s + o.price, 0);
                          rowTotal += total;
                          return <td key={i}>{total > 0 ? formatMoney(total) : ''}</td>;
                        })}
                        <td><strong>{rowTotal > 0 ? formatMoney(rowTotal) : ''}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
