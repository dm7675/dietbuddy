// Supabase Edge Function "dietbuddy-ai" — the app's only AI endpoint (Google Gemini).
//   task "receipt" (default): reads a photo of a Croatian shop receipt and returns the store,
//                             date and each line matched to the app's food list.
//   task "recipe":            turns a meal (ingredients + grams) into a short home recipe.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY  required — from https://aistudio.google.com/apikey (free tier, keep billing OFF)
//   GEMINI_MODEL    optional — e.g. "gemini-3.8-flash"; if empty, the newest Flash model is picked
//
// The Gemini key never leaves this server; the app only calls this function.

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_IMAGE_BYTES = 6_000_000; // base64 of a resized phone photo is ~0.5–1.5 MB

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FoodRef {
  id: string;
  en: string;
  hr: string;
}

interface RequestBody {
  image: string; // base64 JPEG, no data: prefix
  mimeType?: string;
  foods: FoodRef[];
  chains: string[];
}

interface RecipeBody {
  task: 'recipe';
  language: 'en' | 'hr';
  meal: { name: string; ingredients: { name: string; grams: number }[] };
}

/** fetch with a time limit, so a slow or silent Google API gives a clear error instead of hanging. */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error(`Google API did not answer within ${Math.round(ms / 1000)} s`);
    }
    throw e;
  }
}

/* ---------- Model choice ---------- */

let cachedModel: string | null = null;

/** Newest plain "gemini-X.Y-flash" model that supports generateContent. */
async function pickModel(key: string): Promise<string> {
  const fromEnv = Deno.env.get('GEMINI_MODEL');
  if (fromEnv) return fromEnv;
  if (cachedModel) return cachedModel;
  try {
    const res = await fetchWithTimeout(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } }, 10_000);
    const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const flash = (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => /^gemini-\d+(\.\d+)?-flash$/.test(n))
      .sort((a, b) => Number.parseFloat(b.slice(7)) - Number.parseFloat(a.slice(7)));
    cachedModel = flash[0] ?? 'gemini-3.8-flash';
  } catch {
    cachedModel = 'gemini-3.8-flash';
  }
  return cachedModel;
}

/* ---------- Prompt & schema ---------- */

function buildSchema(foodIds: string[], chains: string[]) {
  return {
    type: 'object',
    properties: {
      chain: { type: 'string', enum: [...chains, 'other'], description: 'Store chain that issued the receipt.' },
      date: { type: 'string', description: 'Receipt date as YYYY-MM-DD, or empty if not readable.' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The product line exactly as printed.' },
            food_id: { type: 'string', enum: [...foodIds, 'none'], description: 'Matching app food, or "none".' },
            total_price: { type: 'number', description: 'Price paid for this line in EUR, after line discounts.' },
            weight_g: {
              type: 'number',
              description: 'Total bought weight in grams (litres count as 1000 g). 0 if unknown.',
            },
            pieces: { type: 'number', description: 'Number of pieces (e.g. eggs). 0 if not counted in pieces.' },
          },
          required: ['text', 'food_id', 'total_price', 'weight_g', 'pieces'],
        },
      },
    },
    required: ['chain', 'date', 'items'],
  };
}

function buildPrompt(foods: FoodRef[]): string {
  const list = foods.map((f) => `${f.id}: ${f.en} / ${f.hr}`).join('\n');
  return `This is a photo of a shop receipt from Croatia (prices in EUR, decimal comma).
Read every purchased product line and return JSON.

Rules:
- total_price: the amount paid for that line (if a discount line follows, subtract it).
- weight_g: total bought weight. Use the weighed amount ("0,512 kg" → 512) or the pack size in the name
  ("JOGURT 1KG" → 1000, "500G" → 500, "1L" → 1000). Multiply by quantity if the line shows e.g. "2 x".
  Use 0 if the weight is unknown.
- pieces: number of items for things sold by count, e.g. eggs "JAJA M 10/1" → 10 (times quantity). Otherwise 0.
- food_id: pick the closest food from this list only when the product really is that food
  (plain chicken breast fillet → chicken_breast; flavoured yogurt, chocolate, juice, sweets → none).
  Use "none" for non-food items and foods not on the list.
- chain: the store chain name printed on top of the receipt (lowercase id from the allowed list), else "other".

Foods (id: English / Croatian):
${list}`;
}

/* ---------- Gemini call ---------- */

function extractText(body: unknown): string {
  const b = body as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (b.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

/* ---------- Recipes ---------- */

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short, appetising name of the dish.' },
    minutes: { type: 'integer', description: 'Total time in minutes.' },
    steps: { type: 'array', items: { type: 'string' }, description: '4–8 short cooking steps, in order.' },
    seasoning: {
      type: 'array',
      items: { type: 'string' },
      description: 'Calorie-free extras used: salt, pepper, herbs, spices, garlic, lemon juice, vinegar, water.',
    },
    tip: { type: 'string', description: 'One practical tip (meal prep, doneness, a swap). Empty if none.' },
  },
  required: ['title', 'minutes', 'steps', 'seasoning', 'tip'],
};

function recipePrompt(r: RecipeBody): string {
  const lang = r.language === 'hr' ? 'Croatian (hrvatski)' : 'English';
  const list = r.meal.ingredients.map((i) => `- ${Math.round(i.grams)} g ${i.name}`).join('\n');
  return `Write a simple home recipe for ONE person, in ${lang}, for the meal "${r.meal.name}".

Use exactly these ingredients and amounts (weights are before cooking: dry pasta/rice/grains, raw meat):
${list}

Rules:
- Do not add anything with real calories (no extra oil, butter, sugar, cheese, cream or bread).
- You may add salt, pepper, herbs, spices, garlic, a little onion, lemon juice, vinegar and water.
- Ready-made items (frozen pizza, fries, ice cream, chocolate, bread) only need simple serving steps.
- Use a normal home kitchen (stove, oven, pan, pot). Keep the steps short and practical.`;
}

/* ---------- Gemini call ---------- */

async function callGemini(key: string, model: string, parts: unknown[], schema: unknown, temperature = 0) {
  const contents = [{ parts }];
  // Newer Flash models "think" before answering, which can take very long; these tasks
  // don't need it, so ask for low thinking first. Current docs use responseFormat; older API
  // versions used responseMimeType + responseJsonSchema. A 400 means "unknown field" → next one.
  const low = { thinkingConfig: { thinkingLevel: 'low' } };
  const configs = [
    { responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema } }, temperature, ...low },
    { responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema } }, temperature },
    { responseMimeType: 'application/json', responseJsonSchema: schema, temperature, ...low },
    { responseMimeType: 'application/json', responseJsonSchema: schema, temperature },
    { responseMimeType: 'application/json', temperature },
  ];

  let lastError = '';
  for (const generationConfig of configs) {
    const res = await fetchWithTimeout(
      `${GEMINI}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig }),
      },
      60_000,
    );
    const body = await res.json().catch(() => ({}));
    if (res.status === 400) {
      lastError = JSON.stringify(body).slice(0, 300);
      continue; // try the next request format
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    const text = extractText(body)
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');
    return JSON.parse(text);
  }
  throw new Error(`Gemini rejected the request: ${lastError}`);
}

/* ---------- Handler ---------- */

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json(500, { error: 'GEMINI_API_KEY secret is not set' });

  let raw: (RequestBody & { task?: string }) | RecipeBody;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Speed test: a tiny prompt to a few models (in parallel), to see which answer quickly.
  if (raw.task === 'probe') {
    const models = (raw as { models?: string[] }).models?.slice(0, 5) ?? [await pickModel(key)];
    const results = await Promise.all(
      models.map(async (model) => {
        const started = Date.now();
        try {
          const res = await fetchWithTimeout(
            `${GEMINI}/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Reply with the single word OK.' }] }],
                generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
              }),
            },
            45_000,
          );
          const body = await res.json().catch(() => ({}));
          return { model, status: res.status, ms: Date.now() - started, reply: extractText(body).slice(0, 40) || JSON.stringify(body).slice(0, 160) };
        } catch (e) {
          return { model, status: 0, ms: Date.now() - started, reply: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    return json(200, { results });
  }

  // Setup check: which model is used and whether Google answers. Sends no prompt.
  if (raw.task === 'health') {
    const started = Date.now();
    try {
      const res = await fetchWithTimeout(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } }, 10_000);
      const body = (await res.json().catch(() => ({}))) as { models?: { name: string }[]; error?: { message?: string } };
      return json(200, {
        googleStatus: res.status,
        googleError: body.error?.message ?? null,
        models: (body.models ?? []).map((m) => m.name.replace(/^models\//, '')).filter((n) => n.includes('flash')),
        picked: res.ok ? await pickModel(key) : null,
        ms: Date.now() - started,
      });
    } catch (e) {
      return json(502, { error: e instanceof Error ? e.message : String(e), ms: Date.now() - started });
    }
  }

  if (raw.task === 'recipe') {
    const r = raw as RecipeBody;
    const ingredients = Array.isArray(r.meal?.ingredients) ? r.meal.ingredients.slice(0, 12) : [];
    if (ingredients.length === 0 || typeof r.meal?.name !== 'string') return json(400, { error: 'Missing meal' });
    try {
      const model = await pickModel(key);
      const prompt = recipePrompt({ ...r, meal: { name: r.meal.name.slice(0, 80), ingredients } });
      // A little creativity so "write a different version" gives a different recipe.
      const recipe = await callGemini(key, model, [{ text: prompt }], RECIPE_SCHEMA, 0.7);
      return json(200, { model, ...recipe });
    } catch (e) {
      return json(502, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  const body = raw as RequestBody;
  if (typeof body.image !== 'string' || body.image.length < 100) return json(400, { error: 'Missing image' });
  if (body.image.length > MAX_IMAGE_BYTES) return json(413, { error: 'Image too large' });
  if (!Array.isArray(body.foods) || body.foods.length === 0 || body.foods.length > 300) {
    return json(400, { error: 'Missing food list' });
  }
  if (!Array.isArray(body.chains)) body.chains = [];

  try {
    const model = await pickModel(key);
    const parts = [
      { inline_data: { mime_type: body.mimeType ?? 'image/jpeg', data: body.image } },
      { text: buildPrompt(body.foods) },
    ];
    const schema = buildSchema(
      body.foods.map((f) => f.id),
      body.chains,
    );
    const result = await callGemini(key, model, parts, schema);
    return json(200, { model, ...result });
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : String(e) });
  }
});
