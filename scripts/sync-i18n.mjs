#!/usr/bin/env node

/**
 * Google Spreadsheet → i18next JSON 동기화 스크립트
 *
 * 사용법:
 *   node scripts/sync-i18n.mjs
 *
 * 환경변수:
 *   I18N_SHEET_ID  - Google 스프레드시트 ID (URL에서 /d/{ID}/edit 부분)
 *
 * 스프레드시트 구조:
 *   - 각 시트(탭) = 하나의 namespace (common, auth, dashboard, ...)
 *   - 컬럼: key | ko | en
 *   - key에 점(.)이 있으면 중첩 객체로 변환 (예: "tabs.notification" → { tabs: { notification: ... } })
 *   - key가 "[]"로 끝나면 배열로 변환 (예: "weekdays[]" 값에 "월,화,수,목,금")
 *
 * 스프레드시트는 "링크가 있는 모든 사용자" 보기 권한으로 공유해야 합니다.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'public', 'locales');
const LANGUAGES = ['ko', 'en'];

const SHEET_ID = process.env.I18N_SHEET_ID;

if (!SHEET_ID) {
  console.error('Error: I18N_SHEET_ID 환경변수를 설정해주세요.');
  console.error('  export I18N_SHEET_ID="your-google-spreadsheet-id"');
  console.error('  또는: I18N_SHEET_ID=xxx node scripts/sync-i18n.mjs');
  process.exit(1);
}

// Namespace 목록 (= 스프레드시트 시트 탭 이름)
const NAMESPACES = [
  'common', 'auth', 'company', 'dashboard', 'members', 'shops',
  'orders', 'history', 'summary', 'sidebar', 'settings', 'legal',
  'export', 'nearby', 'roles',
];

/**
 * Google 스프레드시트 시트를 CSV로 가져오기
 * 공개 스프레드시트의 경우 API 키 없이 CSV export 가능
 */
async function fetchSheetCSV(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * CSV 파싱 (따옴표, 줄바꿈, 쉼표 처리)
 */
function parseCSV(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        cell = '';
        if (row.some(c => c.trim())) rows.push(row);
        row = [];
      } else if (ch !== '\r') {
        cell += ch;
      }
    }
  }

  // 마지막 행 처리
  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some(c => c.trim())) rows.push(row);
  }

  return rows;
}

/**
 * key.path를 중첩 객체에 설정
 * "tabs.notification" → obj.tabs.notification = value
 */
function setNestedValue(obj, keyPath, value) {
  const isArray = keyPath.endsWith('[]');
  const cleanKey = isArray ? keyPath.slice(0, -2) : keyPath;
  const parts = cleanKey.split('.');

  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  const lastKey = parts[parts.length - 1];
  if (isArray) {
    // 쉼표로 분리된 값을 배열로 변환
    current[lastKey] = value.split(',').map(v => v.trim());
  } else {
    // \n 문자열을 실제 줄바꿈으로 변환
    current[lastKey] = value.replace(/\\n/g, '\n');
  }
}

/**
 * 시트 데이터를 언어별 JSON 객체로 변환
 */
function sheetToTranslations(rows) {
  if (rows.length < 2) return {};

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const keyIdx = headers.indexOf('key');
  if (keyIdx === -1) {
    throw new Error('Header row must contain "key" column');
  }

  const langIndices = {};
  for (const lang of LANGUAGES) {
    const idx = headers.indexOf(lang);
    if (idx !== -1) langIndices[lang] = idx;
  }

  const result = {};
  for (const lang of LANGUAGES) {
    result[lang] = {};
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const key = row[keyIdx]?.trim();
    if (!key || key.startsWith('#')) continue; // 빈 행 또는 주석 스킵

    for (const [lang, idx] of Object.entries(langIndices)) {
      const value = row[idx]?.trim() || '';
      if (value) {
        setNestedValue(result[lang], key, value);
      }
    }
  }

  return result;
}

async function main() {
  console.log(`Syncing translations from Google Sheet: ${SHEET_ID}`);
  console.log(`Languages: ${LANGUAGES.join(', ')}`);
  console.log(`Namespaces: ${NAMESPACES.join(', ')}`);
  console.log('');

  // 디렉토리 생성
  for (const lang of LANGUAGES) {
    mkdirSync(join(LOCALES_DIR, lang), { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const ns of NAMESPACES) {
    try {
      process.stdout.write(`  ${ns}... `);
      const csv = await fetchSheetCSV(ns);
      const rows = parseCSV(csv);
      const translations = sheetToTranslations(rows);

      for (const lang of LANGUAGES) {
        const filePath = join(LOCALES_DIR, lang, `${ns}.json`);
        writeFileSync(filePath, JSON.stringify(translations[lang], null, 2) + '\n');
      }

      const keyCount = Object.keys(flattenObj(translations[LANGUAGES[0]])).length;
      console.log(`${keyCount} keys`);
      successCount++;
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log(`Done! ${successCount} namespaces synced, ${errorCount} errors.`);
  if (errorCount > 0) {
    console.log('Tip: 시트 탭 이름이 namespace와 일치하는지 확인하세요.');
  }
}

/** 중첩 객체를 플랫 키로 변환 (카운팅용) */
function flattenObj(obj, prefix = '') {
  let result = {};
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObj(val, newKey));
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
