import fs from 'node:fs';
import { KEY, GROQ_CHAT_MODEL, GROQ_STT_MODEL } from './config.js';

const LANG_KEYS = ['da', 'ps', 'en'];
const PLATFORM_KEYS = ['instagram', 'x', 'facebook', 'telegram'];
const X_LIMIT = 280;

const SYSTEM = `You are a senior newsroom editor and social media producer for an Afghan media outlet.
You listen directly to the audio of a news video or report (it may be in Dari, Pashto, English or mixed) and produce publish-ready content.
Return ONLY valid JSON with this exact shape:
{
 "topic": "short topic",
 "category": "politics|economy|sports|tech|society|culture|world|other",
 "headlines": {"da":["","",""],"ps":["","",""],"en":["","",""]},
 "captions": {
   "da":{"instagram":"","x":"","facebook":"","telegram":""},
   "ps":{"instagram":"","x":"","facebook":"","telegram":""},
   "en":{"instagram":"","x":"","facebook":"","telegram":""}
 },
 "hashtags": {"da":[],"ps":[],"en":[]},
 "best_segment": {"start":"MM:SS","end":"MM:SS","reason":"one short sentence in Dari"}
}
Language rules:
- "da" = Dari as written and spoken in Afghanistan (Kabul standard). Use Afghan vocabulary and spelling, NOT Iranian Persian idioms.
- "ps" = standard Pashto in Pashto script (use ټ ډ ړ ښ ږ ګ ڼ ې ۍ correctly).
- "en" = clear, natural news English.
Content rules:
- Stay strictly faithful to what is said in the audio. Never invent names, numbers, places or quotes. If you are unsure of a name, leave it out.
- Headlines: 3 distinct, punchy options per language, under 90 characters, no clickbait.
- Captions are written natively for each language (not literal translations). "x" captions must be under 260 characters. Instagram captions may use line breaks and a few emojis. Do not put hashtags inside captions.
- Hashtags: 5-8 per language, without the # sign.
- best_segment: the single most newsworthy, self-contained 20-60 second span, starting and ending at natural sentence boundaries. Use MM:SS timestamps measured from the start of the audio.`;

/* ---------- پاک‌سازی و اعتبارسنجی خروجی AI ---------- */
export const toSeconds = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const parts = String(v ?? '').trim().split(':').map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
};

export function clampSegment(seg, duration) {
  let s = Math.max(0, toSeconds(seg?.start));
  let e = Math.min(duration, toSeconds(seg?.end) || s + 30);
  // بازهٔ نامعتبر (خیلی کوتاه یا شروع نزدیک پایان ویدیو) → از ابتدا حداکثر ۴۵ ثانیه
  if (s >= duration - 5 || e - s < 5) { s = 0; e = Math.min(duration, 45); }
  if (e - s > 90) e = s + 90;
  return { reason: String(seg?.reason || ''), start: +s.toFixed(2), end: +e.toFixed(2) };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v, max) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : []);
const cleanTag = (t) => str(t).replace(/^#+/, '').replace(/\s+/g, '_');

export function normalizeAnalysis(raw, duration) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = { topic: str(r.topic), category: str(r.category) || 'other', headlines: {}, captions: {}, hashtags: {} };
  for (const l of LANG_KEYS) {
    out.headlines[l] = strList(r.headlines?.[l], 3);
    out.hashtags[l] = [...new Set((Array.isArray(r.hashtags?.[l]) ? r.hashtags[l] : []).map(cleanTag).filter(Boolean))].slice(0, 8);
    out.captions[l] = {};
    for (const p of PLATFORM_KEYS) {
      let text = str(r.captions?.[l]?.[p]);
      if (p === 'x' && text.length > X_LIMIT - 20) text = text.slice(0, X_LIMIT - 21).trimEnd() + '…';
      out.captions[l][p] = text;
    }
  }
  out.best_segment = clampSegment(r.best_segment, duration);
  return out;
}

export function parseModelJson(text) {
  const cleaned = String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/); // گاهی مدل قبل/بعد از JSON متن اضافه می‌نویسد
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* به خطای زیر می‌رسد */ }
    }
    throw new Error('The AI response could not be parsed. Please try again.');
  }
}

/* ---------- Groq: transcribe audio, then generate newsroom content ---------- */
class ApiError extends Error {
  constructor(message, retryable) { super(message); this.retryable = retryable; }
}
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function groqRequest(url, options) {
  const delay = Number(process.env.AI_RETRY_DELAY_MS ?? 2000);
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { ...options, headers: { Authorization: `Bearer ${KEY}`, ...(options.headers || {}) }, signal: AbortSignal.timeout(240_000) });
      if (r.ok) return await r.json();
      const detail = (await r.text()).slice(0, 300);
      throw new ApiError(`خطای Groq [${r.status}]${r.status === 401 ? ' (کلید GROQ_API_KEY را بررسی کنید.)' : r.status === 429 ? ' (سهمیه یا محدودیت درخواست Groq؛ کمی بعد دوباره تلاش کنید.)' : ''} ${detail}`, RETRY_STATUS.has(r.status));
    } catch (e) {
      const retryable = e instanceof ApiError ? e.retryable : true;
      last = e instanceof ApiError ? e : new Error('ارتباط با سرویس Groq برقرار نشد. اتصال اینترنت و دسترسی سرور را بررسی کنید.');
      if (!retryable || attempt === 3) break;
      await sleep(delay * attempt);
    }
  }
  throw last;
}

async function transcribeWithGroq(audioPath) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' }), 'audio.mp3');
  form.append('model', GROQ_STT_MODEL);
  form.append('response_format', 'json');
  return groqRequest('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', body: form });
}

async function generateWithGroq(transcript, duration) {
  const out = await groqRequest('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM + '\n\nThe user provides a transcript, not audio. Use only information in that transcript. Estimate the best segment timestamps from transcript context; do not invent details. Return valid JSON only.' },
        { role: 'user', content: `Audio duration: ${Math.round(duration)} seconds. Transcript:\n${transcript}\n\nProduce the requested JSON now.` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });
  return out.choices?.[0]?.message?.content || '';
}

export async function analyzeAudio(audioPath, duration) {
  if (!KEY) throw new Error('GROQ_API_KEY is not configured in the .env file.');
  const transcription = await transcribeWithGroq(audioPath);
  const transcript = String(transcription.text || '').trim();
  if (!transcript) throw new Error('Groq نتوانست صدای قابل‌تشخیص پیدا کند. کیفیت صدا را بررسی کنید.');
  const text = await generateWithGroq(transcript, duration);
  if (!text) throw new Error('Groq پاسخ متنی برنگرداند. لطفاً دوباره تلاش کنید.');
  return normalizeAnalysis(parseModelJson(text), duration);
}
