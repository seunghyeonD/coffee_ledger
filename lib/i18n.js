import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Korean
import koCommon from '@/public/locales/ko/common.json';
import koAuth from '@/public/locales/ko/auth.json';
import koCompany from '@/public/locales/ko/company.json';
import koDashboard from '@/public/locales/ko/dashboard.json';
import koMembers from '@/public/locales/ko/members.json';
import koShops from '@/public/locales/ko/shops.json';
import koOrders from '@/public/locales/ko/orders.json';
import koHistory from '@/public/locales/ko/history.json';
import koSummary from '@/public/locales/ko/summary.json';
import koSidebar from '@/public/locales/ko/sidebar.json';
import koSettings from '@/public/locales/ko/settings.json';
import koLegal from '@/public/locales/ko/legal.json';
import koExport from '@/public/locales/ko/export.json';
import koNearby from '@/public/locales/ko/nearby.json';
import koRoles from '@/public/locales/ko/roles.json';

// English
import enCommon from '@/public/locales/en/common.json';
import enAuth from '@/public/locales/en/auth.json';
import enCompany from '@/public/locales/en/company.json';
import enDashboard from '@/public/locales/en/dashboard.json';
import enMembers from '@/public/locales/en/members.json';
import enShops from '@/public/locales/en/shops.json';
import enOrders from '@/public/locales/en/orders.json';
import enHistory from '@/public/locales/en/history.json';
import enSummary from '@/public/locales/en/summary.json';
import enSidebar from '@/public/locales/en/sidebar.json';
import enSettings from '@/public/locales/en/settings.json';
import enLegal from '@/public/locales/en/legal.json';
import enExport from '@/public/locales/en/export.json';
import enNearby from '@/public/locales/en/nearby.json';
import enRoles from '@/public/locales/en/roles.json';

// Japanese
import jaCommon from '@/public/locales/ja/common.json';
import jaAuth from '@/public/locales/ja/auth.json';
import jaCompany from '@/public/locales/ja/company.json';
import jaDashboard from '@/public/locales/ja/dashboard.json';
import jaMembers from '@/public/locales/ja/members.json';
import jaShops from '@/public/locales/ja/shops.json';
import jaOrders from '@/public/locales/ja/orders.json';
import jaHistory from '@/public/locales/ja/history.json';
import jaSummary from '@/public/locales/ja/summary.json';
import jaSidebar from '@/public/locales/ja/sidebar.json';
import jaSettings from '@/public/locales/ja/settings.json';
import jaLegal from '@/public/locales/ja/legal.json';
import jaExport from '@/public/locales/ja/export.json';
import jaNearby from '@/public/locales/ja/nearby.json';
import jaRoles from '@/public/locales/ja/roles.json';

const ns = [
  'common', 'auth', 'company', 'dashboard', 'members', 'shops',
  'orders', 'history', 'summary', 'sidebar', 'settings', 'legal',
  'export', 'nearby', 'roles',
];

i18n.use(initReactI18next).init({
  resources: {
    ko: {
      common: koCommon, auth: koAuth, company: koCompany,
      dashboard: koDashboard, members: koMembers, shops: koShops,
      orders: koOrders, history: koHistory, summary: koSummary,
      sidebar: koSidebar, settings: koSettings, legal: koLegal,
      export: koExport, nearby: koNearby, roles: koRoles,
    },
    en: {
      common: enCommon, auth: enAuth, company: enCompany,
      dashboard: enDashboard, members: enMembers, shops: enShops,
      orders: enOrders, history: enHistory, summary: enSummary,
      sidebar: enSidebar, settings: enSettings, legal: enLegal,
      export: enExport, nearby: enNearby, roles: enRoles,
    },
    ja: {
      common: jaCommon, auth: jaAuth, company: jaCompany,
      dashboard: jaDashboard, members: jaMembers, shops: jaShops,
      orders: jaOrders, history: jaHistory, summary: jaSummary,
      sidebar: jaSidebar, settings: jaSettings, legal: jaLegal,
      export: jaExport, nearby: jaNearby, roles: jaRoles,
    },
  },
  lng: typeof window !== 'undefined'
    ? localStorage.getItem('i18nextLng') || 'ko'
    : 'ko',
  fallbackLng: 'ko',
  ns,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
