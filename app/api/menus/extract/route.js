import { verifyAuth, isValidUUID } from '@/lib/api-auth';

// 메뉴판 사진에서 메뉴명·가격 추출 (비전 AI)
// 공급자 우선순위: Gemini(GEMINI_API_KEY) → OpenRouter(OPENROUTER_API_KEY)
// 둘 다 무료 티어 사용 가능 — 한도 초과 시 429 반환

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
];

const EXTRACT_PROMPT = `이 이미지는 카페/음식점 메뉴판입니다. 메뉴 이름과 가격을 추출해주세요.

규칙:
- 가격은 원화 숫자로만 (예: "4.5" 또는 "4,500"으로 표기된 경우 4500)
- HOT/ICE 가격이 다르면 별도 항목으로 (예: "아메리카노(ICE)")
- 사이즈별 가격이 다르면 별도 항목으로 (예: "카페라떼(L)")
- 가격을 읽을 수 없는 메뉴는 제외
- 메뉴가 아닌 텍스트(가게 이름, 안내 문구 등)는 제외

다른 설명 없이 아래 형식의 JSON 배열만 출력하세요:
[{"name": "아메리카노", "price": 4500}, {"name": "카페라떼", "price": 5000}]`;

// 모델 응답 텍스트에서 JSON 배열 추출 (마크다운 펜스 등 잡음 제거)
function parseMenusFromText(text) {
  if (!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cleanMenus(menus) {
  return (menus || [])
    .filter(m => m && typeof m.name === 'string' && m.name.trim())
    .map(m => ({
      name: String(m.name).trim().slice(0, 100),
      price: Number.isFinite(Number(m.price)) ? Math.round(Number(m.price)) : 0,
    }))
    .filter(m => m.price > 0 && m.price < 10000000);
}

async function extractWithGemini(image, mimeType) {
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const menus = parseMenusFromText(text);
    if (menus) return { menus };
  }
  return { failed: true, rateLimited };
}

async function extractWithOpenRouter(image, mimeType) {
  let rateLimited = false;
  for (const model of OPENROUTER_MODELS) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image}` } },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      }),
    });

    if (res.status === 429) {
      rateLimited = true;
      continue;
    }
    if (!res.ok) {
      console.error('OpenRouter error:', model, res.status, (await res.text()).slice(0, 300));
      continue;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    const menus = parseMenusFromText(text);
    if (menus) return { menus };
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

    let anyRateLimited = false;
    for (const provider of providers) {
      const result = await provider(image, mimeType);
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
