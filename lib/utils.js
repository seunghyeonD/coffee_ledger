export function formatMoney(n) {
  if (n === 0) return '0';
  return n.toLocaleString('ko-KR') + '원';
}

export function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeeksInMonth(year, month) {
  const weeks = [];
  let currentWeek = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) {
      currentWeek.push(date);
    }
    if (dow === 5 || d === daysInMonth) {
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
  }
  return weeks;
}

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
