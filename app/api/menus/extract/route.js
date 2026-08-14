import { verifyAuth, isValidUUID } from '@/lib/api-auth';

// 메뉴판 사진에서 메뉴명·가격 추출 (비전 AI)
// 공급자 우선순위: Gemini(GEMINI_API_KEY) → OpenRouter(OPENROUTER_API_KEY)
// 둘 다 무료 티어 사용 가능 — 한도 초과 시 429 반환

// Vercel 함수 실행 시간 상한 (기본 10초로는 모델 폴백이 불가능)
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PER_MODEL_TIMEOUT_MS = 22000; // 모델당 최대 대기 시간

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
// 실측 속도·정확도 순 (2026-08). 앞 모델이 혼잡하면 자동 폴백
const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

// 출력을 [이름, 가격] 쌍으로 압축 — 생성 토큰이 절반이라 혼잡한 무료 모델에서도 빠름
const EXTRACT_PROMPT = `이 이미지는 카페/음식점 메뉴판입니다. 모든 메뉴 이름과 가격을 추출해주세요.

규칙:
- 소수점 가격은 천원 단위 축약: "4.5" → 4500, "6.0" → 6000, "10.5" → 10500
- "4,500" 또는 "4500원" → 4500
- HOT/ICE, 사이즈별 가격이 다르면 별도 항목 (예: "아메리카노(ICE)")
- 가격을 읽을 수 없는 메뉴는 제외
- 메뉴가 아닌 텍스트(가게 이름, 안내 문구 등)는 제외

다른 설명 없이 아래처럼 [이름, 가격] 쌍의 JSON 배열만 출력:
[["아메리카노",4500],["카페라떼",5000]]`;

// 모델 응답 텍스트에서 JSON 배열 추출 (마크다운 펜스 등 잡음 제거)
// [["이름", 가격], ...] 및 [{"name": ..., "price": ...}, ...] 두 형식 모두 지원
function parseMenusFromText(text) {
  if (!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed.map(item =>
      Array.isArray(item) ? { name: item[0], price: item[1] } : item
    );
  } catch {
    return null;
  }
}

function cleanMenus(menus) {
  let cleaned = (menus || [])
    .filter(m => m && typeof m.name === 'string' && m.name.trim())
    .map(m => ({
      name: String(m.name).trim().slice(0, 100),
      price: Number.isFinite(Number(m.price)) ? Number(m.price) : 0,
    }))
    .filter(m => m.price > 0);

  // 천원 단위 축약 보정 1: 개별 항목이 소수점/한자리 수로 반환된 경우 (4.5 → 4500, 6 → 6000)
  cleaned = cleaned.map(m => (m.price < 100 ? { ...m, price: m.price * 1000 } : m));

  // 천원 단위 축약 보정 2: 전체가 1000 미만이면 실제 원화일 리 없으므로 10배씩 올림 (450 → 4500)
  while (cleaned.length > 0 && cleaned.every(m => m.price < 1000)) {
    cleaned = cleaned.map(m => ({ ...m, price: m.price * 10 }));
  }

  return cleaned
    .map(m => ({ ...m, price: Math.round(m.price) }))
    .filter(m => m.price > 0 && m.price < 10000000);
}

async function extractWithGemini(image, mimeType, deadline) {
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: image } },
        { text: EXTRACT_PROMPT },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json' },
  };

  let rateLimited = false;
  for (const model of GEMINI_MODELS) {
    if (Date.now() > deadline) break;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
        }
      );

      if (res.status === 429) {
        rateLimited = true;
        continue;
      }
      if (!res.ok) {
        console.error('Gemini error:', model, res.status, (await res.text()).slice(0, 300));
        continue;
      }

      // 본문 스트리밍도 타임아웃 대상이므로 try 안에서 읽는다
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const menus = parseMenusFromText(text);
      if (menus) return { menus };
    } catch (e) {
      console.error('Gemini timeout/network:', model, e?.name);
    }
  }
  return { failed: true, rateLimited };
}

async function extractWithOpenRouter(image, mimeType, deadline) {
  let rateLimited = false;
  for (const model of OPENROUTER_MODELS) {
    if (Date.now() > deadline) break;
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          reasoning: { enabled: false },
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
              { type: 'text', text: EXTRACT_PROMPT },
            ],
          }],
        }),
        signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
      });

      if (res.status === 429) {
        rateLimited = true;
        continue;
      }
      if (!res.ok) {
        console.error('OpenRouter error:', model, res.status, (await res.text()).slice(0, 300));
        continue;
      }

      // 본문 스트리밍도 타임아웃 대상이므로 try 안에서 읽는다
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      const menus = parseMenusFromText(text);
      if (menus) return { menus };
    } catch (e) {
      console.error('OpenRouter timeout/network:', model, e?.name);
    }
  }
  return { failed: true, rateLimited };
}

export async function POST(request) {
  try {
    const { companyId, image, mimeType } = await request.json();

    if (!companyId || !image || !mimeType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid companyId format' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return Response.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    if (typeof image !== 'string' || image.length > MAX_IMAGE_BYTES * 1.4) {
      return Response.json({ error: 'Image too large' }, { status: 413 });
    }

    // 인증 + 메뉴 관리 권한(admin 이상) 확인
    const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
    if (authError) return authError;

    const providers = [];
    if (process.env.GEMINI_API_KEY) providers.push(extractWithGemini);
    if (process.env.OPENROUTER_API_KEY) providers.push(extractWithOpenRouter);

    if (providers.length === 0) {
      return Response.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    // Vercel 함수 한도(60초) 안에서 끝나도록 전체 데드라인 설정
    const deadline = Date.now() + 50000;

    let anyRateLimited = false;
    for (const provider of providers) {
      const result = await provider(image, mimeType, deadline);
      if (result.menus) {
        return Response.json({ menus: cleanMenus(result.menus) });
      }
      if (result.rateLimited) anyRateLimited = true;
    }

    if (anyRateLimited) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }
    return Response.json({ error: 'Extraction failed' }, { status: 502 });
  } catch (error) {
    console.error('Menu extract error:', error);
    return Response.json({ error: 'Failed to extract menus' }, { status: 500 });
  }
}
