import * as XLSX from 'xlsx';
import { formatDate, getWeeksInMonth, DAY_NAMES } from './utils';
import i18n from '@/lib/i18n';

export function exportExcel(store, showToast) {
  const { members, deposits, orders, getOrdersByMonth, getActiveMonths, getTotalBalance } = store;
  const wb = XLSX.utils.book_new();
  const months = getActiveMonths();

  // === Summary Sheet ===
  const summaryData = [];
  const headerRow1 = [''];
  const headerRow2 = [''];
  months.forEach(m => {
    headerRow1.push(m, '');
    headerRow2.push(i18n.t('export:deposit'), i18n.t('export:balance'));
  });
  summaryData.push(headerRow1);
  summaryData.push(headerRow2);

  members.forEach(m => {
    const row = [m.name];
    months.forEach(ym => {
      const dep = deposits.filter(d => d.member_id === m.id && d.month === ym)
        .reduce((s, d) => s + d.amount, 0);
      const allDep = deposits.filter(d => d.member_id === m.id && d.month <= ym)
        .reduce((s, d) => s + d.amount, 0);
      const allSpent = orders.filter(o => o.member_id === m.id && o.date.substring(0, 7) <= ym)
        .reduce((s, o) => s + o.price, 0);
      const balance = (m.initial_balance || 0) + allDep - allSpent;
      row.push(dep, balance);
    });
    summaryData.push(row);
  });

  summaryData.push([]);
  summaryData.push([i18n.t('export:accountBalance')]);
  summaryData.push([getTotalBalance()]);
  summaryData.push([]);
  summaryData.push([i18n.t('export:depositAccount'), i18n.t('export:bankAccount')]);

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!merges'] = months.map((_, i) => ({
    s: { r: 0, c: 1 + i * 2 },
    e: { r: 0, c: 2 + i * 2 },
  }));
  ws1['!cols'] = [{ wch: 16 }, ...months.flatMap(() => [{ wch: 12 }, { wch: 12 }])];
  XLSX.utils.book_append_sheet(wb, ws1, i18n.t('export:overview'));

  // === Monthly Sheets ===
  months.forEach(ym => {
    const [year, month] = ym.split('-').map(Number);
    const weeks = getWeeksInMonth(year, month);
    const monthOrders = getOrdersByMonth(ym);
    const sheetData = [[ym], []];

    weeks.forEach((week, wi) => {
      sheetData.push([i18n.t('export:week', { n: wi + 1 }), ...week.map(d => DAY_NAMES[d.getDay()])]);
      members.forEach(m => {
        const row = [m.name];
        week.forEach(d => {
          const dateStr = formatDate(d);
          const total = monthOrders.filter(o => o.date === dateStr && o.member_id === m.id)
            .reduce((s, o) => s + o.price, 0);
          row.push(total > 0 ? total : '');
        });
        sheetData.push(row);
      });
      sheetData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 16 }, ...Array(5).fill({ wch: 10 })];
    XLSX.utils.book_append_sheet(wb, ws, ym.replace('-', '.'));
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = i18n.t('export:fileName', { date: dateStr });
  XLSX.writeFile(wb, filename);
  showToast(i18n.t('export:downloaded'));
}
