import * as XLSX from 'xlsx';
import { formatDate, getWeeksInMonth, DAY_NAMES } from './utils';
import i18n from '@/lib/i18n';

const t = (key, opts) => i18n.t(`export:${key}`, opts);

function num(n) {
  return typeof n === 'number' ? n : 0;
}

export function exportExcel(store, showToast) {
  const { members, shops, deposits, orders, getOrdersByMonth, getActiveMonths, getTotalBalance, getMemberBalance } = store;
  const wb = XLSX.utils.book_new();
  const months = getActiveMonths();

  // ──────────────────────────────────────────
  // Sheet 1: 종합 현황
  // ──────────────────────────────────────────
  const overview = [];

  // 보고서 헤더
  const now = new Date();
  overview.push([t('reportTitle')]);
  overview.push([t('reportDate', { date: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}` })]);
  overview.push([]);

  // 핵심 지표
  const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
  const totalInitial = members.reduce((s, m) => s + num(m.initial_balance), 0);
  const totalSpent = orders.reduce((s, o) => s + o.price, 0);

  overview.push([t('keyMetrics')]);
  overview.push([t('totalMembers'), members.length]);
  overview.push([t('totalDeposits'), totalInitial + totalDeposits]);
  overview.push([t('totalSpent'), totalSpent]);
  overview.push([t('accountBalance'), getTotalBalance()]);
  overview.push([t('totalOrders'), orders.length]);
  overview.push([]);

  // 멤버별 현황 테이블
  overview.push([t('memberStatus')]);
  overview.push([t('memberName'), t('deposit'), t('spent'), t('balance'), t('orderCount')]);

  members.forEach(m => {
    const dep = num(m.initial_balance) + deposits.filter(d => d.member_id === m.id).reduce((s, d) => s + d.amount, 0);
    const spent = orders.filter(o => o.member_id === m.id).reduce((s, o) => s + o.price, 0);
    const bal = getMemberBalance(m.id);
    const cnt = orders.filter(o => o.member_id === m.id).length;
    overview.push([m.name, dep, spent, bal, cnt]);
  });

  // 합계 행
  const totalRow = [
    t('totalLabel'),
    totalInitial + totalDeposits,
    totalSpent,
    getTotalBalance(),
    orders.length,
  ];
  overview.push(totalRow);

  overview.push([]);

  // 업체별 이용 현황
  overview.push([t('shopUsage')]);
  overview.push([t('shopName'), t('orderCount'), t('totalAmount')]);
  shops.forEach(s => {
    const shopOrders = orders.filter(o => o.shop_id === s.id);
    overview.push([s.name, shopOrders.length, shopOrders.reduce((sum, o) => sum + o.price, 0)]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(overview);
  ws1['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
  // 보고서 제목 병합
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, ws1, t('overviewSheet'));

  // ──────────────────────────────────────────
  // Sheet 2~N: 월별 상세
  // ──────────────────────────────────────────
  months.forEach(ym => {
    const [year, month] = ym.split('-').map(Number);
    const weeks = getWeeksInMonth(year, month);
    const monthOrders = getOrdersByMonth(ym);
    const monthDeposits = deposits.filter(d => d.month === ym);
    const data = [];

    // 월 헤더
    data.push([t('monthTitle', { ym })]);
    data.push([]);

    // 주차별 멤버 × 요일 테이블
    weeks.forEach((week, wi) => {
      // 헤더: 주차 | 월 | 화 ... | 합계
      data.push([
        t('week', { n: wi + 1 }),
        ...week.map(d => `${DAY_NAMES[d.getDay()]}(${d.getDate()})`),
        t('weekTotal'),
      ]);

      members.forEach(m => {
        let weekTotal = 0;
        const row = [m.name];
        week.forEach(d => {
          const dateStr = formatDate(d);
          const dayTotal = monthOrders
            .filter(o => o.date === dateStr && o.member_id === m.id)
            .reduce((s, o) => s + o.price, 0);
          weekTotal += dayTotal;
          row.push(dayTotal > 0 ? dayTotal : '');
        });
        row.push(weekTotal > 0 ? weekTotal : '');
        data.push(row);
      });

      // 일별 합계 행
      const dayTotals = [t('dayTotal')];
      let grandWeekTotal = 0;
      week.forEach(d => {
        const dateStr = formatDate(d);
        const daySum = monthOrders
          .filter(o => o.date === dateStr)
          .reduce((s, o) => s + o.price, 0);
        grandWeekTotal += daySum;
        dayTotals.push(daySum > 0 ? daySum : '');
      });
      dayTotals.push(grandWeekTotal > 0 ? grandWeekTotal : '');
      data.push(dayTotals);
      data.push([]);
    });

    // 월 요약
    data.push([t('monthSummary')]);
    data.push([t('memberName'), t('orderCount'), t('totalAmount'), t('monthDeposit')]);

    members.forEach(m => {
      const mOrders = monthOrders.filter(o => o.member_id === m.id);
      const mDeposit = monthDeposits.filter(d => d.member_id === m.id).reduce((s, d) => s + d.amount, 0);
      data.push([m.name, mOrders.length, mOrders.reduce((s, o) => s + o.price, 0), mDeposit]);
    });

    // 월 합계
    data.push([
      t('totalLabel'),
      monthOrders.length,
      monthOrders.reduce((s, o) => s + o.price, 0),
      monthDeposits.reduce((s, d) => s + d.amount, 0),
    ]);

    data.push([]);

    // 주문 상세 내역
    data.push([t('orderDetail')]);
    data.push([t('date'), t('memberName'), t('shopName'), t('menuName'), t('amount')]);

    const sortedOrders = [...monthOrders].sort((a, b) => a.date.localeCompare(b.date));
    sortedOrders.forEach(o => {
      const member = members.find(m => m.id === o.member_id);
      const shop = shops.find(s => s.id === o.shop_id);
      data.push([o.date, member?.name || '?', shop?.name || '?', o.menu_name, o.price]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    // 월 제목 병합
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSX.utils.book_append_sheet(wb, ws, ym.replace('-', '.'));
  });

  // 파일 다운로드
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = t('fileName', { date: dateStr });
  XLSX.writeFile(wb, filename);
  showToast(t('downloaded'));
}
