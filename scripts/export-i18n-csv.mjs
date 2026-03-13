#!/usr/bin/env node

/**
 * 로컬 i18next JSON → CSV 내보내기
 *
 * 현재 public/locales/ 의 JSON 파일들을 namespace별 CSV로 변환합니다.
 * 생성된 CSV를 Google 스프레드시트에 각 시트(탭)별로 붙여넣으면 됩니다.
 *
 * 사용법:
 *   node scripts/export-i18n-csv.mjs
 *
 * 결과:
 *   scripts/csv/ 폴더에 namespace별 CSV 파일 생성
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'public', 'locales');
const OUTPUT_DIR = join(__dirname, 'csv');
const LANGUAGES = ['ko', 'en'];

function flattenObj(obj, prefix = '') {
  let result = {};
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(val)) {
      // 배열은 쉼표로 합쳐서 저장, key에 [] 접미사
      result[`${newKey}[]`] = val.join(',');
    } else if (typeof val === 'object' && val !== null) {
      Object.assign(result, flattenObj(val, newKey));
    } else {
      // 줄바꿈을 \n 문자열로 변환
      result[newKey] = String(val).replace(/\n/g, '\\n');
    }
  }
  return result;
}

function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ko 디렉토리에서 namespace 목록 가져오기
  const namespaces = readdirSync(join(LOCALES_DIR, 'ko'))
    .filter(f => f.endsWith('.json'))
    .map(f => basename(f, '.json'));

  console.log(`Exporting ${namespaces.length} namespaces to CSV...`);
  console.log('');

  for (const ns of namespaces) {
    // 각 언어의 JSON 읽기
    const langData = {};
    for (const lang of LANGUAGES) {
      try {
        const raw = readFileSync(join(LOCALES_DIR, lang, `${ns}.json`), 'utf-8');
        langData[lang] = flattenObj(JSON.parse(raw));
      } catch {
        langData[lang] = {};
      }
    }

    // 모든 키 수집 (ko 기준 + en에만 있는 키)
    const allKeys = new Set([
      ...Object.keys(langData.ko || {}),
      ...Object.keys(langData.en || {}),
    ]);
    const sortedKeys = [...allKeys].sort();

    // CSV 생성
    const lines = [`key,ko,en`];
    for (const key of sortedKeys) {
      const ko = langData.ko?.[key] || '';
      const en = langData.en?.[key] || '';
      lines.push(`${escapeCSV(key)},${escapeCSV(ko)},${escapeCSV(en)}`);
    }

    const csvPath = join(OUTPUT_DIR, `${ns}.csv`);
    writeFileSync(csvPath, lines.join('\n') + '\n');
    console.log(`  ${ns}.csv - ${sortedKeys.length} keys`);
  }

  console.log('');
  console.log(`CSV files exported to: ${OUTPUT_DIR}`);
  console.log('');
  console.log('Google 스프레드시트 세팅 방법:');
  console.log('  1. 새 Google 스프레드시트 생성');
  console.log('  2. 각 namespace 이름으로 시트(탭) 추가 (common, auth, dashboard, ...)');
  console.log('  3. 각 시트에 해당 CSV 파일 내용을 붙여넣기');
  console.log('  4. 공유 > "링크가 있는 모든 사용자"에게 뷰어 권한 부여');
  console.log('  5. URL에서 스프레드시트 ID 복사 (https://docs.google.com/spreadsheets/d/{ID}/edit)');
  console.log('  6. I18N_SHEET_ID={ID} node scripts/sync-i18n.mjs 로 동기화 테스트');
}

main();
