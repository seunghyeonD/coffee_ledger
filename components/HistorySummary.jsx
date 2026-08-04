'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import History from './History';
import Summary from './Summary';

export default function HistorySummary({ showToast }) {
  const { t } = useTranslation('sidebar');
  const { getActiveMonths } = useStore();
  const months = getActiveMonths();
  const [tab, setTab] = useState('history');
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] || '');

  return (
    <>
      <div className="page-tabs">
        <button
          className={`page-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          {t('history')}
        </button>
        <button
          className={`page-tab ${tab === 'summary' ? 'active' : ''}`}
          onClick={() => setTab('summary')}
        >
          {t('summary')}
        </button>
      </div>

      {tab === 'history' ? (
        <History showToast={showToast} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      ) : (
        <Summary showToast={showToast} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      )}
    </>
  );
}
